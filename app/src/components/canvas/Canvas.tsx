/**
 * Canvas 组件 - 基于标准 SVG 分层架构
 *
 * 架构:
 * <svg>
 *   <g id="background-layer">       <!-- 背景 SVG -->
 *   <g id="viewport-layer" transform="...">  <!-- 唯一 transform -->
 *     <g id="section-layer"></g>
 *     <g id="seat-layer"></g>
 *     <g id="overlay-layer"></g>   <!-- 使用 vector-effect="non-scaling-stroke" -->
 *   </g>
 * </svg>
 *
 * 核心原则:
 * - 只有 viewport-layer 做 transform
 * - seat/section 不使用 transform，直接用 world 坐标
 * - 纯渲染引擎，单向数据流
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import type {
  Point,
  Section,
  ViewportState,
  ViewConfig,
  VenueMap,
  EditorMode,
  SeatTool,
  Category,
  SectionCanvas,
} from '@/types';
import { CANVAS_CONFIG } from '@/types';
import { SceneGraph } from '@/scene';
import { SVGRenderer } from '@/render/SVGRenderer';
import { ToolManager, ViewTool, SelectTool, DrawSectionTool, DrawSeatTool, MoveTool } from '@/tools';
import type { ToolContext } from '@/tools/types';

export interface CanvasProps {
  venueMap: VenueMap;
  width: number;
  height: number;
  mode: EditorMode;
  seatTool: SeatTool;
  viewport: ViewportState;
  drawingPoints: Point[];
  viewConfig: ViewConfig;
  selectedSectionId: string | null;
  selectedSeatIds: string[];
  sectionCanvas?: SectionCanvas | null;
  seatRadius: number;
  seatSpacing: number;
  categories?: Category[];

  onAddSectionPoint: (point: Point) => void;
  onRemoveLastSectionPoint: () => void;
  onCompleteSection: () => void;
  onCancelDrawing: () => void;
  onEnterSection: (sectionId: string) => void;
  onSetSelectedSectionId: (sectionId: string | null) => void;
  onAddSeat: (sectionId: string, point: Point) => void;
  onAddSeatsInRow: (sectionId: string, start: Point, end: Point, spacing?: number) => void;
  onAddSeatsAlongLine?: (sectionId: string, points: Point[]) => void;
  onSelectSeat: (seatId: string, multi?: boolean) => void;
  onSelectSeatsInArea: (sectionId: string, start: Point, end: Point) => void;
  onMoveSeats: (sectionId: string, seatIds: string[], delta: Point) => void;
  onNudgeSeats: (sectionId: string, seatIds: string[], direction: 'up' | 'down' | 'left' | 'right') => void;
  onDeleteSeat: (sectionId: string, seatId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (zoom: number, centerX: number, centerY: number) => void;
  onSetMode: (mode: EditorMode) => void;
  onSetPan?: (pan: { x: number; y: number }) => void;
  onExecuteCommand?: (command: import('@/commands').Command) => void;
}

export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  (
    {
      venueMap,
      mode,
      seatTool,
      viewport,
      drawingPoints,
      viewConfig,
      selectedSectionId,
      selectedSeatIds,
      seatRadius,
      onAddSectionPoint,
      onRemoveLastSectionPoint,
      onCompleteSection,
      onCancelDrawing,
      onEnterSection,
      onSetSelectedSectionId,
      onAddSeat,
      onAddSeatsInRow,
      onAddSeatsAlongLine,
      onSelectSeat,
      onSelectSeatsInArea,
      onNudgeSeats,
      onDeleteSeat,
      onDeleteSection,
      onPan,
      onSetMode,
      onSetPan,
      onExecuteCommand,
      seatSpacing,
      categories,
      sectionCanvas,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useImperativeHandle(ref, () => containerRef.current!);

    const rendererRef = useRef<SVGRenderer | null>(null);
    const sceneGraphRef = useRef<SceneGraph>(new SceneGraph());
    const toolManagerRef = useRef<ToolManager | null>(null);

    // 交互状态
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingSeats, setIsDraggingSeats] = useState(false);
    const [panStart, setPanStart] = useState<Point | null>(null);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
    const [rowStartPoint, setRowStartPoint] = useState<Point | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [seatDragStart, setSeatDragStart] = useState<Point | null>(null);
    const [seatDragOrigin, setSeatDragOrigin] = useState<Point | null>(null);
    const [linePoints, setLinePoints] = useState<Point[]>([]);
    const spacePressedRef = useRef(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isAltPressed, setIsAltPressed] = useState(false);
    const [, setIsShiftPressed] = useState(false);
    const [, setHoveredSeatId] = useState<string | null>(null);
    const [hoveredDrawingPointIndex, setHoveredDrawingPointIndex] = useState<number | null>(null);

    // 工具 overlay 状态
    const [toolOverlayNode, setToolOverlayNode] = useState<React.ReactNode>(null);

    // 初始化渲染器
    useEffect(() => {
      if (!svgRef.current) return;

      rendererRef.current = new SVGRenderer({
        svg: svgRef.current,
        options: {
          backgroundColor: viewConfig.backgroundColor,
          antialias: true,
          performanceMode: 'quality',
        },
        backgroundImageUrl: venueMap.svgUrl ?? undefined,
      });

      return () => {
        rendererRef.current?.destroy();
      };
    }, []);

    // 数据变化时 - 完整渲染（低频）
    useEffect(() => {
      const sceneGraph = sceneGraphRef.current;
      sceneGraph.clear();

      venueMap.sections.forEach((section) => {
        sceneGraph.addSection(section);
      });

      // 数据变化时需要完整渲染
      rendererRef.current?.render(sceneGraph, viewport, {
        selectedSeatIds,
        selectedSectionId,
        drawingPoints,
        mousePos,
        mode,
        seatTool,
        isAltPressed,
        dragStart,
        dragCurrent,
        rowStartPoint,
        linePoints,
        hoveredDrawingPointIndex,
        seatRadius,
        seatSpacing,
        viewConfig,
        categories,
        sectionCanvas,
      });
    }, [venueMap, selectedSeatIds, drawingPoints, mode, seatTool, seatRadius, seatSpacing, viewConfig, categories, linePoints, sectionCanvas]);

    // Viewport 变化时 - 只更新变换（高频，平移/缩放）
    useEffect(() => {
      // 仅更新 viewport transform 和 overlay，不重新渲染数据
      rendererRef.current?.updateViewport(viewport, {
        selectedSeatIds,
        selectedSectionId,
        drawingPoints,
        mousePos,
        mode,
        seatTool,
        isAltPressed,
        dragStart,
        dragCurrent,
        rowStartPoint,
        linePoints,
        hoveredDrawingPointIndex,
        seatRadius,
        seatSpacing,
        viewConfig,
        categories,
        sectionCanvas,
      });
    }, [viewport, selectedSeatIds, drawingPoints, mousePos, mode, seatTool, isAltPressed, dragStart, dragCurrent, rowStartPoint, linePoints, hoveredDrawingPointIndex, seatRadius, seatSpacing, viewConfig, categories, sectionCanvas]);

    // 更新视图配置
    useEffect(() => {
      if (!rendererRef.current) return;
      rendererRef.current.updateOptions({
        backgroundColor: viewConfig.backgroundColor,
      });
    }, [viewConfig.backgroundColor]);

    // 更新背景图片
    useEffect(() => {
      if (!rendererRef.current) return;
      rendererRef.current.updateBackgroundImage(venueMap.svgUrl, sectionCanvas);
    }, [venueMap.svgUrl, sectionCanvas]);

    // ========== 坐标转换函数 ==========

    const screenToViewport = useCallback((screenX: number, screenY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: screenX - rect.left,
        y: screenY - rect.top,
      };
    }, []);

    const viewportToWorld = useCallback((viewportX: number, viewportY: number): Point => {
      const { scale, offsetX, offsetY } = viewport;
      return {
        x: (viewportX - offsetX) / scale,
        y: (viewportY - offsetY) / scale,
      };
    }, [viewport]);

    const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
      const vp = screenToViewport(screenX, screenY);
      return viewportToWorld(vp.x, vp.y);
    }, [screenToViewport, viewportToWorld]);

    const getMousePos = useCallback((e: React.MouseEvent | MouseEvent): Point => {
      return screenToWorld(e.clientX, e.clientY);
    }, [screenToWorld]);

    // ========== 几何检测函数 (必须在 ToolContext 之前定义) ==========

    const isPointInPolygon = useCallback((point: Point, polygon: Point[]): boolean => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }, []);

    const getSectionAtPoint = useCallback((point: Point): Section | null => {
      for (let i = venueMap.sections.length - 1; i >= 0; i--) {
        const section = venueMap.sections[i];
        if (isPointInPolygon(point, section.points)) {
          return section;
        }
      }
      return null;
    }, [venueMap.sections, isPointInPolygon]);

    const getSeatAtPoint = useCallback((point: Point, section: Section | null) => {
      if (!section) return null;
      const hitRadius = (seatRadius + 2) / viewport.scale;
      for (const seat of section.seats) {
        const dist = Math.sqrt((seat.x - point.x) ** 2 + (seat.y - point.y) ** 2);
        if (dist <= hitRadius) {
          return { seat, section };
        }
      }
      return null;
    }, [seatRadius, viewport.scale]);

    const shouldPan = useCallback((e: React.MouseEvent | MouseEvent) => {
      return e.button === 1 || (isSpacePressed && e.button === 0);
    }, [isSpacePressed]);

    // ========== ToolContext ==========
    const toolContext = useMemo<ToolContext>(() => ({
      viewport,
      setViewport: (newViewport) => {
        onSetPan?.({ x: newViewport.offsetX, y: newViewport.offsetY });
      },
      screenToWorld,
      worldToScreen: (worldX: number, worldY: number): Point => {
        return {
          x: worldX * viewport.scale + viewport.offsetX,
          y: worldY * viewport.scale + viewport.offsetY,
        };
      },
      venueMap,
      setVenueMap: () => {},
      isSpacePressed: () => isSpacePressed,
      editorState: {
        mode,
        selectedSectionId,
        selectedSeatIds,
        seatTool,
        canvasTool: 'auto',
        isDrawing: drawingPoints.length > 0,
        sectionDrawMode: 'polygon',
        drawingPoints,
        tempLine: null,
      } as import('@/types').EditorState,
      setEditorState: () => {},
      mode,
      setMode: onSetMode,
      seatTool,
      setSeatTool: () => {},
      selectedSectionId,
      setSelectedSectionId: onSetSelectedSectionId,
      enterSection: onEnterSection,
      selectedSeatIds: new Set(selectedSeatIds),
      selectSeat: onSelectSeat,
      selectSeats: (ids: string[]) => {
        ids.forEach(id => onSelectSeat(id, true));
      },
      clearSeatSelection: () => onSelectSeat('', false),
      isSeatSelected: (id: string) => selectedSeatIds.includes(id),
      startSectionDrawing: () => {},
      addSectionPoint: onAddSectionPoint,
      removeLastSectionPoint: onRemoveLastSectionPoint,
      completeSectionDrawing: () => {
        onCompleteSection();
        return null;
      },
      cancelSectionDrawing: onCancelDrawing,
      updateRectanglePreview: () => {},
      getRectanglePoints: () => [],
      sectionPoints: drawingPoints,
      addSeat: onAddSeat,
      addSeatsInRow: onAddSeatsInRow,
      addSeatsAlongLine: (sectionId: string, points: Point[]) => {
        if (onAddSeatsAlongLine) {
          onAddSeatsAlongLine(sectionId, points);
        }
      },
      execute: (command) => {
        onExecuteCommand?.(command);
      },
      setToolOverlay: (overlay: React.ReactNode) => {
        setToolOverlayNode(overlay);
      },
      setCursor: () => {},
      getSectionAtPoint,
      getSeatAtPoint: (point: Point, section: Section | null) => {
        if (!section) return null;
        return getSeatAtPoint(point, section);
      },
      viewConfig,
      containerRef: containerRef as React.RefObject<HTMLElement>,
    }), [
      viewport, screenToWorld, venueMap, mode, selectedSectionId, selectedSeatIds,
      seatTool, drawingPoints, onSetMode, onEnterSection, onSetSelectedSectionId, onSelectSeat, onAddSectionPoint,
      onRemoveLastSectionPoint, onCancelDrawing, getSectionAtPoint, getSeatAtPoint, viewConfig, onSetPan, onExecuteCommand,
      onAddSeat, onAddSeatsInRow, onAddSeatsAlongLine, isSpacePressed, onCompleteSection
    ]);


    // 初始化 ToolManager
    useEffect(() => {
      toolManagerRef.current = new ToolManager(toolContext);

      // 注册所有工具
      toolManagerRef.current.registerTool(new ViewTool(toolContext), 'navigation');
      toolManagerRef.current.registerTool(new SelectTool(toolContext), 'edit', 'v');
      toolManagerRef.current.registerTool(new DrawSectionTool(toolContext), 'draw');
      toolManagerRef.current.registerTool(new DrawSeatTool(toolContext), 'draw');
      toolManagerRef.current.registerTool(new MoveTool(toolContext), 'edit');

      return () => {
        toolManagerRef.current?.destroy();
      };
    }, []);

    // 更新 ToolContext
    useEffect(() => {
      if (toolManagerRef.current) {
        toolManagerRef.current.setContext(toolContext);
      }
    }, [toolContext]);

    // 根据 mode 切换工具
    useEffect(() => {
      if (!toolManagerRef.current) return;

      // 根据当前 mode 设置对应的工具
      switch (mode) {
        case 'view':
          toolManagerRef.current.setTool('view');
          break;
        case 'draw-section':
          toolManagerRef.current.setTool('draw-section');
          break;
        case 'draw-seat':
          // 在 draw-seat 模式下，根据 seatTool 选择具体工具
          switch (seatTool) {
            case 'select':
              toolManagerRef.current.setTool('select');
              break;
            case 'single':
            case 'row':
              toolManagerRef.current.setTool('draw-seat');
              break;
            default:
              toolManagerRef.current.setTool('view');
          }
          break;
        default:
          toolManagerRef.current.setTool('view');
      }
    }, [mode, seatTool]);

    // ========== 鼠标事件处理 (分发给 ToolManager) ==========

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();

      const pos = getMousePos(e);

      // 设置平移状态（用于光标样式）
      if (shouldPan(e)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }

      if (e.button === 2) {
        if (mode === 'draw-section' && drawingPoints.length > 0) {
          onRemoveLastSectionPoint();
        }
        return;
      }

      // 处理 row 工具：设置起始点
      if (mode === 'draw-seat' && seatTool === 'row' && selectedSectionId) {
        setRowStartPoint(pos);
        return;
      }

      // 处理 line 工具：添加到点数组
      if (mode === 'draw-seat' && seatTool === 'line' && selectedSectionId) {
        setLinePoints(prev => [...prev, pos]);
        return;
      }

      // 处理 select 工具的框选：设置起始点
      if (mode === 'draw-seat' && seatTool === 'select' && selectedSectionId && e.button === 0) {
        setDragStart(pos);
        setDragCurrent(pos);
        return;
      }

      // 使用 ToolManager 处理事件（包括所有按键状态）
      if (containerRef.current) {
        toolManagerRef.current?.handleMouseDown(e.nativeEvent, containerRef.current);
      }
    }, [mode, drawingPoints.length, shouldPan, onRemoveLastSectionPoint, getMousePos, seatTool, selectedSectionId]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      const pos = getMousePos(e);
      setMousePos(pos);

      if (mode === 'draw-section' && drawingPoints.length > 0) {
        const HOVER_RADIUS = 15;
        let hoveredIndex: number | null = null;
        for (let i = 0; i < drawingPoints.length; i++) {
          const point = drawingPoints[i];
          const dist = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2);
          if (dist <= HOVER_RADIUS) {
            hoveredIndex = i;
            break;
          }
        }
        setHoveredDrawingPointIndex(hoveredIndex);
      } else if (mode === 'draw-seat' && selectedSectionId) {
        const section = venueMap.sections.find(s => s.id === selectedSectionId);
        if (section) {
          const seatInfo = getSeatAtPoint(pos, section);
          setHoveredSeatId(seatInfo?.seat.id || null);
        }
      }

      if (isPanning && panStart) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        onPan(dx, dy);
        setPanStart({ x: e.clientX, y: e.clientY });
      }

      // 处理 select 工具的框选：更新当前点
      if (seatTool === 'select' && dragStart) {
        setDragCurrent(pos);
      }

      // 分发给 ToolManager
      if (containerRef.current) {
        toolManagerRef.current?.handleMouseMove(e.nativeEvent, containerRef.current);
      }
    }, [isPanning, panStart, mode, selectedSectionId, venueMap.sections, drawingPoints, getMousePos, onPan, getSeatAtPoint, seatTool, dragStart]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
      // 使用 ToolManager 处理事件（优先让工具处理）
      if (containerRef.current) {
        toolManagerRef.current?.handleMouseUp(e.nativeEvent, containerRef.current);
      }

      // 重置平移状态
      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
      }

      if (isDraggingSeats) {
        setIsDraggingSeats(false);
        setSeatDragStart(null);
        setSeatDragOrigin(null);
      }

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
        const distance = Math.sqrt(Math.pow(pos.x - rowStartPoint.x, 2) + Math.pow(pos.y - rowStartPoint.y, 2));
        if (distance > seatSpacing / 2) {
          onAddSeatsInRow(selectedSectionId, rowStartPoint, pos, seatSpacing);
        }
        setRowStartPoint(null);
      } else if (mode === 'draw-seat' && selectedSectionId && seatTool === 'line' && linePoints.length >= 2) {
        // Line 工具：双击或右键完成，这里不需要处理，由双击事件处理
      }
    }, [isPanning, isDraggingSeats, seatDragStart, seatDragOrigin, seatTool, dragStart, dragCurrent, mode, selectedSectionId, rowStartPoint, seatSpacing, getMousePos, onSelectSeatsInArea, onAddSeatsInRow, linePoints]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
      const pos = getMousePos(e);

      if (mode === 'draw-section' && drawingPoints.length >= 3) {
        onCompleteSection();
      } else if (mode === 'view') {
        const section = getSectionAtPoint(pos);
        if (section) {
          onEnterSection(section.id);
        }
      } else if (mode === 'draw-seat' && seatTool === 'line' && selectedSectionId && linePoints.length >= 2) {
        // Line 工具：双击完成绘制
        if (onAddSeatsAlongLine) {
          onAddSeatsAlongLine(selectedSectionId, linePoints);
        }
        setLinePoints([]);
        return;
      }

      // 分发给 ToolManager
      if (containerRef.current) {
        toolManagerRef.current?.handleDoubleClick?.(e.nativeEvent, containerRef.current);
      }
    }, [mode, drawingPoints.length, getMousePos, onCompleteSection, onEnterSection, getSectionAtPoint, seatTool, selectedSectionId, linePoints, onAddSeatsAlongLine]);


    // ========== 键盘事件处理 ==========

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          spacePressedRef.current = true;
          setIsSpacePressed(true);
        }
        if (e.code === 'AltLeft' || e.code === 'AltRight') {
          setIsAltPressed(true);
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          setIsShiftPressed(true);
        }

        if (selectedSectionId && selectedSeatIds.length > 0) {
          switch (e.key) {
            case 'ArrowUp':
              e.preventDefault();
              onNudgeSeats(selectedSectionId, selectedSeatIds, 'up');
              break;
            case 'ArrowDown':
              e.preventDefault();
              onNudgeSeats(selectedSectionId, selectedSeatIds, 'down');
              break;
            case 'ArrowLeft':
              e.preventDefault();
              onNudgeSeats(selectedSectionId, selectedSeatIds, 'left');
              break;
            case 'ArrowRight':
              e.preventDefault();
              onNudgeSeats(selectedSectionId, selectedSeatIds, 'right');
              break;
          }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          if (mode === 'draw-section' && drawingPoints.length > 0) {
            e.preventDefault();
            onRemoveLastSectionPoint();
            return;
          }
        }

        if (e.key === 'Escape') {
          if (mode === 'draw-section') {
            onCancelDrawing();
          } else if (mode === 'draw-seat' && seatTool === 'line' && linePoints.length > 0) {
            setLinePoints([]);
          }
        }

        if (e.key === 'Enter') {
          if (mode === 'draw-section' && drawingPoints.length >= 3) {
            onCompleteSection();
          } else if (mode === 'draw-seat' && seatTool === 'line' && selectedSectionId && linePoints.length >= 2) {
            if (onAddSeatsAlongLine) {
              onAddSeatsAlongLine(selectedSectionId, linePoints);
            }
            setLinePoints([]);
          }
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedSeatIds.length > 0 && selectedSectionId) {
            selectedSeatIds.forEach(seatId => {
              onDeleteSeat(selectedSectionId, seatId);
            });
          } else if (mode === 'view' && selectedSectionId && onDeleteSection) {
            onDeleteSection(selectedSectionId);
          }
        }

        // 分发给 ToolManager
        toolManagerRef.current?.handleKeyDown?.(e);
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        // 分发给 ToolManager
        toolManagerRef.current?.handleKeyUp?.(e);
        if (e.code === 'Space') {
          spacePressedRef.current = false;
          setIsSpacePressed(false);
        }
        if (e.code === 'AltLeft' || e.code === 'AltRight') {
          setIsAltPressed(false);
        }
      };

      const handleBlur = () => {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
        // 分发给 ToolManager
        toolManagerRef.current?.handleBlur?.();
      };

      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      window.addEventListener('blur', handleBlur);

      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
        window.removeEventListener('blur', handleBlur);
      };
    }, [mode, drawingPoints.length, selectedSeatIds, selectedSectionId, onCancelDrawing, onRemoveLastSectionPoint, onCompleteSection, onDeleteSeat, onDeleteSection, onNudgeSeats, seatTool, linePoints, onAddSeatsAlongLine]);

    const getCursorStyle = useCallback(() => {
      if (isPanning) return 'grabbing';
      if (isDraggingSeats) return 'grabbing';
      if (seatDragStart) return 'grab';
      if (isSpacePressed) return 'grab';
      if (isAltPressed && mode === 'draw-seat' && seatTool === 'select') return 'crosshair';
      if (mode === 'draw-section') return 'crosshair';
      if (mode === 'draw-seat') {
        if (seatTool === 'select') return 'default';
        if (seatTool === 'single' || seatTool === 'row') return 'crosshair';
      }
      return 'default';
    }, [isPanning, isDraggingSeats, seatDragStart, isSpacePressed, isAltPressed, mode, seatTool]);

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        style={{
          cursor: getCursorStyle(),
        }}
        onContextMenu={(e) => {
          if (mode === 'draw-section') {
            e.preventDefault();
          }
        }}
      >
        {/* 主 SVG 画布 - 按照标准架构分层 */}
        <svg
          ref={svgRef}
          style={{ backgroundColor: viewConfig.backgroundColor,overflow: 'hidden',position: 'relative',willChange:'contents' }}
          width={CANVAS_CONFIG.WORLD_SIZE}
          height={CANVAS_CONFIG.WORLD_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          // onWheel={handleWheel}
        >
          {/* SVGRenderer 会在这里创建分层结构 */}

          {/* 工具 Overlay - 在 viewport transform 下渲染 */}
          {toolOverlayNode && (
            <g
              className="tool-overlay"
              style={{ pointerEvents: 'none' }}
              transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}
            >
              {toolOverlayNode}
            </g>
          )}
        </svg>

        {/* 工具提示 */}
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
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';
