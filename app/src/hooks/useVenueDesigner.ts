/**
 * 场馆座位绘制功能 - 主业务逻辑 Hook
 *
 * 这是应用的核心业务逻辑层，负责管理：
 * - 场馆地图数据（区域、座位等）
 * - 编辑器状态（当前模式、选中项等）
 * - 所有操作（绘制、编辑、删除等）
 * - 撤销/重做功能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useUndoRedo } from './useUndoRedo';
import type {
  VenueMap,
  Section,
  Seat,
  Point,
  EditorState,
  EditorMode,
  SeatTool,
  CanvasTool,
  DrawConfig,
  ViewConfig,
  AlignType
} from '@/types';

/**
 * 生成唯一的 UUID 标识符
 * 使用浏览器原生的 crypto.randomUUID() API
 * @returns {string} 生成的 UUID 字符串
 */
const generateId = () => crypto.randomUUID();

/**
 * 使用射线投射算法检查点是否在多边形内
 * 该算法从点向任一方向发出射线，统计与多边形边界的交点数
 * 如果交点数为奇数，则点在多边形内；偶数则在外
 *
 * @param {Point} point - 待检查的点
 * @param {Point[]} polygon - 多边形顶点数组
 * @returns {boolean} 点是否在多边形内
 */
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  // 遍历多边形的每条边
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    // 检查射线是否与该边相交
    // 1. 检查点是否在边的 Y 范围内 (yi > point.y) !== (yj > point.y)
    // 2. 计算交点的 X 坐标，并与点的 X 坐标比较
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    // 如果相交，交点计数加 1
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 计算点到线段的距离
 * 使用投影点算法找到线段上最接近的点，然后计算距离
 *
 * @param {Point} point - 参考点
 * @param {Point} lineStart - 线段起点
 * @param {Point} lineEnd - 线段终点
 * @returns {number} 点到线段的最短距离
 */
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len2 = dx * dx + dy * dy;

  // 如果线段长度为 0（两点重合），直接返回点到起点的距离
  if (len2 === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);

  // 计算参数 t，表示投影点在线段上的相对位置
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / len2;
  // 将 t 限制在 [0, 1] 范围内，确保投影点在线段上
  t = Math.max(0, Math.min(1, t));

  // 计算投影点的坐标
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  // 返回点到投影点的距离
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

/**
 * 将数值吸附到网格
 * 将一个数值舍入到最近的网格点上
 * 例如，网格大小为 20，数值 47 会被吸附到 40 或 60
 *
 * @param {number} value - 原始数值
 * @param {number} gridSize - 网格大小
 * @returns {number} 吸附后的数值
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * 默认绘制配置
 * 控制座位和区域在画布上的默认外观和行为
 * 用户可以在配置对话框中修改这些值
 */
const defaultDrawConfig: DrawConfig = {
  seatRadius: 8,              // 座位圆形半径：8 像素
  seatSpacing: 20,            // 座位间距：20 像素（行工具和线工具使用）
  rowSpacing: 25,             // 行间距：25 像素
  defaultColor: '#3b82f6',    // 新区域的默认颜色：蓝色
  sectionOpacity: 0.8,        // 区域多边形的透明度：80%
};

/**
 * 默认视图配置
 * 控制画布的显示选项和网格设置
 * 用户可以在工具栏中动态改变这些值
 */
const defaultViewConfig: ViewConfig = {
  showGrid: true,             // 默认显示网格线
  gridSize: 20,               // 网格间距：20 像素
  gridColor: '#e2e8f0',       // 网格线颜色：浅灰色
  backgroundColor: '#f8fafc', // 画布背景颜色：非常浅的蓝灰色
  snapToGrid: false,          // 默认不启用吸附到网格功能
};

/**
 * 默认编辑器状态
 * 应用启动时的初始编辑状态
 */
const defaultEditorState: EditorState = {
  mode: 'view',               // 初始模式：查看模式（用户可以查看场馆和区域）
  selectedSectionId: null,    // 没有选中的区域
  selectedSeatIds: [],        // 没有选中的座位
  seatTool: 'select',         // 默认座位工具：选择工具
  canvasTool: 'auto',         // 默认画布工具：自动模式（可以按 Space 平移）
  zoom: 1,                    // 默认缩放比例：100%
  pan: { x: 0, y: 0 },        // 默认平移：原点 (0, 0)
  isDrawing: false,           // 初始不在绘制状态
  drawingPoints: [],          // 绘制点数组为空
  tempLine: null,             // 没有临时线数据
};

/**
 * 初始场馆地图
 * 应用创建时的初始场馆数据
 * 每个用户会获得一个唯一的场馆实例
 */
