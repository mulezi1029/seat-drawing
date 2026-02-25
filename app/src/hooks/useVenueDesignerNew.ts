/**
 * useVenueDesignerNew - 重构后的场馆设计器主 Hook
 *
 * 这是 useVenueDesigner 的重构版本，使用新的架构：
 * - Tool System: 工具驱动的交互
 * - Modular Hooks: 职责单一的独立 hooks
 * - SceneGraph: 高效的场景数据管理
 *
 * 职责：
 * - 协调所有子 hooks (useEditorState, useViewport, useSelection, useDrawing)
 * - 管理 VenueMap 数据状态
 * - 提供与 App.tsx 兼容的 API
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { VenueMap, Section, Seat, Point, ViewportState, DrawConfig, ViewConfig, EditorMode, Category, SectionCanvas, BoundingBox } from '@/types';
import { CANVAS_CONFIG } from '@/types';
import { useEditorState } from './useEditorState';
import { useViewport } from './useViewport';
import { useSelection } from './useSelection';
import { useDrawing } from './useDrawing';
import { useCommands } from './useCommands';
import { useClipboard } from './useClipboard';
import { SceneGraph } from '@/scene';
import type { CommandContext } from '@/commands';
import {
  UploadSvgCommand,
  ImportDataCommand,
  CreateSectionCommand,
  DeleteSectionCommand,
  UpdateSectionCommand,
  AddSeatCommand,
  AddSeatsCommand,
  DeleteSeatCommand,
  UpdateSeatCommand,
  MoveSeatsCommand,
  AlignSeatsCommand,
} from '@/commands';

/** 默认场馆地图 */
const defaultVenueMap: VenueMap = {
  id: crypto.randomUUID(),
  name: 'Untitled Venue',
  svgUrl: null,
  svgContent: null,
  sections: [],
  seatGroups: [],
  width: CANVAS_CONFIG.WORLD_SIZE,
  height: CANVAS_CONFIG.WORLD_SIZE,
};

/** 默认类别 */
const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'VIP', color: '#8b5cf6', price: 100 },
  { id: 'cat-2', name: 'Standard', color: '#3b82f6', price: 50 },
  { id: 'cat-3', name: 'Economy', color: '#10b981', price: 25 },
];

/** 默认绘制配置 */
const defaultDrawConfig: DrawConfig = {
  seatRadius: 10,
  seatSpacing: 30,
  rowSpacing: 40,
  defaultColor: '#e3e3e3',
  sectionOpacity: 1,
};

/** 默认视图配置 */
const defaultViewConfig: ViewConfig = {
  showGrid: true,
  gridSize: 50,
  gridColor: '#e2e8f0',
  backgroundColor: '#ffffff',
  snapToGrid: false,
};

export interface UseVenueDesignerNewReturn {
  // 数据
  venueMap: VenueMap;
  editorState: {
    mode: 'view' | 'draw-section' | 'draw-seat';
    selectedSectionId: string | null;
    selectedSeatIds: string[];
    seatTool: 'select' | 'single' | 'row' | 'line';
    canvasTool: 'auto' | 'pan' | 'select';
    viewport: ViewportState;
    isDrawing: boolean;
    sectionDrawMode: 'polygon' | 'rectangle';
    drawingPoints: Point[];
    tempLine: Point[] | null;
  };
  drawConfig: DrawConfig;
  viewConfig: ViewConfig;
  categories: Category[];
  sectionCanvas: SectionCanvas | null;

  // 计算属性
  currentSection: Section | null;
  canUndo: boolean;
  canRedo: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // 操作方法
  setMode: (mode: EditorMode) => void;
  setSeatTool: (tool: 'select' | 'single' | 'row' | 'line') => void;
  undo: () => void;
  redo: () => void;

  // 区域操作
  startSectionDrawing: () => void;
  addSectionPoint: (point: Point) => void;
  removeLastSectionPoint: () => void;
  completeSectionDrawing: (name: string) => void;
  cancelDrawing: () => void;
  setSelectedSectionId: (id: string | null) => void;
  enterSection: (sectionId: string) => void;
  exitSection: () => void;
  deleteSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;

