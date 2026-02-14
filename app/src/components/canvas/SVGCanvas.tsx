/**
 * SVG 绘制画布组件
 *
 * 这是应用的核心交互组件，负责：
 * 1. 绘制场馆底图、区域和座位
 * 2. 处理所有鼠标和键盘交互
 * 3. 实现各种绘制和编辑工具的逻辑
 * 4. 管理用户交互的反馈（预览、提示等）
 *
 * 功能模块：
 * - 坐标转换：屏幕坐标 ↔ SVG 坐标
 * - 几何检测：点在多边形/矩形内、点到线的距离等
 * - 鼠标处理：点击、拖拽、悬停等
 * - 键盘处理：快捷键、箭头键等
 * - 渲染：网格、背景、区域、座位、预览等
 * - 缩放/平移：处理鼠标滚轮和平移操作
 *
 * 交互流程：
 * 1. 用户在画布上进行鼠标操作 → 触发事件处理
 * 2. 事件处理确定操作类型（绘制、选择、移动等）
 * 3. 计算相关的几何数据
 * 4. 触发父组件的回调函数
 * 5. 更新状态用于实时预览
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Point, Section, EditorMode, SeatTool, CanvasTool, ViewConfig, SeatGroup } from '@/types';
import { Save, X } from 'lucide-react';

/**
 * SVGCanvas 组件的 Props 接口
 * 定义了所有需要传入的属性和回调函数
 */
interface SVGCanvasProps {
  // ========== 场馆数据 ==========
  svgUrl: string | null;                // SVG 底图 URL
  sections: Section[];                  // 所有区域数据
  seatGroups?: SeatGroup[];             // 所有座位组数据（可选）
  width: number;                        // 画布宽度
  height: number;                       // 画布高度

  // ========== 编辑器状态 ==========
  mode: EditorMode;                     // 当前编辑模式
  selectedSectionId: string | null;     // 当前选中的区域 ID
  selectedSeatIds: string[];            // 当前选中的座位 ID 数组
  seatTool: SeatTool;                   // 当前座位工具
  canvasTool: CanvasTool;               // 当前画布工具
  zoom: number;                         // 缩放比例
  pan: Point;                           // 平移偏移
  drawingPoints: Point[];               // 绘制中的多边形顶点
  viewConfig: ViewConfig;               // 视图配置

  // ========== 绘制配置 ==========
  seatRadius: number;                   // 座位圆形半径
  seatSpacing: number;                  // 座位间距

  // ========== 回调函数 ==========
  onAddSectionPoint: (point: Point) => void;  // 添加区域顶点
  onCompleteSection: () => void;              // 完成区域绘制
  onCancelDrawing: () => void;                // 取消绘制
  onEnterSection: (sectionId: string) => void;  // 进入区域编辑
  onAddSeat: (sectionId: string, point: Point) => void;  // 添加座位
  onAddSeatsInRow: (sectionId: string, start: Point, end: Point, spacing?: number) => void;  // 添加一行座位
  onAddSeatsAlongLine: (sectionId: string, points: Point[], spacing?: number) => void;  // 沿线添加座位
  onSelectSeat: (seatId: string, multi: boolean) => void;  // 选择座位
  onSelectSeatsInArea: (sectionId: string, start: Point, end: Point) => void;  // 框选座位
  onMoveSeats: (sectionId: string, seatIds: string[], delta: Point) => void;  // 移动座位
  onNudgeSeats: (sectionId: string, seatIds: string[], direction: 'up' | 'down' | 'left' | 'right') => void;  // 轻微调整座位
  onDeleteSeat: (sectionId: string, seatId: string) => void;  // 删除座位
  onPan: (delta: Point) => void;                // 平移
  onZoom: (delta: number, center: Point) => void;  // 缩放
  onUpdateSeatGroupSpacing?: (sectionId: string, groupId: string, newSpacing: number) => void;  // 更新座位组间距
}

/**
 * SVG 绘制画布组件
 */
