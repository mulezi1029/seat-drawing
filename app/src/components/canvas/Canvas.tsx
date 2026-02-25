/**
 * Canvas 组件 - 支持区域绘制
 *
 * 功能：
 * - SVG 背景图展示
 * - Space+拖拽平移
 * - Ctrl+滚轮缩放
 * - 区域绘制（矩形/多边形）
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { CANVAS_CONFIG, type Point, type SnapResult } from '@/types';
import { screenToWorld, createRectanglePoints, getDistance, findSnapPoint, findAlignment } from '@/utils/coordinate';

/** Canvas 组件属性 */
export interface CanvasProps {
  /** 缩放比例 */
  scale: number;
  /** 水平滚动位置 */
  offsetX: number;
  /** 垂直滚动位置 */
  offsetY: number;
  /** 空格键是否按下 */
  isSpacePressed: boolean;
  /** 当前激活的工具 */
  activeTool: string;
  /** 缩放变化回调 */
  onScaleChange: (scale: number, centerX: number, centerY: number) => void;
  /** 偏移变化回调 */
  onOffsetChange: (x: number, y: number) => void;
  /** 子元素 - SVG 渲染内容 */
  children?: React.ReactNode;
  /** 是否正在绘制 */
  isDrawing?: boolean;
  /** 当前绘制的点 */
  drawingPoints?: Point[];
  /** 绘制点变化回调 */
  onDrawingPointsChange?: (points: Point[]) => void;
  /** 绘制完成回调 */
  onDrawingComplete?: (points: Point[]) => void;
  /** 绘制状态变化回调 */
  onDrawingStateChange?: (isDrawing: boolean) => void;
  /** 所有已有区域的顶点（用于顶点吸附） */
  allVertices?: Point[];
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 网格大小 */
  gridSize?: number;
  /** 鼠标位置变化回调（世界坐标） */
  onMousePositionChange?: (position: Point | null) => void;
  /** 吸附结果变化回调 */
  onSnapResultChange?: (result: SnapResult | null) => void;
  /** Shift 键状态变化回调 */
  onShiftPressedChange?: (pressed: boolean) => void;
  /** Ctrl 键状态变化回调 */
  onCtrlPressedChange?: (pressed: boolean) => void;
}

/**
 * 画布组件 - 支持区域绘制
 */
