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
import { CANVAS_CONFIG, type Point, type SnapResult, type Section, type BoundingBox } from '@/types';
import { screenToWorld, createRectanglePoints, getDistance, findSnapPoint, findAlignment, getAngle, rotatePolygon } from '@/utils/coordinate';
import { findElementAtPoint, findElementsInBox, createSelectionBox, getBoundingBox } from '@/utils/selection';

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
  /** 所有区域（用于选择） */
  sections?: Section[];
  /** 选中区域 ID 集合 */
  selectedIds?: Set<string>;
  /** 选中状态变化回调 */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** 框选状态变化回调 */
  onSelectionBoxChange?: (start: Point | null, end: Point | null) => void;
  /** 元素移动回调 - 实时预览 */
  onElementsMove?: (ids: Set<string>, dx: number, dy: number) => void;
  /** 元素移动结束回调 */
  onElementsMoveEnd?: () => void;
  /** 元素旋转回调 - 实时预览
   * @param ids 旋转的元素ID集合
   * @param center 旋转中心
   * @param angle 旋转角度（相对于起始位置的增量）
   * @param originalSections 旋转开始时的原始section数据（避免累积旋转）
   */
  onElementsRotate?: (ids: Set<string>, center: Point, angle: number, originalSections: Section[]) => void;
  /** 元素旋转结束回调 */
  onElementsRotateEnd?: () => void;
  /** 旋转手柄悬停回调 */
  onRotationHandleHover?: (isHovered: boolean) => void;
}

/**
 * 画布组件 - 支持区域绘制
 */