export const SVGCanvas: React.FC<SVGCanvasProps> = ({
  svgUrl,
  sections,
  seatGroups,
  width,
  height,
  mode,
  selectedSectionId,
  selectedSeatIds,
  seatTool,
  canvasTool,
  zoom,
  pan,
  drawingPoints,
  viewConfig,
  seatRadius,
  seatSpacing,
  onAddSectionPoint,
  onCompleteSection,
  onCancelDrawing,
  onEnterSection,
  onAddSeat,
  onAddSeatsInRow,
  onAddSeatsAlongLine,
  onSelectSeat,
  onSelectSeatsInArea,
  onMoveSeats,
  onNudgeSeats,
  onDeleteSeat,
  onPan,
  onZoom,
  onUpdateSeatGroupSpacing,
}) => {
  /**
   * ========== Refs ==========
   * 用于存储 DOM 元素引用
   */
  const svgRef = useRef<SVGSVGElement>(null);           // SVG 元素引用
  const containerRef = useRef<HTMLDivElement>(null);    // 容器元素引用

  /**
   * ========== 交互状态 ==========
   * 这些状态管理用户当前的交互操作
   */
  const [isPanning, setIsPanning] = useState(false);              // 是否在平移
  const [isDraggingSeats, setIsDraggingSeats] = useState(false);  // 是否在拖拽座位
  const [panStart, setPanStart] = useState<Point | null>(null);   // 平移的起始位置
  const [dragStart, setDragStart] = useState<Point | null>(null);  // 拖拽框选的起始位置
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);  // 拖拽框选的当前位置
  const [tempPoints, setTempPoints] = useState<Point[]>([]);      // 线工具的临时点集
  const [rowStartPoint, setRowStartPoint] = useState<Point | null>(null);  // 行工具的起始点
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });  // 当前鼠标位置
  const [seatDragStart, setSeatDragStart] = useState<Point | null>(null);  // 座位拖拽的起始位置
  const [seatDragOrigin, setSeatDragOrigin] = useState<Point | null>(null);  // 座位拖拽的原始位置
  const [isSpacePressed, setIsSpacePressed] = useState(false);  // Space 键是否被按下
  const spacePressedRef = useRef(false);  // Ref 用于在事件处理中获取最新的 Space 键状态
  const [isAltPressed, setIsAltPressed] = useState(false);  // Alt 键是否被按下
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);  // 鼠标悬停的座位 ID
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);  // 鼠标悬停的区域 ID
  const [currentGroupSpacing, setCurrentGroupSpacing] = useState<number | null>(null);  // 当前座位组的间距
  const [showSpacingInput, setShowSpacingInput] = useState(false);  // 是否显示间距输入对话框
  const [pendingRowData, setPendingRowData] = useState<{ start: Point; end: Point } | null>(null);  // 待处理的行数据
  const [pendingLineData, setPendingLineData] = useState<Point[] | null>(null);  // 待处理的线数据
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<{ group: SeatGroup; seatCount: number } | null>(null);  // 选中的座位组信息
  const [editingGroupSpacing, setEditingGroupSpacing] = useState<number | null>(null);  // 正在编辑的座位组间距

  /**
   * ========== 坐标转换函数 ==========
   */

  /**
   * 将屏幕坐标转换为 SVG 坐标
   * 使用 SVG 的 getScreenCTM 方法进行矩阵变换
   *
   * @param {number} screenX - 屏幕 X 坐标
   * @param {number} screenY - 屏幕 Y 坐标
   * @returns {Point} 转换后的 SVG 坐标
   */
  const screenToSVG = useCallback((screenX: number, screenY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  /**
   * 获取鼠标在 SVG 坐标系中的位置
   *
   * @param {React.MouseEvent} e - 鼠标事件
   * @returns {Point} 鼠标的 SVG 坐标
   */
  const getMousePos = useCallback((e: React.MouseEvent): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToSVG(e.clientX, e.clientY);
  }, [screenToSVG]);

  /**
   * 检查是否应该触发平移操作
   * 支持多种平移方式：
   * 1. 中键点击
   * 2. Pan 工具激活时的左键
   * 3. 按住 Space 时的左键
   *
   * @param {React.MouseEvent} e - 鼠标事件
   * @returns {boolean} 是否应该平移
   */
  const shouldPan = useCallback((e: React.MouseEvent) => {
    return e.button === 1 ||  // 中键点击平移
           canvasTool === 'pan' ||  // Pan 工具激活
           ((isSpacePressed || spacePressedRef.current) && e.button === 0);  // Space + 左键平移
  }, [canvasTool, isSpacePressed]);

  /**
   * 获取指定点上的区域
   * 通过检查点是否在多边形内来判断
   * 按照倒序检查（最后添加的区域优先，即显示在上层的区域优先）
   *
   * @param {Point} point - 检查的坐标点
   * @returns {Section | null} 该点所在的区域，或 null
   */
  const getSectionAtPoint = useCallback((point: Point): Section | null => {
    // 按倒序遍历区域，这样后添加的区域会优先被选中（在上层）
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (isPointInPolygon(point, section.points)) {
        return section;
      }
    }
    return null;
  }, [sections]);

  /**
   * 获取指定点上的座位
   * 检查点距离座位中心的距离是否在座位半径范围内
   *
   * @param {Point} point - 检查的坐标点
   * @param {Section | null} section - 要检查的区域（如果为 null 则不检查）
   * @returns {Object | null} 返回座位和其所属区域，或 null
   */
  const getSeatAtPoint = useCallback((point: Point, section: Section | null) => {
    if (!section) return null;
    // 遍历区域内的所有座位
    for (const seat of section.seats) {
      // 计算点到座位中心的距离
      const dist = Math.sqrt((seat.x - point.x) ** 2 + (seat.y - point.y) ** 2);
      // 如果距离在座位半径范围内（加上 2 像素的容差），则认为点击中了座位
      if (dist <= seatRadius + 2) {
        return { seat, section };
      }
    }
    return null;
  }, [seatRadius]);

  /**
   * ========== 鼠标事件处理器 ==========
   */

  /**
   * 处理鼠标按下事件
   * 这是大多数交互的起点
   *
   * 处理的操作：
   * 1. 检测平移操作
   * 2. 绘制区域（添加多边形顶点）
   * 3. 添加座位
   * 4. 选择座位
   * 5. 选择座位行
   * 6. 沿线绘制座位
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getMousePos(e);

    // 检查是否触发平移
    if (shouldPan(e)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // 只处理左键点击
    if (e.button !== 0) return;

    // 在绘制区域模式下，添加顶点
    if (mode === 'draw-section') {
      onAddSectionPoint(pos);
    } else if (mode === 'draw-seat' && selectedSectionId) {
      // 在编辑座位模式下，根据当前工具处理不同的操作
      const section = sections.find(s => s.id === selectedSectionId);
      if (!section) return;

      if (seatTool === 'select') {
        // 选择工具：选择座位或开始拖拽/框选
        const seatInfo = getSeatAtPoint(pos, section);

        if (seatInfo) {
          const { seat } = seatInfo;
          // 如果座位未被选中，先选中它
          if (!selectedSeatIds.includes(seat.id)) {
            onSelectSeat(seat.id, e.shiftKey);
          }
          // 准备拖拽操作（除非按下 Shift 或 Alt）
          if (!e.shiftKey && !isAltPressed) {
            setSeatDragStart(pos);
            setSeatDragOrigin(pos);
          }
        } else if (isAltPressed) {
          // Alt + 拖拽：套索选择模式
          setDragStart(pos);
          setDragCurrent(pos);
        } else {
          // 框选模式
          setDragStart(pos);
          setDragCurrent(pos);
          // 如果没有按 Shift，清空之前的选择
          if (!e.shiftKey) {
            onSelectSeat('', false);
          }
        }
      } else if (seatTool === 'single') {
        // 单个座位工具：点击直接添加座位
        onAddSeat(selectedSectionId, pos);
      } else if (seatTool === 'row') {
        // 行工具：记录起始点
        setRowStartPoint(pos);
      } else if (seatTool === 'line') {
        // 线工具：添加点到临时点集
        setTempPoints(prev => [...prev, pos]);
      }
    }
  }, [mode, selectedSectionId, seatTool, isAltPressed, sections, selectedSeatIds, getMousePos, shouldPan, onAddSectionPoint, onAddSeat, onSelectSeat, getSeatAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);

    // Update hover states
    if (mode === 'view') {
      const section = getSectionAtPoint(pos);
      setHoveredSectionId(section?.id || null);
    } else if (mode === 'draw-seat' && selectedSectionId) {
      const section = sections.find(s => s.id === selectedSectionId);
      if (section) {
        const seatInfo = getSeatAtPoint(pos, section);
        setHoveredSeatId(seatInfo?.seat.id || null);
      }
    }

    if (isPanning && panStart) {
      const dx = (e.clientX - panStart.x) * 6;
      const dy = (e.clientY - panStart.y) * 6;
      onPan({ x: pan.x - dx / zoom, y: pan.y - dy / zoom });
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (seatDragStart && seatDragOrigin && selectedSectionId && !isDraggingSeats) {
      // Check if moved enough to start dragging
      const dx = pos.x - seatDragOrigin.x;
      const dy = pos.y - seatDragOrigin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Start dragging if moved more than 3 pixels
      if (distance > 3) {
        setIsDraggingSeats(true);
      }
    } else if (isDraggingSeats && seatDragStart && selectedSectionId) {
      // Calculate incremental movement
      const dx = pos.x - seatDragStart.x;
      const dy = pos.y - seatDragStart.y;

      // Only move if there's meaningful movement
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        onMoveSeats(selectedSectionId, selectedSeatIds, { x: dx, y: dy });
        setSeatDragStart(pos);
      }
    } else if (dragStart && seatTool === 'select') {
      setDragCurrent(pos);
    }
  }, [isPanning, isDraggingSeats, panStart, seatDragStart, seatDragOrigin, dragStart, seatTool, zoom, pan, mode, selectedSectionId, sections, selectedSeatIds, getMousePos, onPan, onMoveSeats, getSectionAtPoint, getSeatAtPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDraggingSeats) {
      setIsDraggingSeats(false);
      setSeatDragStart(null);
      setSeatDragOrigin(null);
      return;
    }

    // Clean up drag preparation state if no dragging happened
    if (seatDragStart && seatDragOrigin) {
      setSeatDragStart(null);
      setSeatDragOrigin(null);
    }

    const pos = getMousePos(e);

    if (seatTool === 'select' && dragStart && dragCurrent && selectedSectionId) {
      const boxWidth = Math.abs(dragCurrent.x - dragStart.x);
      const boxHeight = Math.abs(dragCurrent.y - dragStart.y);
      if (boxWidth > 5 || boxHeight > 5) {
        onSelectSeatsInArea(selectedSectionId, dragStart, dragCurrent);
      }
      setDragStart(null);
      setDragCurrent(null);
    } else if (mode === 'draw-seat' && selectedSectionId && seatTool === 'row' && rowStartPoint) {
      const distance = Math.sqrt(
        Math.pow(pos.x - rowStartPoint.x, 2) +
        Math.pow(pos.y - rowStartPoint.y, 2)
      );
      if (distance > seatSpacing / 2) {
        // Store pending data and show spacing input
        setPendingRowData({ start: rowStartPoint, end: pos });
        setShowSpacingInput(true);
      }
      setRowStartPoint(null);
    }
  }, [isPanning, isDraggingSeats, seatDragStart, seatDragOrigin, seatTool, dragStart, dragCurrent, mode, selectedSectionId, rowStartPoint, seatSpacing, getMousePos, onSelectSeatsInArea]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (mode === 'draw-section' && drawingPoints.length >= 3) {
      onCompleteSection();
    } else if (mode === 'draw-seat' && seatTool === 'line' && tempPoints.length >= 2) {
      // Store pending data and show spacing input
      setPendingLineData(tempPoints);
      setShowSpacingInput(true);
      setTempPoints([]);
    } else if (mode === 'view') {
      // Double-click on section to enter it
      const section = getSectionAtPoint(pos);
      if (section) {
        onEnterSection(section.id);
      }
    }
  }, [mode, drawingPoints.length, tempPoints, seatTool, getMousePos, onCompleteSection, onEnterSection, getSectionAtPoint]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const pos = getMousePos(e);
    onZoom(delta, pos);
  }, [getMousePos, onZoom]);

  /**
   * ========== 键盘事件处理 ==========
   * 处理所有键盘交互，包括：
   * - Space 键：用于临时启用平移模式
   * - Alt 键：用于启用套索选择模式
   * - 箭头键：用于微调座位位置
   * - Escape：取消当前操作
   * - Enter：完成绘制或编辑
   * - Delete/Backspace：删除选中的座位
   */
  useEffect(() => {
    /**
     * 键盘按下事件处理
     * 处理快捷键和组合键
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space 键：启用平移模式
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        spacePressedRef.current = true;
        setIsSpacePressed(true);
      }
      // Alt 键：启用套索选择模式
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        setIsAltPressed(true);
      }

      // 仅在有选中座位时处理箭头键
      if (selectedSectionId && selectedSeatIds.length > 0) {
        switch (e.key) {
          case 'ArrowUp':
            // 向上移动：检查是否按下 Shift（10px 步长）或使用 1px 步长
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'up');
            break;
          case 'ArrowDown':
            // 向下移动
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'down');
            break;
          case 'ArrowLeft':
            // 向左移动
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'left');
            break;
          case 'ArrowRight':
            // 向右移动
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'right');
            break;
        }
      }

      // Escape 键：取消当前操作
      if (e.key === 'Escape') {
        if (mode === 'draw-section') {
          // 取消区域绘制
          onCancelDrawing();
        } else if (mode === 'draw-seat' && tempPoints.length > 0) {
          // 清空线工具的临时点
          setTempPoints([]);
        }
      }

      // Enter 键：完成绘制或编辑
      if (e.key === 'Enter') {
        if (mode === 'draw-section' && drawingPoints.length >= 3) {
          // 完成区域绘制（需要至少 3 个顶点）
          onCompleteSection();
        } else if (mode === 'draw-seat' && seatTool === 'line' && tempPoints.length >= 2) {
          // 完成线工具座位创建（需要至少 2 个点）
          // 显示座位间距输入对话框
          setPendingLineData(tempPoints);
          setShowSpacingInput(true);
          setTempPoints([]);
        }
      }

      // Delete 或 Backspace 键：删除选中的座位
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSeatIds.length > 0 && selectedSectionId) {
          // 逐个删除所有选中的座位
          selectedSeatIds.forEach(seatId => {
            onDeleteSeat(selectedSectionId, seatId);
          });
        }
      }
    };

    /**
     * 键盘释放事件处理
     * 处理按键释放时的清理工作
     */
    const handleKeyUp = (e: KeyboardEvent) => {
      // Space 键释放：禁用平移模式
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      }
      // Alt 键释放：禁用套索选择模式
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        setIsAltPressed(false);
      }
    };

    /**
     * 窗口失焦事件处理
     * 当用户切换到其他应用时，清除所有按键状态
     * 这是必要的，因为如果用户在按住 Space 时切换窗口，
     * keyup 事件可能不会被触发
     */
    const handleBlur = () => {
      spacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    // 注册事件监听器
    // 使用捕获阶段（第三个参数为 true）以确保优先处理
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);

    // 清理函数：卸载事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mode, drawingPoints.length, tempPoints.length, selectedSeatIds, selectedSectionId, seatTool, onCancelDrawing, onCompleteSection, onAddSeatsAlongLine, onDeleteSeat, onNudgeSeats]);

  /**
   * 监控选中的座位，检查它们是否属于某个座位组
   * 这用于显示座位组的信息面板和间距编辑
   *
   * 逻辑：
   * 1. 如果没有选中座位或没有座位组，隐藏座位组信息
   * 2. 找到包含任何选中座位的座位组
   * 3. 如果恰好有一个座位组包含所有选中座位，显示该组的信息
   * 4. 如果选中的座位来自多个不同的座位组，不显示任何信息
   */
  useEffect(() => {
    // 没有选中座位或没有座位组时，隐藏信息
    if (selectedSeatIds.length === 0 || !seatGroups || seatGroups.length === 0) {
      setSelectedGroupInfo(null);
      setEditingGroupSpacing(null);
      return;
    }

    // 找到所有包含至少一个选中座位的座位组
    const groupsForSelectedSeats = seatGroups.filter(group =>
      selectedSeatIds.some(seatId => group.seatIds.includes(seatId))
    );

    // 如果恰好有一个座位组包含选中的座位
    if (groupsForSelectedSeats.length === 1) {
      const group = groupsForSelectedSeats[0];
      const seatCount = group.seatIds.length;
      // 显示座位组信息和初始化编辑的间距值
      setSelectedGroupInfo({ group, seatCount });
      setEditingGroupSpacing(group.spacing);
    } else if (groupsForSelectedSeats.length === 0) {
      // 选中的座位不属于任何座位组
      setSelectedGroupInfo(null);
      setEditingGroupSpacing(null);
    } else {
      // 选中的座位属于多个不同的座位组，不显示信息
      setSelectedGroupInfo(null);
      setEditingGroupSpacing(null);
    }
  }, [selectedSeatIds, seatGroups]);

  /**
   * ========== 渲染辅助函数 ==========
   * 这些函数用于生成 SVG 图形元素
   * 分别负责渲染不同的图层和元素
   */

  /**
   * 渲染画布背景
   * 如果有 SVG 底图，则显示 SVG 图像
   * 否则显示纯色矩形背景
   *
   * @returns {JSX.Element} 背景元素
   */
  const renderBackground = () => {
    if (svgUrl) {
      // 显示上传的 SVG 底图
      // 在座位编辑模式下，降低透明度以便看清座位
      return (
        <image
          href={svgUrl}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          opacity={mode === 'draw-seat' ? 0.8 : 1}  // 座位编辑模式下 80% 透明度
        />
      );
    }
    // 显示纯色背景
    return (
      <rect
        width={width}
        height={height}
        fill={viewConfig.backgroundColor}
        stroke="#e2e8f0"
        strokeWidth={2}
      />
    );
  };

  /**
   * 渲染网格
   * 使用 SVG 的 pattern 元素创建可重复的网格图案
   *
   * @returns {JSX.Element | null} 网格元素或 null（如果禁用网格显示）
   */
  const renderGrid = () => {
    if (!viewConfig.showGrid) return null;

    return (
      <>
        <defs>
          {/* 定义网格图案 */}
          <pattern
            id="grid"
            width={viewConfig.gridSize}
            height={viewConfig.gridSize}
            patternUnits="userSpaceOnUse"
          >
            {/* 使用路径绘制网格线 */}
            {/* M = moveTo（移动到），L = lineTo（线条到） */}
            <path
              d={`M ${viewConfig.gridSize} 0 L 0 0 0 ${viewConfig.gridSize}`}
              fill="none"
              stroke={viewConfig.gridColor}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        {/* 使用网格图案填充整个画布 */}
        <rect width={width} height={height} fill="url(#grid)" />
      </>
    );
  };

  /**
   * 渲染所有区域
   * 每个区域显示为多边形，包含标签和座位数量徽章
   *
   * @returns {JSX.Element[]} 区域 SVG 元素数组
   */
  const renderSections = () => {
    return sections.map(section => {
      const isSelected = section.id === selectedSectionId;      // 是否选中
      const isHovered = section.id === hoveredSectionId;        // 是否悬停
      // 将点坐标转换为 SVG polygon 格式的字符串
      const pointsStr = section.points.map(p => `${p.x},${p.y}`).join(' ');

      return (
        <g key={section.id}>
          {/* 区域多边形 */}
          <polygon
            points={pointsStr}
            fill={section.color}
            // 动态调整填充不透明度：选中时 15%、悬停时 25%、正常时使用配置的透明度
            fillOpacity={isSelected ? 0.15 : isHovered ? 0.25 : section.opacity}
            // 选中时使用蓝色边框，否则使用区域颜色
            stroke={isSelected ? '#3b82f6' : section.color}
            // 选中时边框粗 3px，悬停时 2.5px，否则 2px
            strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
            // 选中时为实线，否则为虚线（5px 线 + 5px 间隙）
            strokeDasharray={isSelected ? 'none' : '5,5'}
            style={{
              // 在查看模式下显示指针光标
              cursor: mode === 'view' ? 'pointer' : 'default',
              // 平滑过渡样式变化（150ms）
              transition: 'all 0.15s ease'
            }}
            // 双击进入区域编辑模式
            onDoubleClick={() => {
              console.log('double click section', section.id);
              if (mode === 'view') {
                onEnterSection(section.id);
              }
            }}
            // 鼠标进入/离开时更新悬停状态
            onMouseEnter={() => setHoveredSectionId(section.id)}
            onMouseLeave={() => setHoveredSectionId(null)}
          />

          {/* 区域标签：显示区域名称 */}
          {/* 位置：区域多边形的中心点 */}
          <text
            // 计算多边形中心的 X 坐标：所有点的 X 坐标平均值
            x={section.points.reduce((sum, p) => sum + p.x, 0) / section.points.length}
            // 计算多边形中心的 Y 坐标：所有点的 Y 坐标平均值
            y={section.points.reduce((sum, p) => sum + p.y, 0) / section.points.length}
            textAnchor="middle"              // 文本水平居中
            dominantBaseline="middle"        // 文本垂直居中
            fill={section.color}             // 使用区域颜色
            fontSize={14}
            fontWeight="bold"
            pointerEvents="none"             // 不拦截鼠标事件
            style={{
              // 文本阴影效果，使文本在背景上更易读
              textShadow: '0 0 4px rgba(255,255,255,0.8)',
              // 悬停或选中时增加不透明度
              opacity: isHovered || isSelected ? 1 : 0.8
            }}
          >
            {section.name}
          </text>

          {/* 座位数量徽章：显示该区域的座位总数 */}
          {/* 位置：区域中心右侧 40px */}
          <g transform={`translate(${section.points.reduce((sum, p) => sum + p.x, 0) / section.points.length + 40}, ${section.points.reduce((sum, p) => sum + p.y, 0) / section.points.length})`}>
            {/* 徽章背景：白色圆形 */}
            <circle r={12} fill="white" stroke={section.color} strokeWidth={1.5} />
            {/* 座位数字 */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={section.color}
              fontSize={10}
              fontWeight="bold"
              pointerEvents="none"
            >
              {section.seats.length}
            </text>
          </g>
        </g>
      );
    });
  };

  /**
   * 渲染所有座位
   * 只有在选中了某个区域时才显示该区域的座位
   *
   * 为每个座位渲染：
   * 1. 拖拽指示器（当座位被拖拽时）
   * 2. 选中指示器（淡蓝色圆环）
   * 3. 座位圆形
   * 4. 座位编号（文本）
   * 5. 悬停时的工具提示
   *
   * @returns {JSX.Element[]} 座位元素数组
   */
  const renderSeats = () => {
    if (!selectedSectionId) return null;

    const section = sections.find(s => s.id === selectedSectionId);
    if (!section) return null;

    return section.seats.map(seat => {
      const isSelected = selectedSeatIds.includes(seat.id);
      const isHovered = hoveredSeatId === seat.id;
      const isDragging = isDraggingSeats && isSelected;

      return (
        <g key={seat.id}>
          {/* 拖拽指示器：当座位被拖拽时显示红色脉冲圆环 */}
          {isDragging && (
            <circle
              cx={seat.x}
              cy={seat.y}
              r={seatRadius + 6}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              opacity={0.7}
              pointerEvents="none"
              style={{
                animation: 'pulse 0.5s ease-in-out infinite'  // 脉冲动画
              }}
            />
          )}

          {/* 选中指示器：选中但未拖拽时显示黄色虚线圆环 */}
          {isSelected && !isDragging && (
            <circle
              cx={seat.x}
              cy={seat.y}
              r={seatRadius + 4}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="3,3"
              opacity={0.6}
              pointerEvents="none"
            />
          )}

          {/* 座位圆形 */}
          <circle
            cx={seat.x}
            cy={seat.y}
            r={seatRadius}
            // 座位颜色：拖拽时红色、选中时黄色、否则使用座位自定义颜色或蓝色
            fill={isDragging ? '#ef4444' : isSelected ? '#f59e0b' : seat.color || '#3b82f6'}
            // 边框颜色：拖拽时深红色、选中时深黄色、悬停时深蓝色
            stroke={isDragging ? '#991b1b' : isSelected ? '#d97706' : isHovered ? '#1e40af' : '#1e40af'}
            // 边框粗度：拖拽或选中时 3px，悬停时 2px，否则 1px
            strokeWidth={isDragging ? 3 : isSelected ? 3 : isHovered ? 2 : 1}
            style={{
              // 选择工具时显示抓手光标，否则显示指针
              cursor: seatTool === 'select' ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              // 拖拽时不过渡（立即变化），否则平滑过渡
              transition: isDragging ? 'none' : 'all 0.1s ease',
              // 悬停或拖拽时增加亮度
              filter: isHovered || isDragging ? 'brightness(1.1)' : 'none',
              // 拖拽时降低透明度
              opacity: isDragging ? 0.9 : 1
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSeat(seat.id, e.shiftKey);
            }}
            onMouseEnter={() => setHoveredSeatId(seat.id)}
            onMouseLeave={() => setHoveredSeatId(null)}
          />

          <text
            x={seat.x}
            y={seat.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={seatRadius * 0.75}
            fontWeight={isSelected ? 'bold' : 'normal'}
            pointerEvents="none"
            style={{
              opacity: isDragging ? 0.7 : 1
            }}
          >
            {seat.number}
          </text>

          {/* Tooltip on hover */}
          {isHovered && !isDragging && (
            <g transform={`translate(${seat.x}, ${seat.y - seatRadius - 25})`}>
              <rect
                x={-35}
                y={-12}
                width={70}
                height={24}
                rx={4}
                fill="#1e293b"
                opacity={0.95}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={11}
              >
                {seat.row}-{seat.number}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  const renderDrawingPreview = () => {
    if (mode === 'draw-section' && drawingPoints.length > 0) {
      const pointsStr = drawingPoints.map(p => `${p.x},${p.y}`).join(' ');
      
      return (
        <g>
          <polygon
            points={pointsStr}
            fill="#3b82f6"
            fillOpacity={0.2}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          {drawingPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={5} fill="#3b82f6" stroke="white" strokeWidth={2} />
          ))}
          {drawingPoints.length > 0 && (
            <line
              x1={drawingPoints[drawingPoints.length - 1].x}
              y1={drawingPoints[drawingPoints.length - 1].y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          )}
          {drawingPoints.length > 1 && (
            <line
              x1={drawingPoints[0].x}
              y1={drawingPoints[0].y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.4}
            />
          )}
        </g>
      );
    }

    if (mode === 'draw-seat' && selectedSectionId) {
      const section = sections.find(s => s.id === selectedSectionId);
      if (!section) return null;

      return (
        <g>
          {/* Section highlight */}
          <polygon
            points={section.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth={4}
            strokeDasharray="8,4"
          />
          
          {/* Selection box / Lasso */}
          {seatTool === 'select' && dragStart && dragCurrent && (
            <>
              <rect
                x={Math.min(dragStart.x, dragCurrent.x)}
                y={Math.min(dragStart.y, dragCurrent.y)}
                width={Math.abs(dragCurrent.x - dragStart.x)}
                height={Math.abs(dragCurrent.y - dragStart.y)}
                fill={isAltPressed ? '#8b5cf6' : '#3b82f6'}
                fillOpacity={0.08}
                stroke={isAltPressed ? '#8b5cf6' : '#3b82f6'}
                strokeWidth={1.5}
                strokeDasharray={isAltPressed ? '4,4' : '3,3'}
                pointerEvents="none"
              />
              {/* Selection mode indicator */}
              <text
                x={Math.max(dragStart.x, dragCurrent.x) + 5}
                y={Math.min(dragStart.y, dragCurrent.y)}
                fill={isAltPressed ? '#8b5cf6' : '#3b82f6'}
                fontSize={10}
                fontWeight="bold"
                pointerEvents="none"
              >
                {isAltPressed ? 'Lasso Select' : 'Box Select'}
              </text>
            </>
          )}
          
          {/* Row preview */}
          {seatTool === 'row' && rowStartPoint && (
            <g>
              <line
                x1={rowStartPoint.x}
                y1={rowStartPoint.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              {(() => {
                const dx = mousePos.x - rowStartPoint.x;
                const dy = mousePos.y - rowStartPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const effectiveSpacing = currentGroupSpacing ?? seatSpacing;
                const seatCount = Math.floor(distance / effectiveSpacing) + 1;
                const seats = [];
                for (let i = 0; i < seatCount; i++) {
                  const t = i / Math.max(seatCount - 1, 1);
                  const x = rowStartPoint.x + dx * t;
                  const y = rowStartPoint.y + dy * t;
                  seats.push(
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={seatRadius}
                      fill="#10b981"
                      fillOpacity={0.5}
                      pointerEvents="none"
                    />
                  );
                }
                return seats;
              })()}
            </g>
          )}
          
          {/* Line tool preview */}
          {seatTool === 'line' && tempPoints.length > 0 && (
            <g>
              {tempPoints.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={5} fill="#10b981" stroke="white" strokeWidth={1.5} />
                  {i > 0 && (
                    <line
                      x1={tempPoints[i - 1].x}
                      y1={tempPoints[i - 1].y}
                      x2={p.x}
                      y2={p.y}
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  )}
                </g>
              ))}
              <line
                x1={tempPoints[tempPoints.length - 1].x}
                y1={tempPoints[tempPoints.length - 1].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            </g>
          )}
        </g>
      );
    }

    return null;
  };

  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (isDraggingSeats) return 'grabbing';
    if (seatDragStart) return 'grab';
    if (canvasTool === 'pan' || isSpacePressed) return 'grab';
    if (isAltPressed && mode === 'draw-seat' && seatTool === 'select') return 'crosshair';
    if (mode === 'draw-section') return 'crosshair';
    if (mode === 'draw-seat') {
      if (seatTool === 'select') return 'default';
      if (seatTool === 'single' || seatTool === 'row' || seatTool === 'line') return 'crosshair';
    }
    return 'default';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ 
        cursor: getCursorStyle(),
        backgroundColor: viewConfig.backgroundColor 
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${pan.x} ${pan.y} ${width / zoom} ${height / zoom}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        {renderGrid()}
        {renderBackground()}
        {renderSections()}
        {renderSeats()}
        {renderDrawingPreview()}
      </svg>
      
      {/* Status bar */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg text-sm text-slate-600 flex items-center gap-4">
        <span className="font-medium">Zoom: {Math.round(zoom * 100)}%</span>
        <span className="text-slate-300">|</span>
        <span>Pan: ({Math.round(pan.x)}, {Math.round(pan.y)})</span>
        {isSpacePressed && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Pan Mode
            </span>
          </>
        )}
        {isAltPressed && mode === 'draw-seat' && seatTool === 'select' && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-purple-600 font-medium">Lasso Select</span>
          </>
        )}
      </div>

      {/* Tool hint */}
      {mode === 'view' && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-slate-500">
          Double-click section to edit
        </div>
      )}
      {mode === 'draw-seat' && seatTool === 'select' && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-slate-500">
          Alt + Drag for lasso select
        </div>
      )}

      {/* Seat Group Info Panel */}
      {selectedGroupInfo && selectedSectionId && (
        <div className="absolute bottom-24 right-4 bg-white rounded-xl shadow-xl border border-slate-200 max-w-xs w-80 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                <span className="text-sm font-bold">{selectedGroupInfo.seatCount}</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Seat Group</h3>
                <p className="text-xs text-blue-100 capitalize">{selectedGroupInfo.group.tool} • {selectedGroupInfo.seatCount} seats</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedGroupInfo(null);
                setEditingGroupSpacing(null);
              }}
              className="hover:bg-white/20 p-1 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Current Spacing Display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Current Spacing</p>
              <p className="text-2xl font-bold text-slate-900">{selectedGroupInfo.group.spacing}px</p>
            </div>

            {/* Spacing Edit Form */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">New Spacing (pixels)</label>
              <input
                type="number"
                min="5"
                max="100"
                value={editingGroupSpacing ?? selectedGroupInfo.group.spacing}
                onChange={(e) => setEditingGroupSpacing(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                This will redistribute {selectedGroupInfo.seatCount} seats with the new spacing.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setSelectedGroupInfo(null);
                  setEditingGroupSpacing(null);
                }}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingGroupSpacing !== null && editingGroupSpacing !== selectedGroupInfo.group.spacing && onUpdateSeatGroupSpacing) {
                    onUpdateSeatGroupSpacing(selectedSectionId, selectedGroupInfo.group.id, editingGroupSpacing);
                    setSelectedGroupInfo(null);
                    setEditingGroupSpacing(null);
                  }
                }}
                disabled={editingGroupSpacing === null || editingGroupSpacing === selectedGroupInfo.group.spacing}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacing Input Dialog */}
      {showSpacingInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Set Seat Spacing</h3>
            <p className="text-sm text-slate-600 mb-4">
              Configure the spacing between seats for this group.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Spacing (pixels)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={currentGroupSpacing ?? seatSpacing}
                  onChange={(e) => setCurrentGroupSpacing(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {(pendingRowData || pendingLineData) && (
                <div className="p-3 bg-slate-100 rounded-lg text-sm">
                  <p className="text-slate-600">
                    {pendingRowData
                      ? `Preview: ~${Math.floor(
                          Math.sqrt(
                            Math.pow(pendingRowData.end.x - pendingRowData.start.x, 2) +
                            Math.pow(pendingRowData.end.y - pendingRowData.start.y, 2)
                          ) / (currentGroupSpacing ?? seatSpacing)
                        ) + 1} seats`
                      : pendingLineData
                      ? `Preview: ~${pendingLineData.reduce((total, _, i) => {
                          if (i === 0) return total;
                          const dx = pendingLineData[i].x - pendingLineData[i - 1].x;
                          const dy = pendingLineData[i].y - pendingLineData[i - 1].y;
                          return total + Math.floor(Math.sqrt(dx * dx + dy * dy) / (currentGroupSpacing ?? seatSpacing)) + 1;
                        }, 0)} seats`
                      : ''}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowSpacingInput(false);
                    setPendingRowData(null);
                    setPendingLineData(null);
                    setCurrentGroupSpacing(null);
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const spacing = currentGroupSpacing ?? seatSpacing;
                    if (pendingRowData && selectedSectionId) {
                      onAddSeatsInRow(selectedSectionId, pendingRowData.start, pendingRowData.end, spacing);
                    } else if (pendingLineData && selectedSectionId) {
                      onAddSeatsAlongLine(selectedSectionId, pendingLineData, spacing);
                    }
                    setShowSpacingInput(false);
                    setPendingRowData(null);
                    setPendingLineData(null);
                    setCurrentGroupSpacing(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Seats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Ray casting algorithm for point in polygon
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