export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  ({ scale, offsetX, offsetY, isSpacePressed, activeTool, onScaleChange, onOffsetChange, children, isDrawing: externalIsDrawing, drawingPoints: externalDrawingPoints, onDrawingPointsChange, onDrawingComplete, onDrawingStateChange, allVertices = [], showGrid = false, gridSize = 50, onMousePositionChange, onSnapResultChange, onShiftPressedChange, onCtrlPressedChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // 暴露容器引用
    useImperativeHandle(ref, () => containerRef.current!);

    // 拖拽状态使用 ref 避免重渲染，只保留光标样式状态
    const isPanningRef = useRef(false);
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const [cursorStyle, setCursorStyle] = useState('default');

    // 用于跳过大容器滚动事件的标记，避免拖拽时触发状态更新
    const isDraggingRef = useRef(false);

    // 是否处于 hand/pan 工具模式
    const isHandToolActive = activeTool === 'hand';

    // 绘制状态（内部管理，也可外部控制）
    const [internalIsDrawing, setInternalIsDrawing] = useState(false);
    const isDrawing = externalIsDrawing ?? internalIsDrawing;
    const setIsDrawing = useCallback((value: boolean) => {
      if (externalIsDrawing === undefined) {
        setInternalIsDrawing(value);
      }
      onDrawingStateChange?.(value);
    }, [externalIsDrawing, onDrawingStateChange]);

    // 绘制点（内部管理，也可外部控制）
    const [internalDrawingPoints, setInternalDrawingPoints] = useState<Point[]>([]);
    const drawingPoints = externalDrawingPoints ?? internalDrawingPoints;
    const setDrawingPoints = useCallback((points: Point[]) => {
      if (externalDrawingPoints === undefined) {
        setInternalDrawingPoints(points);
      }
      onDrawingPointsChange?.(points);
    }, [externalDrawingPoints, onDrawingPointsChange]);

    // 矩形绘制起点
    const rectStartPointRef = useRef<Point | null>(null);

    // 多边形双击检测
    const lastClickTimeRef = useRef(0);
    const lastClickPointRef = useRef<Point | null>(null);

    // Shift/Ctrl 键状态
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);

    // 鼠标位置（世界坐标）
    const [_mousePosition, setMousePosition] = useState<Point | null>(null);
    const [_snapResult, setSnapResult] = useState<SnapResult | null>(null);

    // 更新光标样式
    useEffect(() => {
      if (isPanningRef.current) {
        setCursorStyle('grabbing');
      } else if (isSpacePressed || isHandToolActive) {
        setCursorStyle('grab');
      } else if (activeTool === 'section' || activeTool === 'polygon') {
        setCursorStyle('crosshair');
      } else {
        setCursorStyle('default');
      }
    }, [isSpacePressed, isHandToolActive, activeTool]);

    // ===== 鼠标事件处理 =====

    /**
     * 判断是否应触发平移
     * - 鼠标中键拖拽
     * - 空格键按下 + 左键拖拽
     * - Hand 工具选中 + 左键拖拽
     */
    const shouldPan = useCallback(
      (e: React.MouseEvent | MouseEvent) => {
        return e.button === 1 || ((isSpacePressed || isHandToolActive) && e.button === 0);
      },
      [isSpacePressed, isHandToolActive]
    );

    /**
     * 鼠标按下
     */
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        // 平移优先级最高
        if (shouldPan(e)) {
          isPanningRef.current = true;
          isDraggingRef.current = true;
          panStartRef.current = { x: e.clientX, y: e.clientY };
          setCursorStyle('grabbing');
          return;
        }

        // 区域绘制模式
        if (activeTool === 'section' || activeTool === 'polygon') {
          if (!containerRef.current) return;

          const containerRect = containerRef.current.getBoundingClientRect();
          const worldPoint = screenToWorld(
            e.clientX,
            e.clientY,
            containerRect,
            offsetX,
            offsetY,
            scale
          );

          if (activeTool === 'section') {
            // 矩形模式：开始拖拽
            rectStartPointRef.current = worldPoint;
            setIsDrawing(true);
            setDrawingPoints([worldPoint]);
          } else if (activeTool === 'polygon') {
            // 多边形模式：添加顶点
            const now = Date.now();
            const timeDiff = now - lastClickTimeRef.current;
            const isDoubleClick = timeDiff < 300;

            if (!isDrawing) {
              // 第一个点
              setIsDrawing(true);
              setDrawingPoints([worldPoint]);
            } else {
              // 检测是否点击了第一个点（闭合）
              const firstPoint = drawingPoints[0];
              const distance = getDistance(worldPoint, firstPoint);
              const isClosing = distance < 20 / scale; // 20px 容差

              if (isDoubleClick || isClosing) {
                // 完成绘制
                if (drawingPoints.length >= 3) {
                  onDrawingComplete?.(drawingPoints);
                }
                setIsDrawing(false);
                setDrawingPoints([]);
              } else {
                // 添加顶点
                setDrawingPoints([...drawingPoints, worldPoint]);
              }
            }

            lastClickTimeRef.current = now;
            lastClickPointRef.current = worldPoint;
          }
        }
      },
      [shouldPan, activeTool, isDrawing, drawingPoints, offsetX, offsetY, scale, setIsDrawing, setDrawingPoints, onDrawingComplete]
    );

    /**
     * 计算带约束的矩形点
     */
    const calculateConstrainedRectPoints = useCallback(
      (start: Point, end: Point): Point[] => {
        let targetX = end.x;
        let targetY = end.y;

        // Shift 约束：正方形
        if (isShiftPressed) {
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          targetX = start.x + Math.sign(dx) * size;
          targetY = start.y + Math.sign(dy) * size;
        }

        // Ctrl 约束：从中心绘制
        if (isCtrlPressed) {
          const dx = targetX - start.x;
          const dy = targetY - start.y;
          return createRectanglePoints(
            { x: start.x - dx, y: start.y - dy },
            { x: start.x + dx, y: start.y + dy }
          );
        }

        return createRectanglePoints(start, { x: targetX, y: targetY });
      },
      [isShiftPressed, isCtrlPressed]
    );

    /**
     * 鼠标移动 - 使用 ref 直接操作 DOM，避免 React 重渲染
     */
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isPanningRef.current && panStartRef.current && containerRef.current) {
          const dx = e.clientX - panStartRef.current.x;
          const dy = e.clientY - panStartRef.current.y;

          // 直接操作 DOM，不触发 React 更新
          containerRef.current.scrollLeft -= dx;
          containerRef.current.scrollTop -= dy;

          panStartRef.current = { x: e.clientX, y: e.clientY };
          return;
        }

        // 更新鼠标位置并计算吸附
        if (containerRef.current && (activeTool === 'section' || activeTool === 'polygon')) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const worldPoint = screenToWorld(e.clientX, e.clientY, containerRect, offsetX, offsetY, scale);

          // 计算吸附点
          const lastPoint = drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : null;
          const snap = findSnapPoint(worldPoint, {
            gridSize: showGrid ? gridSize : undefined,
            vertices: allVertices,
            angles:
              isShiftPressed && lastPoint
                ? [0, 45, 90, 135, 180, 225, 270, 315]
                : undefined,
            angleBase: lastPoint || undefined,
          });

          // Calculate alignment using the point for alignment detection
          // Include both existing vertices and current drawing points
          const pointForAlignment = snap.type !== 'none' ? snap.point : worldPoint;
          const alignmentVertices = [...allVertices, ...drawingPoints];
          const alignment = findAlignment(pointForAlignment, alignmentVertices, 5/scale);

          // 如果对齐，使用吸附后的点
          const isAligned = alignment.isHorizontalAligned || alignment.isVerticalAligned;
          const alignedPoint = isAligned && alignment.snappedPoint ? alignment.snappedPoint : pointForAlignment;

          // Add alignment to snap result
          const snapWithAlignment: SnapResult = {
            ...snap,
            alignment,
          };

          // 使用吸附后的点作为鼠标位置
          const finalMousePosition = snap.type !== 'none' ? snap.point : alignedPoint;
          setMousePosition(finalMousePosition);
          setSnapResult(snapWithAlignment);
          onMousePositionChange?.(finalMousePosition);
          onSnapResultChange?.(snapWithAlignment);

          // 矩形拖拽预览 - 使用对齐吸附后的点
          if (isDrawing && activeTool === 'section' && rectStartPointRef.current) {
            const targetPoint = snap.type !== 'none' ? snap.point : alignedPoint;
            const rectPoints = calculateConstrainedRectPoints(rectStartPointRef.current, targetPoint);
            setDrawingPoints(rectPoints);
          }
        }
      },
      [
        isDrawing,
        activeTool,
        offsetX,
        offsetY,
        scale,
        drawingPoints,
        showGrid,
        gridSize,
        allVertices,
        isShiftPressed,
        setDrawingPoints,
        onMousePositionChange,
        onSnapResultChange,
        calculateConstrainedRectPoints,
      ]
    );

    /**
     * 鼠标释放
     */
    const handleMouseUp = useCallback(() => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        isDraggingRef.current = false;
        panStartRef.current = null;
        // 恢复光标样式
        if (isSpacePressed || isHandToolActive) {
          setCursorStyle('grab');
        } else if (activeTool === 'section' || activeTool === 'polygon') {
          setCursorStyle('crosshair');
        } else {
          setCursorStyle('default');
        }
      }

      // 矩形绘制完成
      if (isDrawing && activeTool === 'section') {
        if (drawingPoints.length >= 4) {
          onDrawingComplete?.(drawingPoints);
        }
        setIsDrawing(false);
        setDrawingPoints([]);
        rectStartPointRef.current = null;
      }
    }, [isSpacePressed, isHandToolActive, activeTool, isDrawing, drawingPoints, setIsDrawing, setDrawingPoints, onDrawingComplete]);

    // 滚轮移动优化：使用 ref 标记滚轮操作中，跳过状态同步
    const isWheelingRef = useRef(false);
    const wheelTimeoutRef = useRef<number | null>(null);

    /**
     * 滚轮缩放 (Ctrl+滚轮) 和平移 (滚轮/Shift+滚轮)
     * - 使用较小的缩放步长 (3%) 实现更精细的控制
     * - 普通滚轮直接操作 DOM 移动画布，避免 React 重渲染
     * - 注意：阻止默认行为由原生事件监听器处理（useEffect 中 passive: false）
     */
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          // 阻止默认行为由原生事件监听器处理（useEffect 中 passive: false）
          e.stopPropagation();

          // 根据滚轮方向计算缩放因子 (3% 步长)
          const zoomStep = 0.03;
          const zoomFactor = e.deltaY > 0 ? 1 - zoomStep : 1 + zoomStep;
          const newScale = scale * zoomFactor;

          onScaleChange(newScale, e.clientX, e.clientY);
        } else {
          // 普通滚轮：直接操作 DOM 移动画布，避免触发 React 状态更新循环
          if (!containerRef.current) return;

          // 标记滚轮操作中
          isWheelingRef.current = true;

          // 根据滚轮方向计算滚动偏移
          // deltaY: 垂直滚动，deltaX: 水平滚动（或 Shift+滚轮）
          const scrollSpeed = 1.25;
          containerRef.current.scrollLeft += e.deltaX * scrollSpeed;
          containerRef.current.scrollTop += e.deltaY * scrollSpeed;

          // 清除之前的 timeout
          if (wheelTimeoutRef.current) {
            window.clearTimeout(wheelTimeoutRef.current);
          }

          // 滚轮结束后延迟同步状态（用于方向控制环等 UI 同步）
          wheelTimeoutRef.current = window.setTimeout(() => {
            isWheelingRef.current = false;
            // 最后一次同步状态
            if (containerRef.current) {
              onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
            }
          }, 150);
        }
      },
      [scale, onScaleChange, onOffsetChange]
    );

    // ===== 滚动同步 =====

    /**
     * 滚动位置变化时同步到状态
     * 拖拽或滚轮期间跳过，避免与直接 DOM 操作冲突
     */
    const handleScroll = useCallback(() => {
      if (!containerRef.current) return;
      // if (isDraggingRef.current || isWheelingRef.current) return;
      onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
    }, [onOffsetChange]);

    /**
     * 状态变化时同步滚动位置
     */
    useEffect(() => {
      if (!containerRef.current) return;
      if (containerRef.current.scrollLeft !== offsetX) {
        containerRef.current.scrollLeft = offsetX;
      }
      if (containerRef.current.scrollTop !== offsetY) {
        containerRef.current.scrollTop = offsetY;
      }
    }, [offsetX, offsetY]);

    /**
     * 原生滚轮事件监听 - 确保 preventDefault 生效
     * 需要 passive: false 才能阻止默认滚动行为
     */
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleNativeWheel = (e: WheelEvent) => {
        // 处理所有滚轮事件：Ctrl+滚轮缩放，普通滚轮平移
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        } else {
          // 普通滚轮也由 React 事件处理，这里只阻止默认行为
          e.preventDefault();
        }
      };

      container.addEventListener('wheel', handleNativeWheel, { passive: false });

      return () => {
        container.removeEventListener('wheel', handleNativeWheel);
      };
    }, []);

    /**
     * 清理滚轮 timeout
     */
    useEffect(() => {
      return () => {
        if (wheelTimeoutRef.current) {
          window.clearTimeout(wheelTimeoutRef.current);
        }
      };
    }, []);

    /**
     * 键盘事件处理
     * - ESC: 取消绘制
     * - Shift: 约束模式（正方形/角度）
     * - Ctrl/Cmd: 中心绘制模式
     * - Backspace: 删除上一个顶点（多边形模式）
     */
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // ESC 取消绘制
        if (e.key === 'Escape' && isDrawing) {
          e.preventDefault();
          setIsDrawing(false);
          setDrawingPoints([]);
          rectStartPointRef.current = null;
        }

        // Shift 键按下
        if (e.key === 'Shift' && !isShiftPressed) {
          setIsShiftPressed(true);
          onShiftPressedChange?.(true);
        }

        // Ctrl/Cmd 键按下
        if ((e.key === 'Control' || e.key === 'Meta') && !isCtrlPressed) {
          setIsCtrlPressed(true);
          onCtrlPressedChange?.(true);
        }

        // Backspace 删除上一个顶点（多边形模式）
        if (e.key === 'Backspace' && isDrawing && activeTool === 'polygon') {
          e.preventDefault();
          if (drawingPoints.length > 1) {
            const newPoints = drawingPoints.slice(0, -1);
            setDrawingPoints(newPoints);
          } else if (drawingPoints.length === 1) {
            // 只剩一个点时取消绘制
            setIsDrawing(false);
            setDrawingPoints([]);
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift') {
          setIsShiftPressed(false);
          onShiftPressedChange?.(false);
        }
        if (e.key === 'Control' || e.key === 'Meta') {
          setIsCtrlPressed(false);
          onCtrlPressedChange?.(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, [isDrawing, activeTool, drawingPoints, isShiftPressed, isCtrlPressed, setIsDrawing, setDrawingPoints, onShiftPressedChange, onCtrlPressedChange]);

    /**
     * 右键取消绘制
     */
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
      if (isDrawing) {
        e.preventDefault();
        setIsDrawing(false);
        setDrawingPoints([]);
        rectStartPointRef.current = null;
      }
    }, [isDrawing, setIsDrawing, setDrawingPoints]);

    // ===== 渲染 =====

    return (
      // 外层可滚动的容器
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-auto scrollbar-hidden"
        tabIndex={-1}
        style={{ cursor: cursorStyle }}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {/* SVG 画布容器 - 与 seats.io 一致：width/height 固定，缩放由 SVG 内部 transform 处理 */}
        <div
          style={{
            width: CANVAS_CONFIG.WORLD_SIZE,
            height: CANVAS_CONFIG.WORLD_SIZE,
            position: 'relative',
          }}
          tabIndex={-1}
        >
          {/* SVG 渲染内容 - 绝对定位覆盖整个容器 */}
          {children}
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';