export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  ({ scale, offsetX, offsetY, isSpacePressed, activeTool, onScaleChange, onOffsetChange, children, isDrawing: externalIsDrawing, drawingPoints: externalDrawingPoints, onDrawingPointsChange, onDrawingComplete, onDrawingStateChange, allVertices = [], showGrid = false, gridSize = 50, onMousePositionChange, onSnapResultChange, onShiftPressedChange, onCtrlPressedChange, sections = [], selectedIds: externalSelectedIds, onSelectionChange, onSelectionBoxChange, onElementsMove, onElementsMoveEnd, onElementsRotate, onElementsRotateEnd, onRotationHandleHover }, ref) => {
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

    // ===== 选择工具状态 =====
    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
    const selectedIds = externalSelectedIds ?? internalSelectedIds;
    const setSelectedIds = useCallback((ids: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      if (typeof ids === 'function') {
        // 处理回调函数形式
        if (externalSelectedIds === undefined) {
          setInternalSelectedIds(prev => {
            const newIds = ids(prev);
            onSelectionChange?.(newIds);
            return newIds;
          });
        } else {
          const newIds = ids(externalSelectedIds);
          onSelectionChange?.(newIds);
        }
      } else {
        // 处理直接值形式
        if (externalSelectedIds === undefined) {
          setInternalSelectedIds(ids);
        }
        onSelectionChange?.(ids);
      }
    }, [externalSelectedIds, onSelectionChange]);

    const isBoxSelectingRef = useRef(false);
    const boxStartRef = useRef<Point | null>(null);
    const boxEndRef = useRef<Point | null>(null);

    // ===== 元素拖拽状态 =====
    const isDraggingElementRef = useRef(false);
    const dragStartPointRef = useRef<Point | null>(null);
    const dragElementIdsRef = useRef<Set<string>>(new Set());
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [hoverElementId, setHoverElementId] = useState<string | null>(null);

    // ===== 旋转状态 =====
    const isRotatingRef = useRef(false);
    const rotationCenterRef = useRef<Point | null>(null);
    const rotationStartAngleRef = useRef<number>(0);
    const rotationCurrentAngleRef = useRef<number>(0);
    const rotationElementIdsRef = useRef<Set<string>>(new Set());
    const [isHoveringRotationHandle, setIsHoveringRotationHandle] = useState(false);
    const [rotationAngle, setRotationAngle] = useState<number>(0);
    const [isRotating, setIsRotating] = useState(false);
    // 旋转开始时的初始边界框（用于旋转过程中显示参考）
    const [initialRotationBbox, setInitialRotationBbox] = useState<BoundingBox | null>(null);
    // 旋转开始时保存的原始 section 数据（避免累积旋转）
    const originalSectionsRef = useRef<Section[]>([]);

    // 更新光标样式
    useEffect(() => {
      if (isPanningRef.current) {
        setCursorStyle('grabbing');
      } else if (isDraggingElementRef.current) {
        setCursorStyle('grabbing');
      } else if (isRotatingRef.current) {
        setCursorStyle('grabbing');
      } else if (isSpacePressed || isHandToolActive) {
        setCursorStyle('grab');
      } else if (activeTool === 'section' || activeTool === 'polygon') {
        setCursorStyle('crosshair');
      } else if (activeTool === 'select') {
        if (isBoxSelectingRef.current) {
          setCursorStyle('crosshair');
        } else if (isHoveringRotationHandle) {
          setCursorStyle('grab');
        } else if (hoverElementId && selectedIds.has(hoverElementId)) {
          setCursorStyle('grab');
        } else if (hoverElementId) {
          setCursorStyle('move');
        } else {
          setCursorStyle('default');
        }
      } else {
        setCursorStyle('default');
      }
    }, [isSpacePressed, isHandToolActive, activeTool, hoverElementId, selectedIds, isHoveringRotationHandle]);

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

        // 选择工具模式
        if (activeTool === 'select') {
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

          // 如果有选中元素，检测是否点击了旋转手柄
          if (selectedIds.size > 0) {
            const selectedSections = sections.filter((s) => selectedIds.has(s.id));
            if (selectedSections.length > 0) {
              // 计算整体边界框的中心和旋转手柄位置
              const bboxes = selectedSections.map(s => getBoundingBox(s.points));
              const minX = Math.min(...bboxes.map(b => b.minX));
              const minY = Math.min(...bboxes.map(b => b.minY));
              const maxX = Math.max(...bboxes.map(b => b.maxX));
              const maxY = Math.max(...bboxes.map(b => b.maxY));
              const centerX = (minX + maxX) / 2;
              const handleY = minY - 20 / scale;
              const handleCenter = { x: centerX, y: handleY };

              // 检测点击旋转手柄（圆形区域，半径为 8px）
              const handleRadius = 8 / scale;
              const distanceToHandle = getDistance(worldPoint, handleCenter);

              if (distanceToHandle <= handleRadius) {
                // 点击了旋转手柄 - 开始旋转
                isRotatingRef.current = true;
                rotationCenterRef.current = { x: centerX, y: (minY + maxY) / 2 };
                rotationStartAngleRef.current = getAngle(rotationCenterRef.current, worldPoint);
                rotationCurrentAngleRef.current = 0;
                rotationElementIdsRef.current = new Set(selectedIds);
                // 记录旋转开始时的初始边界框和原始 section 数据
                setInitialRotationBbox({ minX, minY, maxX, maxY });
                originalSectionsRef.current = sections.map(s => ({ ...s, points: [...s.points] }));
                setIsRotating(true);
                setRotationAngle(0);
                return;
              }
            }
          }

          // 检测点击的元素
          const clickedId = findElementAtPoint(worldPoint, sections);

          if (clickedId) {
            // 点击了元素
            if (selectedIds.has(clickedId)) {
              // 点击已选中元素 - 开始拖拽
              isDraggingElementRef.current = true;
              setIsDraggingElement(true);
              dragStartPointRef.current = worldPoint;
              dragElementIdsRef.current = new Set(selectedIds);
              return;
            } else {
              // 点击未选中元素
              if (e.ctrlKey || e.metaKey) {
                // Ctrl/Cmd + 点击 - 添加到选择
                setSelectedIds(prev => {
                  const newSet = new Set(prev);
                  newSet.add(clickedId);
                  return newSet;
                });
              } else {
                // 单选模式 - 选中该元素
                setSelectedIds(new Set([clickedId]));
              }
              // 开始拖拽新选中的元素
              isDraggingElementRef.current = true;
              setIsDraggingElement(true);
              dragStartPointRef.current = worldPoint;
              dragElementIdsRef.current = new Set([clickedId]);
              return;
            }
          }

          // 点击空白处 - 开始框选
          boxStartRef.current = worldPoint;
          boxEndRef.current = worldPoint;
          isBoxSelectingRef.current = true;

          // 如果不是 Ctrl/Cmd 多选模式，清空当前选择
          if (!e.ctrlKey && !e.metaKey) {
            setSelectedIds(new Set());
          }
        }
      },
      [shouldPan, activeTool, isDrawing, drawingPoints, offsetX, offsetY, scale, setIsDrawing, setDrawingPoints, onDrawingComplete, setSelectedIds, selectedIds, sections]
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

        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const worldPoint = screenToWorld(e.clientX, e.clientY, containerRect, offsetX, offsetY, scale);

        // 元素拖拽中 - 更新位置
        if (isDraggingElementRef.current && dragStartPointRef.current && dragElementIdsRef.current.size > 0) {
          const dx = worldPoint.x - dragStartPointRef.current.x;
          const dy = worldPoint.y - dragStartPointRef.current.y;

          // 触发元素移动事件
          onElementsMove?.(dragElementIdsRef.current, dx, dy);

          // 更新拖拽起点为当前点，用于下一次增量计算
          dragStartPointRef.current = worldPoint;
          return;
        }

        // 旋转中 - 更新旋转角度
        if (isRotatingRef.current && rotationCenterRef.current) {
          const currentAngle = getAngle(rotationCenterRef.current, worldPoint);
          const deltaAngle = currentAngle - rotationStartAngleRef.current;

          // 更新当前旋转角度（累积）
          rotationCurrentAngleRef.current = deltaAngle;
          setRotationAngle(deltaAngle);

          // 触发旋转事件，传递原始 section 数据避免累积旋转
          onElementsRotate?.(rotationElementIdsRef.current, rotationCenterRef.current, deltaAngle, originalSectionsRef.current);
          return;
        }

        // 选择工具框选更新
        if (activeTool === 'select' && isBoxSelectingRef.current && boxStartRef.current) {
          boxEndRef.current = worldPoint;
          // 触发框选更新回调
          onSelectionBoxChange?.(boxStartRef.current, worldPoint);
          return;
        }

        // 选择工具：检测悬停元素
        if (activeTool === 'select' && !isDrawing && !isBoxSelectingRef.current) {
          const hoveredId = findElementAtPoint(worldPoint, sections);
          if (hoveredId !== hoverElementId) {
            setHoverElementId(hoveredId);
          }
        }

        // 更新鼠标位置并计算吸附
        if (activeTool === 'section' || activeTool === 'polygon') {
          // 计算吸附点（传入 scale 以确保容差在屏幕像素层面保持一致）
          const lastPoint = drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : null;
          const snap = findSnapPoint(worldPoint, {
            gridSize: showGrid ? gridSize : undefined,
            vertices: allVertices,
            angles:
              isShiftPressed && lastPoint
                ? [0, 45, 90, 135, 180, 225, 270, 315]
                : undefined,
            angleBase: lastPoint || undefined,
            scale, // 传递缩放比例，用于将屏幕像素容差转换为世界坐标容差
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
        hoverElementId,
        sections,
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

      // 元素拖拽结束
      if (isDraggingElementRef.current) {
        isDraggingElementRef.current = false;
        setIsDraggingElement(false);
        dragStartPointRef.current = null;
        dragElementIdsRef.current = new Set();
        onElementsMoveEnd?.();
      }

      // 旋转结束
      if (isRotatingRef.current) {
        isRotatingRef.current = false;
        rotationCenterRef.current = null;
        rotationStartAngleRef.current = 0;
        rotationCurrentAngleRef.current = 0;
        rotationElementIdsRef.current = new Set();
        originalSectionsRef.current = []; // 清除原始数据
        setIsRotating(false);
        setRotationAngle(0);
        // 清除初始边界框，让边界框根据旋转后的元素重新计算
        setInitialRotationBbox(null);
        onElementsRotateEnd?.();
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

      // 选择工具完成选择
      if (activeTool === 'select' && isBoxSelectingRef.current) {
        if (boxStartRef.current && boxEndRef.current) {
          const selectionBox = createSelectionBox(boxStartRef.current, boxEndRef.current);

          // 框选：找到与选择框相交的元素
          const selected = findElementsInBox(selectionBox, sections);
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            selected.forEach(id => newSet.add(id));
            return newSet;
          });
        }

        isBoxSelectingRef.current = false;
        boxStartRef.current = null;
        boxEndRef.current = null;
        onSelectionBoxChange?.(null, null);
      }
    }, [isSpacePressed, isHandToolActive, activeTool, isDrawing, drawingPoints, setIsDrawing, setDrawingPoints, onDrawingComplete, sections, setSelectedIds, onSelectionBoxChange, onElementsMoveEnd]);

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
     * - ESC: 取消绘制/清除选择
     * - Shift: 约束模式（正方形/角度）
     * - Ctrl/Cmd: 中心绘制模式
     * - Backspace: 删除上一个顶点（多边形模式）
     * - Ctrl+A: 全选
     * - Delete: 删除选中元素
     */
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // ESC 取消绘制或清除选择
        if (e.key === 'Escape') {
          if (isDrawing) {
            e.preventDefault();
            setIsDrawing(false);
            setDrawingPoints([]);
            rectStartPointRef.current = null;
          } else if (selectedIds.size > 0) {
            e.preventDefault();
            setSelectedIds(new Set());
          }
        }

        // Ctrl+A 全选
        if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const allIds = new Set(sections.map(s => s.id));
          setSelectedIds(allIds);
        }

        // Note: Delete 删除选中元素由父组件 App.tsx 处理
        // Canvas 只负责清空选择状态，不处理实际的 sections 删除

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
    }, [isDrawing, activeTool, drawingPoints, isShiftPressed, isCtrlPressed, selectedIds, sections, setIsDrawing, setDrawingPoints, setSelectedIds, onShiftPressedChange, onCtrlPressedChange, onSelectionChange]);

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
          {/* Clone children to pass props */}
          {React.Children.map(children, child =>
            React.isValidElement(child)
              ? React.cloneElement(child, {
                  hoverElementId,
                  isRotating,
                  rotationAngle,
                  initialRotationBbox,
                  isDraggingElement,
                  selectedIds,
                  sections,
                  onRotationHandleHover: (isHovered: boolean) => {
                    setIsHoveringRotationHandle(isHovered);
                    onRotationHandleHover?.(isHovered);
                  },
                } as Record<string, unknown>)
              : child
          )}
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';