const initialVenueMap: VenueMap = {
  id: generateId(),           // 生成唯一的场馆 ID (UUID)
  name: 'New Venue',          // 默认场馆名称
  svgUrl: null,               // 尚未上传底图 SVG
  svgContent: null,           // 尚未上传底图内容
  sections: [],               // 初始没有区域
  seatGroups: [],             // 初始没有座位组
  width: 800,                 // 画布默认宽度：800 像素
  height: 600,                // 画布默认高度：600 像素
};

/**
 * ================== useVenueDesigner Hook 定义 ==================
 *
 * 这是应用的核心业务逻辑 Hook
 * 管理场馆数据、编辑器状态和所有操作函数
 *
 * 核心功能：
 * - 场馆数据管理：CRUD 操作区域、座位、座位组
 * - 编辑状态管理：当前模式、选中项、工具选择等
 * - 撤销/重做：完整的历史记录管理
 * - 配置管理：绘制设置、视图设置
 * - 数据导入导出：保存和加载场馆配置
 *
 * 返回值包含超过 50 个函数和状态变量
 *
 * @returns {Object} Hook 返回的所有状态和函数
 */
export function useVenueDesigner() {
  /**
   * ========== 场馆数据管理 ==========
   * 使用 useUndoRedo Hook 管理场馆地图，
   * 所有对 venueMap 的修改都会自动记录到历史中
   */
  const {
    state: venueMap,            // 当前场馆地图状态
    setState: setVenueMap,      // 更新场馆地图的函数
    undo,                       // 撤销函数
    redo,                       // 重做函数
    canUndo,                    // 是否可以撤销
    canRedo                     // 是否可以重做
  } = useUndoRedo(initialVenueMap);

  /**
   * ========== 编辑器状态 ==========
   * 这些状态不支持撤销/重做，仅用于管理编辑器的 UI 状态
   */
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);
  // 绘制配置（用户可调整）
  const [drawConfig, setDrawConfig] = useState<DrawConfig>(defaultDrawConfig);
  // 视图配置（用户可调整）
  const [viewConfig, setViewConfig] = useState<ViewConfig>(defaultViewConfig);
  // SVG 文件输入元素引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * ========== 配置 Refs ==========
   * 这些 refs 用于在回调函数中获取最新的配置值
   * 避免闭包问题，确保总是使用最新的配置
   */
  const drawConfigRef = useRef(drawConfig);      // 绘制配置 ref
  const viewConfigRef = useRef(viewConfig);      // 视图配置 ref

  /**
   * 同步 drawConfigRef 到最新值
   * 每当 drawConfig 变化时，更新 ref 以保证回调函数中的值是最新的
   */
  useEffect(() => {
    drawConfigRef.current = drawConfig;
  }, [drawConfig]);

  /**
   * 同步 viewConfigRef 到最新值
   */
  useEffect(() => {
    viewConfigRef.current = viewConfig;
  }, [viewConfig]);

  /**
   * ========== SVG 文件上传处理 ==========
   */

  /**
   * 处理 SVG 文件上传
   * 1. 读取 SVG 文件内容
   * 2. 解析 SVG 以获取尺寸
   * 3. 创建 Blob URL 用于显示
   * 4. 更新场馆地图数据
   *
   * @param {File} file - 用户选择的 SVG 文件
   */
  const handleSvgUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // 获取 SVG 文件的文本内容
      const content = e.target?.result as string;
      // 创建 Blob 对象，用于生成对象 URL
      const blob = new Blob([content], { type: 'image/svg+xml' });
      // 生成 URL，可直接在 <img> 或 <image> 标签中使用
      const url = URL.createObjectURL(blob);

      // 解析 SVG 获取其宽度和高度
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      // 从 SVG 的 width/height 属性读取，如果没有则使用默认值
      const width = parseInt(svg?.getAttribute('width') || '800');
      const height = parseInt(svg?.getAttribute('height') || '600');

      // 更新场馆地图，记录 SVG URL、内容和尺寸
      setVenueMap(prev => ({
        ...prev,
        svgUrl: url,
        svgContent: content,
        width,
        height,
      }));
    };
    // 以文本形式读取 SVG 文件
    reader.readAsText(file);
  }, [setVenueMap]);

  /**
   * 触发文件选择对话框
   * 通过编程方式点击隐藏的 input[type=file] 元素
   */
  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * ========== 编辑模式管理 ==========
   * 这些函数管理编辑器的当前模式和工具选择
   */

  /**
   * 设置编辑模式
   * 改变编辑模式时，清除任何进行中的绘制操作
   *
   * @param {EditorMode} mode - 新的编辑模式（'view'、'draw-section'、'draw-seat' 等）
   */
  const setMode = useCallback((mode: EditorMode) => {
    setEditorState(prev => ({
      ...prev,
      mode,
      isDrawing: false,       // 清除绘制状态
      drawingPoints: [],      // 清除绘制点
      tempLine: null,         // 清除临时线
    }));
  }, []);

  /**
   * 设置座位工具
   * 改变座位工具时，也清除进行中的操作
   *
   * @param {SeatTool} tool - 新的座位工具（'select'、'single'、'row'、'line'）
   */
  const setSeatTool = useCallback((tool: SeatTool) => {
    setEditorState(prev => ({
      ...prev,
      seatTool: tool,
      isDrawing: false,       // 清除绘制状态
      drawingPoints: [],      // 清除绘制点
      tempLine: null,         // 清除临时线
    }));
  }, []);

  /**
   * 设置画布工具
   * 改变画布工具不需要清除其他状态
   *
   * @param {CanvasTool} tool - 新的画布工具（'auto'、'pan'、'select'）
   */
  const setCanvasTool = useCallback((tool: CanvasTool) => {
    setEditorState(prev => ({
      ...prev,
      canvasTool: tool,
    }));
  }, []);

  /**
   * ========== 区域管理操作 ==========
   * 负责区域的创建、编辑、删除等操作
   */

  /**
   * 开始绘制区域
   * 进入绘制模式，准备接收用户点击以添加多边形顶点
   */
  const startSectionDrawing = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      mode: 'draw-section',   // 切换到绘制区域模式
      isDrawing: true,        // 标记正在绘制
      drawingPoints: [],      // 重置绘制点数组
    }));
  }, []);

  /**
   * 添加区域的一个顶点
   * 用户每次点击画布时调用此函数来添加一个多边形顶点
   * 如果启用了网格吸附，会自动将点吸附到最近的网格点
   *
   * @param {Point} point - 新顶点的坐标
   */
  const addSectionPoint = useCallback((point: Point) => {
    // 从 ref 中获取最新的视图配置
    // （不能从闭包中获取，因为这个函数可能在配置变化后被调用）
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    // 如果启用了网格吸附，则将点吸附到网格
    const finalPoint = snapEnabled
      ? { x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) }
      : point;

    // 将顶点添加到绘制点数组
    setEditorState(prev => ({
      ...prev,
      drawingPoints: [...prev.drawingPoints, finalPoint],
    }));
  }, []);

  /**
   * 完成区域的绘制
   * 将绘制的多边形顶点转换为正式的区域对象，并添加到场馆地图中
   * 需要至少 3 个顶点才能形成有效的多边形
   *
   * @param {string} name - 区域的名称（由用户输入）
   */
  const completeSectionDrawing = useCallback((name: string) => {
    // 验证至少有 3 个顶点
    if (editorState.drawingPoints.length < 3) return;

    // 创建新的区域对象
    const newSection: Section = {
      id: generateId(),
      name,
      points: editorState.drawingPoints,
      color: drawConfig.defaultColor,  // 使用默认颜色
      seats: [],                       // 初始没有座位
      opacity: drawConfig.sectionOpacity,
    };

    // 添加区域到场馆地图
    setVenueMap(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    // 返回到查看模式，清除绘制状态
    setEditorState(prev => ({
      ...prev,
      mode: 'view',
      isDrawing: false,
      drawingPoints: [],
    }));
  }, [editorState.drawingPoints, drawConfig, setVenueMap]);

  /**
   * 取消绘制操作
   * 清除所有绘制数据并返回到之前的模式
   */
  const cancelDrawing = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      isDrawing: false,
      drawingPoints: [],
      tempLine: null,
    }));
  }, []);

  /**
   * TODO：进入区域编辑模式
   * 选中指定的区域，并且需要优化交互，使得用户调整对应的缩放以使得区域放大到合适的大小，调整座位尺寸，并切换到座位编辑模式
   *
   * @param {string} sectionId - 要编辑的区域 ID
   */
  const enterSection = useCallback((sectionId: string) => {
    setEditorState(prev => ({
      ...prev,
      mode: 'draw-seat',       // 切换到座位编辑模式
      selectedSectionId: sectionId,
      seatTool: 'select',      // 默认使用选择工具
    }));
  }, []);

  /**
   * 退出区域编辑模式
   * 返回到查看模式并清空所有选中项
   */
  const exitSection = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      mode: 'view',
      selectedSectionId: null,
      selectedSeatIds: [],
    }));
  }, []);

  /**
   * 删除区域
   * 从场馆地图中移除指定的区域及其所有座位
   * 如果当前正在编辑该区域，自动退出编辑模式
   *
   * @param {string} sectionId - 要删除的区域 ID
   */
  const deleteSection = useCallback((sectionId: string) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    }));
    // 如果删除的是当前编辑的区域，则退出编辑模式
    if (editorState.selectedSectionId === sectionId) {
      exitSection();
    }
  }, [editorState.selectedSectionId, exitSection, setVenueMap]);

  /**
   * 更新区域属性
   * 修改指定区域的某些属性（如名称、颜色等）
   *
   * @param {string} sectionId - 要更新的区域 ID
   * @param {Partial<Section>} updates - 要更新的属性对象
   */
  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  }, [setVenueMap]);

  /**
   * ========== 座位操作 ==========
   * 负责座位的创建、编辑、移动、选择等所有操作
   */

  /**
   * 添加单个座位
   * 在指定区域内的指定坐标添加一个座位
   * 自动验证坐标是否在区域内部，确保数据一致性
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {Point} point - 座位的坐标
   * @param {string} row - 座位的行号（如 'A', 'B', 'C' 等）
   * @param {number} number - 座位号（行内的编号）
   * @returns {string | null} 返回新座位的 ID，如果失败则返回 null
   */
  const addSeat = useCallback((sectionId: string, point: Point, row: string, number: number) => {
    // 查找目标区域
    const section = venueMap.sections.find(s => s.id === sectionId);
    // 验证区域存在且座标在区域内部
    if (!section || !isPointInPolygon(point, section.points)) {
      return null;
    }

    // 获取最新的配置值（从 ref 而不是闭包）
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    // 如果启用了网格吸附，则吸附座位到网格
    const finalPoint = snapEnabled
      ? { x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) }
      : point;

    // 创建新座位对象
    const newSeat: Seat = {
      id: generateId(),
      x: finalPoint.x,
      y: finalPoint.y,
      row,
      number,
      status: 'available',  // 初始状态为可用
      sectionId,
    };

    // 添加座位到区域
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, seats: [...s.seats, newSeat] }
          : s
      ),
    }));

    return newSeat.id;
  }, [venueMap.sections, setVenueMap]);

  /**
   * 在一行中添加多个座位
   * 从起点到终点创建一行均匀分布的座位
   * 根据配置的座位间距自动计算座位数量
   * 只在区域内创建座位，超出区域边界的座位会被过滤
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {Point} startPoint - 行的起点坐标
   * @param {Point} endPoint - 行的终点坐标
   * @param {string} row - 座位的行号
   * @param {number} startNumber - 起始座位号
   * @returns {string[]} 返回创建的所有座位的 ID 数组
   */
  const addSeatsInRow = useCallback((sectionId: string, startPoint: Point, endPoint: Point, row: string, startNumber: number) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    // 获取最新的配置值
    const currentSpacing = drawConfigRef.current.seatSpacing;
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    // 计算从起点到终点的距离
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // 根据间距计算座位数量
    const seatCount = Math.floor(distance / currentSpacing) + 1;

    const newSeats: Seat[] = [];
    let seatNumber = startNumber;

    // 沿着直线创建座位
    for (let i = 0; i < seatCount; i++) {
      // 计算参数 t，范围 [0, 1]，表示在线段上的相对位置
      const t = i / Math.max(seatCount - 1, 1);
      let x = startPoint.x + dx * t;
      let y = startPoint.y + dy * t;

      // 如果启用了网格吸附，则吸附座位到网格
      if (snapEnabled) {
        x = snapToGrid(x, gridSize);
        y = snapToGrid(y, gridSize);
      }

      const point = { x, y };

      // 验证座位是否在区域内，只有在区域内的座位才会被创建
      if (isPointInPolygon(point, section.points)) {
        newSeats.push({
          id: generateId(),
          x,
          y,
          row,
          number: seatNumber++,
          status: 'available',
          sectionId,
        });
      }
    }

    // 添加新座位到区域
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, seats: [...s.seats, ...newSeats] }
          : s
      ),
    }));

    return newSeats.map(s => s.id);
  }, [venueMap.sections, setVenueMap]);

  /**
   * 沿着多条线创建座位
   * 用户通过点击多个点来定义路径，座位沿着这条路径创建
   * 这个工具适合创建曲线或不规则的座位排列
   * 每条线段会创建新的一行
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {Point[]} points - 路径上的各个点
   * @param {string} rowPrefix - 行号的前缀（如 'A'，会生成 'A1'、'A2' 等）
   * @param {number} startNumber - 起始座位号
   * @returns {string[]} 返回创建的所有座位的 ID 数组
   */
  const addSeatsAlongLine = useCallback((sectionId: string, points: Point[], rowPrefix: string, startNumber: number) => {
    if (points.length < 2) return [];

    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    // 获取最新的配置值
    const currentSpacing = drawConfigRef.current.seatSpacing;
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    const newSeats: Seat[] = [];
    let currentNumber = startNumber;
    let rowIndex = 0;

    // 遍历路径的每一条线段
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const seatCount = Math.floor(distance / currentSpacing) + 1;

      // 沿着线段创建座位
      for (let j = 0; j < seatCount; j++) {
        const t = j / Math.max(seatCount - 1, 1);
        let x = start.x + dx * t;
        let y = start.y + dy * t;

        // 如果启用了网格吸附，则吸附座位到网格
        if (snapEnabled) {
          x = snapToGrid(x, gridSize);
          y = snapToGrid(y, gridSize);
        }

        const point = { x, y };

        // 验证座位是否在区域内
        if (isPointInPolygon(point, section.points)) {
          newSeats.push({
            id: generateId(),
            x,
            y,
            // 每条线段对应一行，行号为 rowPrefix + (rowIndex + 1)
            row: `${rowPrefix}${rowIndex + 1}`,
            number: currentNumber++,
            status: 'available',
            sectionId,
          });
        }
      }
      rowIndex++;
    }

    // 添加新座位到区域
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, seats: [...s.seats, ...newSeats] }
          : s
      ),
    }));

    return newSeats.map(s => s.id);
  }, [venueMap.sections, setVenueMap]);

  /**
   * 删除座位
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {string} seatId - 要删除的座位 ID
   */
  const deleteSeat = useCallback((sectionId: string, seatId: string) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, seats: s.seats.filter(seat => seat.id !== seatId) }
          : s
      ),
    }));
  }, [setVenueMap]);

  /**
   * 更新座位属性
   * 可以修改座位的任何属性（状态、颜色等）
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {string} seatId - 要更新的座位 ID
   * @param {Partial<Seat>} updates - 要更新的属性对象
   */
  const updateSeat = useCallback((sectionId: string, seatId: string, updates: Partial<Seat>) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              seats: s.seats.map(seat =>
                seat.id === seatId ? { ...seat, ...updates } : seat
              )
            }
          : s
      ),
    }));
  }, [setVenueMap]);

  /**
   * 移动座位（拖拽功能）
   * 将选中的座位们移动指定的距离
   * 只移动仍然在区域内的座位（越界的座位不会被移动）
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {string[]} seatIds - 要移动的座位 ID 数组
   * @param {Point} delta - 移动的增量 (dx, dy)
   */
  const moveSeats = useCallback((sectionId: string, seatIds: string[], delta: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;

    // 获取最新的配置值
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              seats: s.seats.map(seat => {
                if (!seatIds.includes(seat.id)) return seat;
                let newX = seat.x + delta.x;
                let newY = seat.y + delta.y;

                // 如果启用了网格吸附，则吸附座位到网格
                if (snapEnabled) {
                  newX = snapToGrid(newX, gridSize);
                  newY = snapToGrid(newY, gridSize);
                }

                // 验证新位置仍在区域内，只有在区域内才移动
                if (isPointInPolygon({ x: newX, y: newY }, section.points)) {
                  return { ...seat, x: newX, y: newY };
                }
                return seat;
              })
            }
          : s
      ),
    }));
  }, [venueMap.sections, setVenueMap]);

  /**
   * 使用箭头键轻微调整座位位置
   * 用户可以通过按箭头键来微调座位的位置
   * 如果启用了网格吸附，步长为网格大小；否则为 1 像素
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {string[]} seatIds - 要调整的座位 ID 数组
   * @param {string} direction - 方向：'up'、'down'、'left'、'right'
   */
  const nudgeSeats = useCallback((sectionId: string, seatIds: string[], direction: 'up' | 'down' | 'left' | 'right') => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section || seatIds.length === 0) return;

    // 根据是否启用网格吸附来确定步长
    // 如果启用了吸附，使用网格大小；否则使用 1 像素
    const step = viewConfigRef.current.snapToGrid ? viewConfigRef.current.gridSize : 1;

    // 计算移动增量
    const delta = {
      up: { x: 0, y: -step },     // 向上移动
      down: { x: 0, y: step },    // 向下移动
      left: { x: -step, y: 0 },   // 向左移动
      right: { x: step, y: 0 },   // 向右移动
    }[direction];

    // 调用 moveSeats 执行实际的移动
    moveSeats(sectionId, seatIds, delta);
  }, [venueMap.sections, moveSeats]);

  /**
   * 对齐选中的座位
   * 支持多种对齐方式：边界对齐、中心对齐、均匀分布等
   *
   * @param {string} sectionId - 座位所属的区域 ID
   * @param {string[]} seatIds - 要对齐的座位 ID 数组
   * @param {AlignType} alignType - 对齐方式类型
   */
  const alignSeats = useCallback((sectionId: string, seatIds: string[], alignType: AlignType) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section || seatIds.length === 0) return;

    const selectedSeats = section.seats.filter(s => seatIds.includes(s.id));
    if (selectedSeats.length === 0) return;

    // 获取最新的配置值
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    let updates: { id: string; x?: number; y?: number }[] = [];

    // 根据对齐方式计算新的座位位置
    switch (alignType) {
      case 'left': {
        // 左对齐：所有座位与最左边座位的 X 坐标对齐
        const minX = Math.min(...selectedSeats.map(s => s.x));
        updates = selectedSeats.map(s => ({ id: s.id, x: snapEnabled ? snapToGrid(minX, gridSize) : minX }));
        break;
      }
      case 'center': {
        // 居中对齐：所有座位在中心线上对齐
        const minX = Math.min(...selectedSeats.map(s => s.x));
        const maxX = Math.max(...selectedSeats.map(s => s.x));
        const centerX = (minX + maxX) / 2;
        updates = selectedSeats.map(s => ({ id: s.id, x: snapEnabled ? snapToGrid(centerX, gridSize) : centerX }));
        break;
      }
      case 'right': {
        // 右对齐：所有座位与最右边座位的 X 坐标对齐
        const maxX = Math.max(...selectedSeats.map(s => s.x));
        updates = selectedSeats.map(s => ({ id: s.id, x: snapEnabled ? snapToGrid(maxX, gridSize) : maxX }));
        break;
      }
      case 'top': {
        // 上对齐：所有座位与最上面座位的 Y 坐标对齐
        const minY = Math.min(...selectedSeats.map(s => s.y));
        updates = selectedSeats.map(s => ({ id: s.id, y: snapEnabled ? snapToGrid(minY, gridSize) : minY }));
        break;
      }
      case 'middle': {
        // 中间对齐：所有座位在中心线上对齐
        const minY = Math.min(...selectedSeats.map(s => s.y));
        const maxY = Math.max(...selectedSeats.map(s => s.y));
        const centerY = (minY + maxY) / 2;
        updates = selectedSeats.map(s => ({ id: s.id, y: snapEnabled ? snapToGrid(centerY, gridSize) : centerY }));
        break;
      }
      case 'bottom': {
        // 下对齐：所有座位与最下面座位的 Y 坐标对齐
        const maxY = Math.max(...selectedSeats.map(s => s.y));
        updates = selectedSeats.map(s => ({ id: s.id, y: snapEnabled ? snapToGrid(maxY, gridSize) : maxY }));
        break;
      }
      case 'distribute-h': {
        // 水平均匀分布：座位在水平方向均匀分布
        const sorted = [...selectedSeats].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x;
        const step = (maxX - minX) / (sorted.length - 1);
        updates = sorted.map((s, i) => ({
          id: s.id,
          x: snapEnabled ? snapToGrid(minX + step * i, gridSize) : minX + step * i
        }));
        break;
      }
      case 'distribute-v': {
        // 竖直均匀分布：座位在竖直方向均匀分布
        const sorted = [...selectedSeats].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y;
        const step = (maxY - minY) / (sorted.length - 1);
        updates = sorted.map((s, i) => ({
          id: s.id,
          y: snapEnabled ? snapToGrid(minY + step * i, gridSize) : minY + step * i
        }));
        break;
      }
    }

    // 应用所有更新
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              seats: s.seats.map(seat => {
                const update = updates.find(u => u.id === seat.id);
                if (update) {
                  const newX = update.x ?? seat.x;
                  const newY = update.y ?? seat.y;
                  // 验证新位置仍在区域内
                  if (isPointInPolygon({ x: newX, y: newY }, section.points)) {
                    return { ...seat, x: newX, y: newY };
                  }
                }
                return seat;
              })
            }
          : s
      ),
    }));
  }, [venueMap.sections, setVenueMap]);

  /**
   * ========== 座位选择操作 ==========
   */

  /**
   * 在矩形区域内选择座位
   * 用于框选操作，找到所有在指定矩形内的座位
   *
   * @param {string} sectionId - 区域 ID
   * @param {Point} startPoint - 框选的起点
   * @param {Point} endPoint - 框选的终点
   * @returns {string[]} 返回选中的座位 ID 数组
   */
  const selectSeatsInArea = useCallback((sectionId: string, startPoint: Point, endPoint: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    // 计算框选矩形的边界
    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);

    // 找到所有在矩形内的座位
    const selectedIds = section.seats
      .filter(seat => seat.x >= minX && seat.x <= maxX && seat.y >= minY && seat.y <= maxY)
      .map(seat => seat.id);

    // 更新编辑器状态中的选中座位
    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: selectedIds,
    }));

    return selectedIds;
  }, [venueMap.sections]);

  /**
   * 选择靠近一条线的座位
   * 用于选择大约在同一行或同一列的座位
   * 使用点到线的距离公式计算
   *
   * @param {string} sectionId - 区域 ID
   * @param {Point} lineStart - 线的起点
   * @param {Point} lineEnd - 线的终点
   * @param {number} maxDistance - 最大距离阈值（像素），默认 15px
   * @returns {string[]} 返回选中的座位 ID 数组
   */
  const selectSeatsAlongLine = useCallback((sectionId: string, lineStart: Point, lineEnd: Point, maxDistance: number = 15) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    // 找到所有距离线足够近的座位
    const selectedIds = section.seats
      .filter(seat => pointToLineDistance({ x: seat.x, y: seat.y }, lineStart, lineEnd) <= maxDistance)
      .map(seat => seat.id);

    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: selectedIds,
    }));

    return selectedIds;
  }, [venueMap.sections]);

  /**
   * 选择指定的座位
   * 直接设置选中的座位集合
   *
   * @param {string[]} seatIds - 要选择的座位 ID 数组
   */
  const selectSeats = useCallback((seatIds: string[]) => {
    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: seatIds,
    }));
  }, []);

  /**
   * 清除座位选择
   * 取消所有已选中的座位
   */
  const clearSeatSelection = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: [],
    }));
  }, []);

  /**
   * ========== 缩放和平移操作 ==========
   */

  /**
   * 设置缩放级别
   * 支持以指定点为中心进行缩放
   * 缩放时会调整平移位置，使得中心点在屏幕上的位置保持不变
   *
   * 数学原理：
   * - 旧缩放比例 z0，新缩放比例 z1
   * - 缩放中心点 (cx, cy)
   * - 旧平移 (pan.x, pan.y)
   * - 新平移计算公式：
   *   panNewX = cx - ((cx - pan.x) * z0) / z1
   *   panNewY = cy - ((cy - pan.y) * z0) / z1
   *
   * @param {number} newZoom - 新的缩放比例（1.0 为 100%）
   * @param {Point} center - 缩放中心点（可选，默认为场馆中心）
   */
  const setZoom = useCallback((newZoom: number, center?: Point) => {
    setEditorState(prev => {
      // 限制缩放范围在 1 到 10 之间
      const z1 = Math.max(1, Math.min(10, newZoom));
      const z0 = prev.zoom;
      // 如果未指定中心点，则使用场馆中心
      const cx = center?.x ?? (venueMap.width > 0 ? venueMap.width / 2 : 0);
      const cy = center?.y ?? (venueMap.height > 0 ? venueMap.height / 2 : 0);
      // 计算新的平移位置，使得缩放中心保持在屏幕上的相同位置
      const panNewX = cx - ((cx - prev.pan.x) * z0) / z1;
      const panNewY = cy - ((cy - prev.pan.y) * z0) / z1;
      return {
        ...prev,
        zoom: z1,
        pan: { x: panNewX, y: panNewY },
      };
    });
  }, [venueMap.width, venueMap.height]);

  /**
   * 设置平移偏移量
   * 直接设置画布的平移位置
   *
   * @param {Point} pan - 新的平移偏移 (pan.x, pan.y)
   */
  const setPan = useCallback((pan: Point) => {
    setEditorState(prev => ({
      ...prev,
      pan,
    }));
  }, []);

  /**
   * 重置视图
   * 将缩放重置为 100%，平移重置为原点 (0, 0)
   */
  const resetView = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 },
    }));
  }, []);

  /**
   * 自动调整视图以显示所有内容
   * 计算所有内容的边界框，然后调整缩放和平移
   */
  const fitToView = useCallback(() => {
    if (!venueMap.svgUrl && venueMap.sections.length === 0) return;

    // 计算所有内容的边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (venueMap.svgUrl) {
      // 如果有 SVG 底图，使用其尺寸
      minX = 0;
      minY = 0;
      maxX = venueMap.width;
      maxY = venueMap.height;
    }

    // 遍历所有区域的顶点，找到边界框
    venueMap.sections.forEach(section => {
      section.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });

    if (minX === Infinity) return;

    const padding = 50;  // 边界空白

    // 简单地调整平移位置以显示内容
    // 注意：实际应用中可能需要根据容器尺寸计算更合适的缩放比例
    setEditorState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: minX - padding, y: minY - padding },
    }));
  }, [venueMap]);

  /**
   * ========== 配置管理 ==========
   */

  /**
   * 更新绘制配置
   * 修改座位和区域在画布上的绘制外观
   *
   * @param {Partial<DrawConfig>} updates - 要更新的配置属性
   */
  const updateDrawConfig = useCallback((updates: Partial<DrawConfig>) => {
    setDrawConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 更新视图配置
   * 修改画布的显示选项（网格、吸附等）
   *
   * @param {Partial<ViewConfig>} updates - 要更新的配置属性
   */
  const updateViewConfig = useCallback((updates: Partial<ViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * ========== 数据导入导出 ==========
   */

  /**
   * 导出数据
   * 将场馆地图转换为格式化的 JSON 字符串
   * 用于保存到文件或上传到服务器
   *
   * @returns {string} JSON 格式的场馆数据
   */
  const exportData = useCallback(() => {
    return JSON.stringify(venueMap, null, 2);
  }, [venueMap]);

  /**
   * 导入数据
   * 从 JSON 字符串解析并加载场馆数据
   * 用于从文件恢复之前保存的配置
   *
   * @param {string} json - JSON 格式的场馆数据
   * @returns {boolean} 是否导入成功
   */
  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json) as VenueMap;
      setVenueMap(data);
      return true;
    } catch {
      return false;
    }
  }, [setVenueMap]);

  /**
   * 获取当前选中的区域
   * 根据编辑器状态中的 selectedSectionId 找到对应的区域对象
   *
   * @returns {Section | null} 当前选中的区域，或 null 如果没有选中
   */
  const getCurrentSection = useCallback(() => {
    return venueMap.sections.find(s => s.id === editorState.selectedSectionId) || null;
  }, [venueMap.sections, editorState.selectedSectionId]);

  /**
   * ================== 返回 Hook 提供的所有函数和状态 ==================
   *
   * 这个对象包含了应用所需的所有数据和操作函数
   * 分为以下几类：
   * 1. 状态：венуemap、编辑器状态、配置等
   * 2. 操作函数：修改数据的各种操作
   * 3. 撤销/重做：历史管理
   * 4. 视图控制：缩放、平移等
   * 5. 数据导入导出：保存和加载配置
   */
  return {
    // ========== 状态：场馆和编辑器数据 ==========
    venueMap,                           // 场馆地图的所有数据（区域、座位、配置等）
    editorState,                        // 编辑器当前状态（模式、选中项、工具选择等）
    drawConfig,                         // 绘制配置（座位大小、间距、颜色等）
    viewConfig,                         // 视图配置（网格、吸附等）
    fileInputRef,                       // SVG 文件输入元素引用
    currentSection: getCurrentSection(), // 当前编辑中的区域
    canUndo,                            // 是否可以撤销
    canRedo,                            // 是否可以重做

    // ========== SVG 文件操作 ==========
    handleSvgUpload,                    // 处理 SVG 文件上传
    triggerFileUpload,                  // 触发文件选择对话框

    // ========== 模式和工具管理 ==========
    setMode,                            // 设置编辑模式
    setSeatTool,                        // 设置座位工具（单个、行、线等）
    setCanvasTool,                      // 设置画布工具（自动、平移等）

    // ========== 撤销/重做 ==========
    undo,                               // 撤销上一步操作
    redo,                               // 重做下一步操作

    // ========== 区域操作 ==========
    startSectionDrawing,                // 开始绘制区域（进入绘制模式）
    addSectionPoint,                    // 添加区域多边形的一个顶点
    completeSectionDrawing,             // 完成区域绘制（创建区域）
    cancelDrawing,                      // 取消绘制操作
    enterSection,                       // 进入区域编辑模式（进入座位编辑）
    exitSection,                        // 退出区域编辑模式
    deleteSection,                      // 删除区域及其所有座位
    updateSection,                      // 更新区域属性（名称、颜色等）

    // ========== 座位操作 ==========
    addSeat,                            // 添加单个座位
    addSeatsInRow,                      // 创建一行座位
    addSeatsAlongLine,                  // 沿多段线创建座位
    deleteSeat,                         // 删除座位
    updateSeat,                         // 更新座位属性（状态、颜色等）
    moveSeats,                          // 移动选中的座位（拖拽）
    nudgeSeats,                         // 轻微调整座位位置（箭头键）
    alignSeats,                         // 对齐选中的座位
    selectSeats,                        // 选择座位
    selectSeatsInArea,                  // 框选矩形区域内的座位
    selectSeatsAlongLine,               // 选择靠近某条线的座位
    clearSeatSelection,                 // 清除座位选择

    // ========== 配置操作 ==========
    updateDrawConfig,                   // 更新绘制配置
    updateViewConfig,                   // 更新视图配置

    // ========== 视图控制 ==========
    setZoom,                            // 设置缩放级别
    setPan,                             // 设置平移偏移
    resetView,                          // 重置视图（缩放 100%，平移到原点）
    fitToView,                          // 自动调整视图以显示所有内容

    // ========== 数据导入导出 ==========
    exportData,                         // 导出场馆配置为 JSON 字符串
    importData,                         // 从 JSON 字符串导入场馆配置
  };
}