  // 座位操作
  addSeat: (sectionId: string, point: Point, row: string, number: number) => void;
  addSeatsInRow: (sectionId: string, start: Point, end: Point, row: string, startNumber: number) => void;
  addSeatsAlongLine: (sectionId: string, points: Point[], rowPrefix: string, startNumber: number) => void;
  deleteSeat: (seatId: string) => void;
  updateSeat: (seatId: string, updates: Partial<Seat>) => void;
  moveSeats: (seatIds: string[], deltaX: number, deltaY: number) => void;
  nudgeSeats: (seatIds: string[], dx: number, dy: number) => void;
  alignSeats: (seatIds: string[], alignType: string) => void;
  selectSeats: (seatIds: string[]) => void;
  selectSeatsInArea: (area: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  clearSeatSelection: () => void;

  // 视口操作
  setZoom: (zoom: number, centerX: number, centerY: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  fitToView: (canvasWidth: number, canvasHeight: number) => void;

  // 配置
  updateDrawConfig: (config: Partial<DrawConfig>) => void;
  updateViewConfig: (config: Partial<ViewConfig>) => void;

  // 文件操作
  handleSvgUpload: (file: File) => void;
  triggerFileUpload: () => void;
  exportData: () => string;
  importData: (data: string) => void;

  // 类别管理
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  applyCategoryToSeats: (categoryId: string, seatIds: string[]) => void;
  applyCategoryToSection: (categoryId: string, sectionId: string) => void;

  // 命令执行
  executeCommand: (command: import('@/commands').Command) => void;

  // 剪贴板操作
  canPaste: boolean;
  copySelectedSeats: () => void;
  cutSelectedSeats: () => void;
  pasteSeats: () => void;
}

export function useVenueDesignerNew(): UseVenueDesignerNewReturn {
  // ========== 子 Hooks ==========
  const editorState = useEditorState();
  const viewport = useViewport();
  const selection = useSelection();
  const drawing = useDrawing();

  // ========== 本地状态 ==========
  const [venueMap, setVenueMap] = useState<VenueMap>(defaultVenueMap);
  const [drawConfig, setDrawConfig] = useState<DrawConfig>(defaultDrawConfig);
  const [viewConfig, setViewConfig] = useState<ViewConfig>(defaultViewConfig);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 命令系统（替代手动历史管理）
  const commands = useCommands();

  // 剪贴板系统
  const clipboard = useClipboard();

  // 场景图实例（用于空间查询）
  const sceneGraphRef = useRef<SceneGraph>(new SceneGraph());

  // 保存进入 Section 前的视图状态，退出时恢复
  const previousViewportRef = useRef<ViewportState | null>(null);

  // Section 局部画布状态
  const [sectionCanvas, setSectionCanvas] = useState<SectionCanvas | null>(null);

  // ========== 同步场景图 ==========
  useEffect(() => {
    sceneGraphRef.current.clear();
    for (const section of venueMap.sections) {
      sceneGraphRef.current.addSection(section);
    }
  }, [venueMap.sections]);

  // ========== 设置命令上下文 ==========
  useEffect(() => {
    const context: CommandContext = {
      venueMap,
      editorState: {
        mode: editorState.mode,
        selectedSectionId: selection.selectedSectionId,
        selectedSeatIds: selection.selectedSeatIdsArray,
        seatTool: editorState.seatTool,
        canvasTool: editorState.canvasTool,
        viewport: viewport.viewport,
        isDrawing: editorState.isDrawing,
        sectionDrawMode: editorState.sectionDrawMode,
        drawingPoints: editorState.drawingPoints,
        tempLine: editorState.drawingPoints.length > 1
          ? [editorState.drawingPoints[editorState.drawingPoints.length - 2], editorState.drawingPoints[editorState.drawingPoints.length - 1]]
          : null,
      },
      setVenueMap,
      setEditorState: () => {},
      setSelectedSectionId: selection.setSelectedSectionId,
      setSelectedSeatIds: (ids) => {
        if (typeof ids === 'function') {
          const currentIds = selection.selectedSeatIdsArray;
          const newIds = ids(currentIds);
          selection.selectSeats(newIds);
        } else {
          selection.selectSeats(ids);
        }
      },
      getSection: (id: string) => venueMap.sections.find(s => s.id === id),
      getSeat: (sectionId: string, seatId: string) => {
        const section = venueMap.sections.find(s => s.id === sectionId);
        return section?.seats.find(s => s.id === seatId);
      },
    };
    commands.setupContext(context);
  }, [venueMap, editorState, selection, commands]);

  // ========== 历史记录管理（使用命令系统） ==========
  const undo = useCallback(() => {
    commands.undo();
  }, [commands]);

  const redo = useCallback(() => {
    commands.redo();
  }, [commands]);

  // ========== 计算属性 ==========
  const currentSection = useMemo(() => {
    if (!selection.selectedSectionId) return null;
    return venueMap.sections.find(s => s.id === selection.selectedSectionId) || null;
  }, [venueMap.sections, selection.selectedSectionId]);

  const canUndo = commands.canUndo;
  const canRedo = commands.canRedo;

  // ========== 兼容层：将子 hooks 状态整合为 editorState 格式 ==========
  const editorStateCombined = useMemo(() => ({
    mode: editorState.mode as 'view' | 'draw-section' | 'draw-seat',
    selectedSectionId: selection.selectedSectionId,
    selectedSeatIds: selection.selectedSeatIdsArray,
    seatTool: editorState.seatTool,
    canvasTool: editorState.canvasTool,
    viewport: viewport.viewport,
    isDrawing: editorState.isDrawing,
    sectionDrawMode: editorState.sectionDrawMode,
    drawingPoints: editorState.drawingPoints,
    tempLine: editorState.drawingPoints.length > 1
      ? [editorState.drawingPoints[editorState.drawingPoints.length - 2], editorState.drawingPoints[editorState.drawingPoints.length - 1]]
      : null,
  }), [editorState, selection, viewport]);

  // ========== 模式切换 ==========
  const setMode = useCallback((mode: EditorMode) => {
    if (mode === 'draw-section') {
      editorState.setMode('draw-section');
      editorState.startDrawing();
      drawing.startSectionDrawing();
    } else {
      editorState.setMode(mode);
    }
  }, [editorState, drawing]);

  // ========== 区域绘制操作 ==========
  const startSectionDrawing = useCallback(() => {
    editorState.startDrawing();
    drawing.startSectionDrawing();
  }, [editorState, drawing]);

  const addSectionPoint = useCallback((point: Point) => {
    const snappedPoint = viewConfig.snapToGrid
      ? { x: Math.round(point.x / viewConfig.gridSize) * viewConfig.gridSize, y: Math.round(point.y / viewConfig.gridSize) * viewConfig.gridSize }
      : point;
    editorState.addDrawingPoint(snappedPoint);
    const result = drawing.addSectionPoint(snappedPoint);

    // 处理自动闭合：当点击靠近起点时，触发完成绘制
    if (result.shouldAutoClose) {
      // 延迟触发以允许当前点击事件完成
      setTimeout(() => {
        // 通知 UI 层显示完成对话框
        const event = new CustomEvent('section:autoclose', {
          detail: { pointCount: result.vertexCount }
        });
        window.dispatchEvent(event);
      }, 0);
    }

    // 处理达到最大顶点数限制
    if (result.atMaxVertices && result.added) {
      setTimeout(() => {
        const event = new CustomEvent('section:maxvertices', {
          detail: { maxCount: drawing.maxVertexCount }
        });
        window.dispatchEvent(event);
      }, 0);
    }
  }, [editorState, drawing, viewConfig]);

  const removeLastSectionPoint = useCallback(() => {
    editorState.removeLastDrawingPoint();
    drawing.removeLastSectionPoint();
  }, [editorState, drawing]);

  const completeSectionDrawing = useCallback((name: string) => {
    const section = drawing.completeSectionDrawing(name, drawConfig.defaultColor, drawConfig.sectionOpacity);
    if (section) {
      const command = new CreateSectionCommand(section);
      commands.execute(command);
    }
    editorState.stopDrawing();
    editorState.setMode('view');
  }, [drawing, editorState, commands, drawConfig]);

  const cancelDrawing = useCallback(() => {
    editorState.stopDrawing();
    editorState.setMode('view');
    drawing.cancelSectionDrawing();
  }, [editorState, drawing]);

  // ========== 区域管理 ==========
  const enterSection = useCallback((sectionId: string) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;

    // 0. 保存当前视图状态，以便退出时恢复
    previousViewportRef.current = { ...viewport.viewport };

    // 1. 计算 Section 边界框 (Bounding Box)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of section.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const bounds: BoundingBox = { minX, minY, maxX, maxY };
    const sectionWidth = maxX - minX;
    const sectionHeight = maxY - minY;

    // 2. 自动校准：调整 viewport 使区域完整显示
    // 添加内边距以确保区域不会贴边
    const padding = 100;
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const scaleX = (canvasWidth - padding * 2) / sectionWidth;
    const scaleY = (canvasHeight - padding * 2) / sectionHeight;
    const scale = Math.min(scaleX, scaleY, CANVAS_CONFIG.MAX_ZOOM);

    // 3. 计算居中的偏移量
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 4. 计算背景图偏移量（用于校准）
    // 背景图默认居中在 (0,0)，范围为 (-imageWidth/2, -imageHeight/2) 到 (imageWidth/2, imageHeight/2)
    // 为了让 section 区域显示对应的背景图内容，需要将背景图按 section 边界框的左上角坐标进行偏移
    const backgroundOffset: Point = {
      x: minX,
      y: minY,
    };

    // 5. 创建 Section 局部画布状态
    const newSectionCanvas: SectionCanvas = {
      sectionId,
      bounds,
      origin: { x: minX, y: minY },
      backgroundOffset,
    };
    setSectionCanvas(newSectionCanvas);

    // 6. 应用 Viewport 变换
    viewport.setViewport({
      scale,
      offsetX: canvasWidth / 2 - centerX * scale,
      offsetY: canvasHeight / 2 - centerY * scale,
    });

    // 设置选中区域并切换到 draw-seat 模式
    selection.setSelectedSectionId(sectionId);
    editorState.setMode('draw-seat');
  }, [venueMap.sections, selection, editorState, viewport]);

  const exitSection = useCallback(() => {
    // 恢复之前的视图状态
    if (previousViewportRef.current) {
      viewport.setViewport(previousViewportRef.current);
      previousViewportRef.current = null;
    }

    // 清除 Section 局部画布状态
    setSectionCanvas(null);

    selection.setSelectedSectionId(null);
    editorState.setMode('view');
    selection.clearSeatSelection();
  }, [selection, editorState, viewport]);

  const deleteSection = useCallback((sectionId: string) => {
    const command = new DeleteSectionCommand(sectionId);
    commands.execute(command);
    if (selection.selectedSectionId === sectionId) {
      selection.setSelectedSectionId(null);
    }
  }, [commands, selection]);

  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    const command = new UpdateSectionCommand(sectionId, updates);
    commands.execute(command);
  }, [commands]);

  // ========== 座位操作 ==========
  const addSeat = useCallback((sectionId: string, point: Point, row: string, number: number) => {
    const newSeat: Seat = {
      id: crypto.randomUUID(),
      x: point.x,
      y: point.y,
      row,
      number,
      status: 'available',
      sectionId,
    };

    const command = new AddSeatCommand(sectionId, newSeat);
    commands.execute(command);
  }, [commands]);

  const addSeatsInRow = useCallback((sectionId: string, start: Point, end: Point, row: string, startNumber: number) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const seatCount = Math.max(1, Math.floor(distance / drawConfig.seatSpacing));

    const newSeats: Seat[] = [];
    for (let i = 0; i < seatCount; i++) {
      const t = seatCount > 1 ? i / (seatCount - 1) : 0;
      newSeats.push({
        id: crypto.randomUUID(),
        x: start.x + dx * t,
        y: start.y + dy * t,
        row,
        number: startNumber + i,
        status: 'available',
        sectionId,
      });
    }

    const command = new AddSeatsCommand(sectionId, newSeats);
    commands.execute(command);
  }, [commands, drawConfig.seatSpacing]);

  const addSeatsAlongLine = useCallback((sectionId: string, points: Point[], rowPrefix: string, startNumber: number) => {
    if (points.length < 2) return;

    const newSeats: Seat[] = [];
    let seatIndex = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const segmentSeatCount = Math.max(1, Math.floor(distance / drawConfig.seatSpacing));

      for (let j = 0; j < segmentSeatCount; j++) {
        const t = segmentSeatCount > 1 ? j / (segmentSeatCount - 1) : 0;
        newSeats.push({
          id: crypto.randomUUID(),
          x: start.x + dx * t,
          y: start.y + dy * t,
          row: `${rowPrefix}${i + 1}`,
          number: startNumber + seatIndex,
          status: 'available',
          sectionId,
        });
        seatIndex++;
      }
    }

    const command = new AddSeatsCommand(sectionId, newSeats);
    commands.execute(command);
  }, [commands, drawConfig.seatSpacing]);

  const deleteSeat = useCallback((seatId: string) => {
    // 找到座位所在的 section
    let sectionId: string | null = null;
    for (const section of venueMap.sections) {
      if (section.seats.find(s => s.id === seatId)) {
        sectionId = section.id;
        break;
      }
    }
    if (sectionId) {
      const command = new DeleteSeatCommand(sectionId, seatId);
      commands.execute(command);
    }
    selection.toggleSeatSelection(seatId);
  }, [venueMap.sections, commands, selection]);

  const updateSeat = useCallback((seatId: string, updates: Partial<Seat>) => {
    // 找到座位所在的 section
    let sectionId: string | null = null;
    for (const section of venueMap.sections) {
      if (section.seats.find(s => s.id === seatId)) {
        sectionId = section.id;
        break;
      }
    }
    if (sectionId) {
      const command = new UpdateSeatCommand(sectionId, seatId, updates);
      commands.execute(command);
    }
  }, [venueMap.sections, commands]);

  const moveSeats = useCallback((seatIds: string[], deltaX: number, deltaY: number) => {
    const command = new MoveSeatsCommand(seatIds, deltaX, deltaY);
    commands.execute(command);
  }, [commands]);

  const nudgeSeats = useCallback((seatIds: string[], dx: number, dy: number) => {
    moveSeats(seatIds, dx, dy);
  }, [moveSeats]);

  const alignSeats = useCallback((seatIds: string[], alignType: string) => {
    const command = new AlignSeatsCommand(seatIds, alignType);
    commands.execute(command);
  }, [commands]);

  const selectSeats = useCallback((seatIds: string[]) => {
    selection.selectSeats(seatIds);
  }, [selection]);

  const selectSeatsInArea = useCallback((area: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const seatIds: string[] = [];
    for (const section of venueMap.sections) {
      for (const seat of section.seats) {
        if (seat.x >= area.minX && seat.x <= area.maxX &&
            seat.y >= area.minY && seat.y <= area.maxY) {
          seatIds.push(seat.id);
        }
      }
    }
    selection.selectSeats(seatIds);
  }, [venueMap.sections, selection]);

  const clearSeatSelection = useCallback(() => {
    selection.clearSeatSelection();
  }, [selection]);

  // ========== 视口操作 ==========
  const setZoom = useCallback((zoom: number, centerX: number, centerY: number) => {
    viewport.zoomAtMouse(centerX, centerY, (zoom - viewport.viewport.scale) / viewport.viewport.scale);
  }, [viewport]);

  const setPan = useCallback((pan: { x: number; y: number }) => {
    viewport.setViewport({
      ...viewport.viewport,
      offsetX: pan.x,
      offsetY: pan.y,
    });
  }, [viewport]);

  const resetView = useCallback(() => {
    viewport.resetViewport();
  }, [viewport]);

  const fitToView = useCallback((width: number, height: number) => {
    if (venueMap.sections.length === 0) {
      viewport.resetViewport();
      return;
    }

    // 计算所有区域的边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const section of venueMap.sections) {
      for (const point of section.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }

    // 计算合适的缩放和偏移
    const padding = 50;
    const scale = Math.min(
      (width - padding * 2) / (maxX - minX),
      (height - padding * 2) / (maxY - minY),
      CANVAS_CONFIG.MAX_ZOOM
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    viewport.setViewport({
      scale,
      offsetX: width / 2 - centerX * scale,
      offsetY: height / 2 - centerY * scale,
    });
  }, [venueMap.sections, viewport]);

  // ========== 配置更新 ==========
  const updateDrawConfig = useCallback((config: Partial<DrawConfig>) => {
    setDrawConfig(prev => ({ ...prev, ...config }));
  }, []);

  const updateViewConfig = useCallback((config: Partial<ViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...config }));
  }, []);

  // ========== 文件操作 ==========
  const handleSvgUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const url = URL.createObjectURL(file);
      const command = new UploadSvgCommand(url, content);
      commands.execute(command);
    };
    reader.readAsText(file);
  }, [commands]);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify(venueMap, null, 2);
  }, [venueMap]);

  const importData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data) as VenueMap;
      const command = new ImportDataCommand(parsed);
      commands.execute(command);
    } catch (e) {
      console.error('Failed to import data:', e);
    }
  }, [commands]);

  // ========== 类别管理 ==========
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
    };
    setCategories(prev => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    ));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    // Also remove categoryId from seats that use this category
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        seats: section.seats.map(seat =>
          seat.categoryId === id ? { ...seat, categoryId: undefined } : seat
        ),
      })),
    }));
  }, []);

  const applyCategoryToSeats = useCallback((categoryId: string, seatIds: string[]) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        seats: section.seats.map(seat =>
          seatIds.includes(seat.id) ? { ...seat, categoryId } : seat
        ),
      })),
    }));
  }, []);

  const applyCategoryToSection = useCallback((categoryId: string, sectionId: string) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              seats: section.seats.map(seat => ({ ...seat, categoryId })),
            }
          : section
      ),
    }));
  }, []);

  // ========== 剪贴板操作 ==========
  const copySelectedSeats = useCallback(() => {
    if (!currentSection || selection.selectedSeatIdsArray.length === 0) return;

    const seatsToCopy = currentSection.seats.filter(seat =>
      selection.selectedSeatIdsArray.includes(seat.id)
    );

    clipboard.copySeats(seatsToCopy, currentSection.id);
  }, [currentSection, selection.selectedSeatIdsArray, clipboard]);

  const cutSelectedSeats = useCallback(() => {
    if (!currentSection || selection.selectedSeatIdsArray.length === 0) return;

    const seatsToCut = currentSection.seats.filter(seat =>
      selection.selectedSeatIdsArray.includes(seat.id)
    );

    // Use clipboard's cutSeats which handles both copy and delete
    clipboard.cutSeats(seatsToCut, currentSection.id, (seatIds) => {
      // Create delete commands for each seat
      for (const seatId of seatIds) {
        const command = new DeleteSeatCommand(currentSection.id, seatId);
        commands.execute(command);
      }
    });

    // Clear selection after cut
    selection.clearSeatSelection();
  }, [currentSection, selection, clipboard, commands]);

  const pasteSeats = useCallback(() => {
    if (!currentSection || !clipboard.canPaste) return;

    const pastedSeats = clipboard.pasteSeats(currentSection.id);
    if (pastedSeats && pastedSeats.length > 0) {
      // Use AddSeatsCommand to support undo/redo
      const command = new AddSeatsCommand(currentSection.id, pastedSeats);
      commands.execute(command);

      // Select the pasted seats
      selection.selectSeats(pastedSeats.map(seat => seat.id));
    }
  }, [currentSection, clipboard, commands, selection]);

  return {
    // 数据
    venueMap,
    editorState: editorStateCombined,
    drawConfig,
    viewConfig,
    categories,
    sectionCanvas,

    // 计算属性
    currentSection,
    canUndo,
    canRedo,
    fileInputRef,

    // 操作方法
    setMode,
    setSeatTool: editorState.setSeatTool,
    undo,
    redo,

    // 区域操作
    startSectionDrawing,
    addSectionPoint,
    removeLastSectionPoint,
    completeSectionDrawing,
    cancelDrawing,
    setSelectedSectionId: selection.setSelectedSectionId,
    enterSection,
    exitSection,
    deleteSection,
    updateSection,

    // 座位操作
    addSeat,
    addSeatsInRow,
    addSeatsAlongLine,
    deleteSeat,
    updateSeat,
    moveSeats,
    nudgeSeats,
    alignSeats,
    selectSeats,
    selectSeatsInArea,
    clearSeatSelection,

    // 视口操作
    setZoom,
    setPan,
    resetView,
    fitToView,

    // 配置
    updateDrawConfig,
    updateViewConfig,

    // 文件操作
    handleSvgUpload,
    triggerFileUpload,
    exportData,
    importData,

    // 类别管理
    addCategory,
    updateCategory,
    deleteCategory,
    applyCategoryToSeats,
    applyCategoryToSection,

    // 剪贴板操作
    canPaste: clipboard.canPaste,
    copySelectedSeats,
    cutSelectedSeats,
    pasteSeats,

    // 命令执行
    executeCommand: commands.execute,
  };
}
