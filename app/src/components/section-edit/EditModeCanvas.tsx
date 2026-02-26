/**
 * EditModeCanvas - 区域编辑模式画布
 * 用于绘制和编辑座位
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { CANVAS_CONFIG } from '@/types';
import { getBoundingBox, isPointInBox } from '@/utils/selection';
import { getAngle } from '@/utils/coordinate';
import type { Section, CalibrationData, Seat, Point, SectionEditTool, BoundingBox } from '@/types';

const WORLD_SIZE = CANVAS_CONFIG.WORLD_SIZE;
const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.03;

const SVG_IMAGE_SIZE = 800;
const SVG_IMAGE_OFFSET = 400;

export interface EditModeCanvasProps {
  /** 正在编辑的区域 */
  section: Section;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 校准数据 */
  calibration: CalibrationData;
  /** 当前工具 */
  currentTool: SectionEditTool;
  /** 区域内的座位 */
  seats: Seat[];
  /** 选中的座位 ID */
  selectedSeatIds: Set<string>;
  /** 缩放变化 */
  onScaleChange: (scale: number) => void;
  /** 添加座位 */
  onAddSeats: (seats: Seat[]) => void;
  /** 更新座位 */
  onUpdateSeats: (seats: Seat[]) => void;
  /** 删除座位 */
  onDeleteSeats: (seatIds: string[]) => void;
  /** 选择座位 */
  onSelectSeats: (seatIds: string[]) => void;
  /** 工具切换 */
  onToolChange: (tool: SectionEditTool) => void;
}

export const EditModeCanvas: React.FC<EditModeCanvasProps> = ({
  section,
  svgUrl,
  calibration,
  currentTool,
  seats,
  selectedSeatIds,
  onScaleChange,
  onAddSeats,
  onUpdateSeats,
  onDeleteSeats,
  onSelectSeats,
  onToolChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // 绘制状态
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // 矩阵工具两步绘制状态
  const [matrixFirstRow, setMatrixFirstRow] = useState<Seat[] | null>(null); // 第一步绘制的第一排座位

  // 拖拽座位状态
  const [draggingSeatIds, setDraggingSeatIds] = useState<string[]>([]);
  const [dragStartWorld, setDragStartWorld] = useState<Point | null>(null);
  const [dragCurrentWorld, setDragCurrentWorld] = useState<Point | null>(null);

  // 框选状态
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point | null>(null);
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<Point | null>(null);

  // 旋转状态
  const [isRotating, setIsRotating] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [rotationCenter, setRotationCenter] = useState<Point | null>(null);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const originalSeatsRef = useRef<Seat[]>([]);

  const { canvasScale, seatVisual } = calibration;
  
  const pointsString = useMemo(
    () => section.points.map((p) => `${p.x},${p.y}`).join(' '),
    [section.points]
  );

  const clipPathId = `section-clip-${section.id}`;
  const maskId = `section-mask-${section.id}`;

  /** 计算选中座位的边界框 */
  const selectedSeatsBbox = useMemo((): BoundingBox | null => {
    if (selectedSeatIds.size === 0) return null;
    
    const selectedSeats = seats.filter((s) => selectedSeatIds.has(s.id));
    if (selectedSeats.length === 0) return null;
    
    const seatPoints = selectedSeats.map((s) => ({ x: s.x, y: s.y }));
    return getBoundingBox(seatPoints);
  }, [selectedSeatIds, seats]);

  /** 屏幕坐标转世界坐标 */
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const viewportX = screenX - rect.left + container.scrollLeft;
    const viewportY = screenY - rect.top + container.scrollTop;

    const worldX = (viewportX - (1 - canvasScale) * WORLD_CENTER) / canvasScale;
    const worldY = (viewportY - (1 - canvasScale) * WORLD_CENTER) / canvasScale;

    return { x: worldX, y: worldY };
  }, [canvasScale]);

  /** 计算两点之间的距离 */
  const getDistance = useCallback((p1: Point, p2: Point): number => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }, []);

  /** 获取座位所属的组 ID */
  const getGroupId = useCallback((seatId: string): string | null => {
    // 匹配单排格式: seat-group-123-0
    // 匹配矩阵格式: seat-group-123-0-1
    const groupMatch = seatId.match(/^seat-(group-\d+)-/);
    return groupMatch ? groupMatch[1] : null;
  }, []);

  /** 获取组内所有座位 ID */
  const getGroupSeatIds = useCallback((groupId: string): string[] => {
    return seats
      .filter((s) => s.id.includes(groupId))
      .map((s) => s.id);
  }, [seats]);

  /** 扩展选择：将单个座位 ID 扩展为整组座位 ID */
  const expandToGroups = useCallback((seatIds: string[]): string[] => {
    const groupIds = new Set<string>();
    const allSelectedIds = new Set<string>();

    // 收集所有涉及的组 ID
    seatIds.forEach((seatId) => {
      const groupId = getGroupId(seatId);
      if (groupId) {
        groupIds.add(groupId);
      } else {
        // 非组座位直接添加
        allSelectedIds.add(seatId);
      }
    });

    // 添加所有组内的座位
    groupIds.forEach((groupId) => {
      getGroupSeatIds(groupId).forEach((id) => allSelectedIds.add(id));
    });

    return Array.from(allSelectedIds);
  }, [getGroupId, getGroupSeatIds]);

  /** 检测是否点击旋转手柄 */
  const isClickOnRotationHandle = useCallback((worldPos: Point, bbox: BoundingBox): boolean => {
    const centerX = (bbox.minX + bbox.maxX) / 2;
    const handleY = bbox.minY - 20 / canvasScale;
    const handleRadius = 10 / canvasScale;
    
    const dx = worldPos.x - centerX;
    const dy = worldPos.y - handleY;
    return Math.sqrt(dx * dx + dy * dy) <= handleRadius;
  }, [canvasScale]);

  /** 检测是否点击边界框内部 */
  const isClickInBbox = useCallback((worldPos: Point, bbox: BoundingBox): boolean => {
    return isPointInBox(worldPos, bbox);
  }, []);

  /** 开始绘制矩阵、单排、框选、旋转或拖拽 */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSpacePressed && containerRef.current) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollX: containerRef.current.scrollLeft,
        scrollY: containerRef.current.scrollTop,
      };
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (currentTool === 'matrix') {
      if (!matrixFirstRow) {
        // 第一步：开始绘制第一排
        setDrawStart(worldPos);
        setDrawCurrent(worldPos);
        setIsDrawing(true);
      } else {
        // 第二步：开始垂直方向扩展
        setDrawStart(worldPos);
        setDrawCurrent(worldPos);
        setIsDrawing(true);
      }
    } else if (currentTool === 'single-row') {
      setDrawStart(worldPos);
      setDrawCurrent(worldPos);
      setIsDrawing(true);
    } else if (currentTool === 'select') {
      // 检查是否点击旋转手柄
      if (selectedSeatsBbox && isClickOnRotationHandle(worldPos, selectedSeatsBbox)) {
        const centerX = (selectedSeatsBbox.minX + selectedSeatsBbox.maxX) / 2;
        const centerY = (selectedSeatsBbox.minY + selectedSeatsBbox.maxY) / 2;
        setIsRotating(true);
        setRotationCenter({ x: centerX, y: centerY });
        setRotationStartAngle(getAngle({ x: centerX, y: centerY }, worldPos));
        setRotationAngle(0);
        originalSeatsRef.current = seats.filter((s) => selectedSeatIds.has(s.id));
        return;
      }
      
      // 开始框选（座位的拖拽在 handleSeatMouseDown 中处理）
      setSelectionBoxStart(worldPos);
      setSelectionBoxCurrent(worldPos);
    }
  }, [isSpacePressed, currentTool, screenToWorld, selectedSeatsBbox, selectedSeatIds, seats, isClickOnRotationHandle, isClickInBbox]);

  /** 拖拽绘制、移动或旋转 */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      containerRef.current.scrollLeft = panStartRef.current.scrollX - dx;
      containerRef.current.scrollTop = panStartRef.current.scrollY - dy;
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (isRotating && rotationCenter) {
      const currentAngle = getAngle(rotationCenter, worldPos);
      const angleDelta = currentAngle - rotationStartAngle;
      setRotationAngle(angleDelta);
    } else if (isDrawing && drawStart) {
      setDrawCurrent(worldPos);
    } else if (draggingSeatIds.length > 0 && dragStartWorld) {
      setDragCurrentWorld(worldPos);
    } else if (selectionBoxStart) {
      setSelectionBoxCurrent(worldPos);
    }
  }, [isRotating, rotationCenter, rotationStartAngle, isDrawing, drawStart, draggingSeatIds, dragStartWorld, selectionBoxStart, screenToWorld]);

  /** 旋转座位 */
  const rotateSeat = useCallback((seat: Seat, center: Point, angle: number): Seat => {
    const rad = angle * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const dx = seat.x - center.x;
    const dy = seat.y - center.y;
    
    return {
      ...seat,
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
      angle: seat.angle + angle,
    };
  }, []);

  /** 完成绘制矩阵、单排座位、座位拖拽、旋转或框选 */
  const handleMouseUp = useCallback(() => {
    if (isRotating && rotationCenter) {
      // 完成旋转
      const rotatedSeats = originalSeatsRef.current.map((seat) =>
        rotateSeat(seat, rotationCenter, rotationAngle)
      );
      onUpdateSeats(rotatedSeats);
      
      setIsRotating(false);
      setRotationAngle(0);
      setRotationCenter(null);
      originalSeatsRef.current = [];
      return;
    }
    
    if (isDrawing && drawStart && drawCurrent && currentTool === 'single-row') {
      const distance = getDistance(drawStart, drawCurrent);
      const cellWidth = seatVisual.size + seatVisual.gapX;
      const seatCount = Math.max(1, Math.round(distance / cellWidth));
      
      if (seatCount > 0) {
        const dx = drawCurrent.x - drawStart.x;
        const dy = drawCurrent.y - drawStart.y;
        const angle = Math.atan2(dy, dx);
        
        const groupId = `group-${Date.now()}`;
        const newSeats: Seat[] = [];
        for (let i = 0; i < seatCount; i++) {
          const t = seatCount === 1 ? 0 : i / (seatCount - 1);
          newSeats.push({
            id: `seat-${groupId}-${i}`,
            x: drawStart.x + dx * t,
            y: drawStart.y + dy * t,
            row: 'A',
            number: i + 1,
            type: 'normal',
            angle: (angle * 180 / Math.PI),
          });
        }
        onAddSeats(newSeats);
      }
    } else if (isDrawing && drawStart && drawCurrent && currentTool === 'matrix') {
      if (!matrixFirstRow) {
        // 第一步完成：绘制第一排座位
        const distance = getDistance(drawStart, drawCurrent);
        const cellWidth = seatVisual.size + seatVisual.gapX;
        const seatCount = Math.max(1, Math.round(distance / cellWidth));
        
        if (seatCount > 0) {
          const dx = drawCurrent.x - drawStart.x;
          const dy = drawCurrent.y - drawStart.y;
          const angle = Math.atan2(dy, dx);
          
          const groupId = `group-${Date.now()}`;
          const firstRowSeats: Seat[] = [];
          for (let i = 0; i < seatCount; i++) {
            const t = seatCount === 1 ? 0 : i / (seatCount - 1);
            firstRowSeats.push({
              id: `seat-${groupId}-0-${i}`,
              x: drawStart.x + dx * t,
              y: drawStart.y + dy * t,
              row: 'A',
              number: i + 1,
              type: 'normal',
              angle: (angle * 180 / Math.PI),
            });
          }
          
          // 保存第一排座位，进入第二步
          setMatrixFirstRow(firstRowSeats);
          onAddSeats(firstRowSeats);
        }
      } else {
        // 第二步完成：垂直方向扩展为矩阵
        // 计算垂直方向的行数
        const firstSeat = matrixFirstRow[0];
        const lastSeat = matrixFirstRow[matrixFirstRow.length - 1];
        
        // 计算第一排的方向向量
        const rowDx = lastSeat.x - firstSeat.x;
        const rowDy = lastSeat.y - firstSeat.y;
        const rowLength = Math.sqrt(rowDx * rowDx + rowDy * rowDy);
        const rowUnitX = rowDx / rowLength;
        const rowUnitY = rowDy / rowLength;
        
        // 垂直方向单位向量（逆时针旋转90度）
        const perpUnitX = -rowUnitY;
        const perpUnitY = rowUnitX;
        
        // 计算拖拽点到第一排的垂直距离
        const dragDx = drawCurrent.x - firstSeat.x;
        const dragDy = drawCurrent.y - firstSeat.y;
        const perpDistance = Math.abs(dragDx * perpUnitX + dragDy * perpUnitY);
        
        // 根据垂直距离计算行数
        const cellHeight = seatVisual.size + seatVisual.gapY;
        const rowCount = Math.max(1, Math.round(perpDistance / cellHeight));
        
        if (rowCount > 1) {
          // 生成多排座位
          const allSeats: Seat[] = [...matrixFirstRow];
          const groupId = matrixFirstRow[0].id.match(/seat-(group-\d+)-/)?.[1] || `group-${Date.now()}`;
          
          for (let r = 1; r < rowCount; r++) {
            for (let c = 0; c < matrixFirstRow.length; c++) {
              const baseSeat = matrixFirstRow[c];
              allSeats.push({
                id: `seat-${groupId}-${r}-${c}`,
                x: baseSeat.x + perpUnitX * cellHeight * r,
                y: baseSeat.y + perpUnitY * cellHeight * r,
                row: String.fromCharCode(65 + r),
                number: c + 1,
                type: 'normal',
                angle: baseSeat.angle,
              });
            }
          }
          
          // 添加新的行（第一排已经添加过了）
          onAddSeats(allSeats.slice(matrixFirstRow.length));
        }
        
        // 重置矩阵绘制状态
        setMatrixFirstRow(null);
      }
    } else if (draggingSeatIds.length > 0 && dragStartWorld && dragCurrentWorld) {
      const dx = dragCurrentWorld.x - dragStartWorld.x;
      const dy = dragCurrentWorld.y - dragStartWorld.y;
      
      const updatedSeats = seats
        .filter((s) => draggingSeatIds.includes(s.id))
        .map((s) => ({
          ...s,
          x: s.x + dx,
          y: s.y + dy,
        }));
      
      onUpdateSeats(updatedSeats);
    } else if (selectionBoxStart && selectionBoxCurrent && currentTool === 'select') {
      const minX = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
      const minY = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
      const maxX = Math.max(selectionBoxStart.x, selectionBoxCurrent.x);
      const maxY = Math.max(selectionBoxStart.y, selectionBoxCurrent.y);
      
      // 找到框选范围内的座位
      const seatsInBox = seats
        .filter((s) => s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY)
        .map((s) => s.id);
      
      // 扩展为整组
      const expandedIds = expandToGroups(seatsInBox);
      
      onSelectSeats(expandedIds);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setDraggingSeatIds([]);
    setDragStartWorld(null);
    setDragCurrentWorld(null);
    setSelectionBoxStart(null);
    setSelectionBoxCurrent(null);
    isPanningRef.current = false;
    panStartRef.current = null;
  }, [
    isRotating,
    rotationCenter,
    rotationAngle,
    rotateSeat,
    onUpdateSeats,
    isDrawing,
    drawStart,
    drawCurrent,
    currentTool,
    seatVisual,
    draggingSeatIds,
    dragStartWorld,
    dragCurrentWorld,
    selectionBoxStart,
    selectionBoxCurrent,
    seats,
    onAddSeats,
    onUpdateSeats,
    onSelectSeats,
    getDistance,
    expandToGroups,
  ]);

  /** 座位点击 */
  const handleSeatClick = useCallback((e: React.MouseEvent, seatId: string) => {
    if (currentTool !== 'select') return;
    
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+单击：切换组的选中状态
      const groupId = getGroupId(seatId);
      const groupSeatIds = groupId ? getGroupSeatIds(groupId) : [seatId];
      
      const newSelection = new Set(selectedSeatIds);
      const isGroupSelected = groupSeatIds.some((id) => newSelection.has(id));
      
      if (isGroupSelected) {
        // 取消选中整组
        groupSeatIds.forEach((id) => newSelection.delete(id));
      } else {
        // 选中整组
        groupSeatIds.forEach((id) => newSelection.add(id));
      }
      
      onSelectSeats(Array.from(newSelection));
    } else {
      // 单击：选中整组座位
      const expandedIds = expandToGroups([seatId]);
      onSelectSeats(expandedIds);
    }
  }, [currentTool, selectedSeatIds, getGroupId, getGroupSeatIds, expandToGroups, onSelectSeats]);

  /** 座位拖拽开始 */
  const handleSeatMouseDown = useCallback((e: React.MouseEvent, seatId: string) => {
    if (currentTool !== 'select') return;
    
    // 阻止事件冒泡到 canvas 的 handleMouseDown
    e.stopPropagation();
    
    // 只有当座位已经被选中时才允许拖拽
    if (selectedSeatIds.has(seatId)) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDraggingSeatIds(Array.from(selectedSeatIds));
      setDragStartWorld(worldPos);
      setDragCurrentWorld(worldPos);
      
      // 清除框选状态
      setSelectionBoxStart(null);
      setSelectionBoxCurrent(null);
    }
    // 如果座位未选中，不做任何操作（由 onClick 处理选择）
  }, [currentTool, selectedSeatIds, screenToWorld]);


  /** 滚轮缩放 */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, canvasScale * zoomFactor));

      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + container.scrollLeft;
        const mouseY = e.clientY - rect.top + container.scrollTop;

        const scaleFactor = newScale / canvasScale;
        const newScrollLeft = mouseX - (mouseX - container.scrollLeft) * scaleFactor;
        const newScrollTop = mouseY - (mouseY - container.scrollTop) * scaleFactor;

        onScaleChange(newScale);
        container.scrollLeft = Math.max(0, newScrollLeft);
        container.scrollTop = Math.max(0, newScrollTop);
      } else {
        onScaleChange(newScale);
      }
    }
  }, [canvasScale, onScaleChange]);

  /** 键盘监听 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.code === 'Escape') {
        // ESC 键：取消绘制或切换回选择工具
        if (isDrawing) {
          e.preventDefault();
          setIsDrawing(false);
          setDrawStart(null);
          setDrawCurrent(null);
        }
        // 如果矩阵工具处于第二步，取消并回到第一步
        if (matrixFirstRow) {
          e.preventDefault();
          // 删除第一排座位
          onDeleteSeats(matrixFirstRow.map(s => s.id));
          setMatrixFirstRow(null);
        }
        if (currentTool !== 'select') {
          e.preventDefault();
          onToolChange('select');
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedSeatIds.size > 0) {
          e.preventDefault();
          onDeleteSeats(Array.from(selectedSeatIds));
        }
      } else if (e.code === 'KeyV') {
        onToolChange('select');
      } else if (e.code === 'Digit1') {
        onToolChange('single-row');
      } else if (e.code === 'Digit2') {
        onToolChange('matrix');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        isPanningRef.current = false;
        panStartRef.current = null;
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [selectedSeatIds, onDeleteSeats, onToolChange, currentTool, isDrawing, matrixFirstRow]);

  /** 工具切换时重置矩阵状态 */
  useEffect(() => {
    if (currentTool !== 'matrix' && matrixFirstRow) {
      // 切换到其他工具时，删除第一排座位并重置状态
      onDeleteSeats(matrixFirstRow.map(s => s.id));
      setMatrixFirstRow(null);
    }
  }, [currentTool, matrixFirstRow, onDeleteSeats]);

  /** 阻止默认滚轮行为 */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, []);

  /** 首次挂载时居中区域 */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !section.points.length) return;

    const bounds = getBoundingBox(section.points);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const rect = container.getBoundingClientRect();
    const offsetX = centerX * canvasScale + (1 - canvasScale) * WORLD_CENTER - rect.width / 2;
    const offsetY = centerY * canvasScale + (1 - canvasScale) * WORLD_CENTER - rect.height / 2;

    container.scrollLeft = Math.max(0, offsetX);
    container.scrollTop = Math.max(0, offsetY);
  }, [section.id]);

  const worldLayerTransform = `matrix(${canvasScale}, 0, 0, ${canvasScale}, ${(1 - canvasScale) * WORLD_CENTER}, ${(1 - canvasScale) * WORLD_CENTER})`;

  // 计算矩阵预览（两步绘制）
  const matrixPreview = useMemo(() => {
    if (!isDrawing || !drawStart || !drawCurrent || currentTool !== 'matrix') {
      return null;
    }

    if (!matrixFirstRow) {
      // 第一步：预览第一排座位（类似单排工具）
      const distance = getDistance(drawStart, drawCurrent);
      const cellWidth = seatVisual.size + seatVisual.gapX;
      const seatCount = Math.max(1, Math.round(distance / cellWidth));
      
      const dx = drawCurrent.x - drawStart.x;
      const dy = drawCurrent.y - drawStart.y;
      const angle = Math.atan2(dy, dx);
      
      const previewSeats: Point[] = [];
      for (let i = 0; i < seatCount; i++) {
        const t = seatCount === 1 ? 0 : i / (seatCount - 1);
        previewSeats.push({
          x: drawStart.x + dx * t,
          y: drawStart.y + dy * t,
        });
      }
      
      return {
        step: 1,
        seats: previewSeats,
        count: seatCount,
        angle: angle * 180 / Math.PI,
        midPoint: {
          x: (drawStart.x + drawCurrent.x) / 2,
          y: (drawStart.y + drawCurrent.y) / 2,
        },
      };
    } else {
      // 第二步：预览垂直扩展的矩阵
      const firstSeat = matrixFirstRow[0];
      const lastSeat = matrixFirstRow[matrixFirstRow.length - 1];
      
      // 计算第一排的方向向量
      const rowDx = lastSeat.x - firstSeat.x;
      const rowDy = lastSeat.y - firstSeat.y;
      const rowLength = Math.sqrt(rowDx * rowDx + rowDy * rowDy);
      const rowUnitX = rowDx / rowLength;
      const rowUnitY = rowDy / rowLength;
      
      // 垂直方向单位向量
      const perpUnitX = -rowUnitY;
      const perpUnitY = rowUnitX;
      
      // 计算垂直距离和行数
      const dragDx = drawCurrent.x - firstSeat.x;
      const dragDy = drawCurrent.y - firstSeat.y;
      const perpDistance = Math.abs(dragDx * perpUnitX + dragDy * perpUnitY);
      
      const cellHeight = seatVisual.size + seatVisual.gapY;
      const rowCount = Math.max(1, Math.round(perpDistance / cellHeight));
      
      // 生成预览座位
      const previewSeats: Array<{ x: number; y: number; row: number; col: number }> = [];
      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < matrixFirstRow.length; c++) {
          const baseSeat = matrixFirstRow[c];
          previewSeats.push({
            x: baseSeat.x + perpUnitX * cellHeight * r,
            y: baseSeat.y + perpUnitY * cellHeight * r,
            row: r,
            col: c,
          });
        }
      }
      
      return {
        step: 2,
        seats: previewSeats,
        rows: rowCount,
        cols: matrixFirstRow.length,
        angle: matrixFirstRow[0].angle,
      };
    }
  }, [isDrawing, drawStart, drawCurrent, currentTool, seatVisual, matrixFirstRow]);

  // 计算单排座位预览
  const singleRowPreview = useMemo(() => {
    if (!isDrawing || !drawStart || !drawCurrent || currentTool !== 'single-row') {
      return null;
    }

    const dx = drawCurrent.x - drawStart.x;
    const dy = drawCurrent.y - drawStart.y;
    const distance = Math.hypot(dx, dy);
    const cellWidth = seatVisual.size + seatVisual.gapX;
    const seatCount = Math.max(1, Math.round(distance / cellWidth));
    const angle = Math.atan2(dy, dx);

    const previewSeats: Point[] = [];
    for (let i = 0; i < seatCount; i++) {
      const t = seatCount === 1 ? 0 : i / (seatCount - 1);
      previewSeats.push({
        x: drawStart.x + dx * t,
        y: drawStart.y + dy * t,
      });
    }

    return {
      seats: previewSeats,
      count: seatCount,
      angle: angle * 180 / Math.PI,
      midPoint: {
        x: (drawStart.x + drawCurrent.x) / 2,
        y: (drawStart.y + drawCurrent.y) / 2,
      },
    };
  }, [isDrawing, drawStart, drawCurrent, currentTool, seatVisual]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-gray-100 relative"
      style={{
        cursor: isSpacePressed ? 'grab' : (currentTool === 'matrix' || currentTool === 'single-row') ? 'crosshair' : 'default',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      tabIndex={-1}
    >
      <div
        style={{
          width: WORLD_SIZE,
          height: WORLD_SIZE,
          position: 'relative',
          minWidth: WORLD_SIZE,
          minHeight: WORLD_SIZE,
        }}
      >
        <svg
          ref={svgRef}
          width={WORLD_SIZE}
          height={WORLD_SIZE}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'visible',
          }}
        >
          <defs>
            <clipPath id={clipPathId}>
              <polygon points={pointsString} />
            </clipPath>
            <mask id={maskId}>
              <rect x={0} y={0} width={WORLD_SIZE} height={WORLD_SIZE} fill="white" />
              <polygon points={pointsString} fill="black" />
            </mask>
          </defs>

          <g transform={worldLayerTransform}>
            {/* 1. 完整底图背景 */}
            {svgUrl && (
              <image
                href={svgUrl}
                x={WORLD_CENTER - SVG_IMAGE_OFFSET}
                y={WORLD_CENTER - SVG_IMAGE_OFFSET}
                width={SVG_IMAGE_SIZE}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.7}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* 2. 区域高亮层 */}
            {svgUrl && (
              <g clipPath={`url(#${clipPathId})`}>
                <image
                  href={svgUrl}
                  x={WORLD_CENTER - SVG_IMAGE_OFFSET}
                  y={WORLD_CENTER - SVG_IMAGE_OFFSET}
                  width={SVG_IMAGE_SIZE}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={0.8}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )}

            {/* 3. 区域外遮罩 */}
            <rect
              x={0}
              y={0}
              width={WORLD_SIZE}
              height={WORLD_SIZE}
              fill="black"
              opacity={0.3}
              mask={`url(#${maskId})`}
              style={{ pointerEvents: 'none' }}
            />

            {/* 4. 区域边框 */}
            <polygon
              points={pointsString}
              fill="rgba(0,0,0,0.001)"
              stroke={section.color}
              strokeWidth={2 / canvasScale}
              strokeDasharray="5,5"
              style={{ pointerEvents: 'none' }}
            />

            {/* 5. 座位渲染 */}
            {seats.map((seat) => {
              const isSelected = selectedSeatIds.has(seat.id);
              const isDragging = draggingSeatIds.includes(seat.id);
              const isRotatingSeat = isRotating && isSelected;
              
              let displayX = seat.x;
              let displayY = seat.y;
              let displayAngle = seat.angle;
              
              if (isRotatingSeat && rotationCenter) {
                // 旋转状态：计算旋转后的位置
                const rotatedSeat = rotateSeat(seat, rotationCenter, rotationAngle);
                displayX = rotatedSeat.x;
                displayY = rotatedSeat.y;
                displayAngle = rotatedSeat.angle;
              } else if (isDragging && dragStartWorld && dragCurrentWorld) {
                // 拖拽状态：计算偏移后的位置
                const dx = dragCurrentWorld.x - dragStartWorld.x;
                const dy = dragCurrentWorld.y - dragStartWorld.y;
                displayX = seat.x + dx;
                displayY = seat.y + dy;
              }
              
              return (
                <g
                  key={seat.id}
                  transform={`translate(${displayX}, ${displayY}) rotate(${displayAngle})`}
                  onClick={(e) => handleSeatClick(e, seat.id)}
                  onMouseDown={(e) => handleSeatMouseDown(e, seat.id)}
                  style={{ cursor: currentTool === 'select' ? (isDragging || isRotatingSeat ? 'grabbing' : 'grab') : 'default' }}
                >
                  <rect
                    x={-seatVisual.size / 2}
                    y={-seatVisual.size / 2}
                    width={seatVisual.size}
                    height={seatVisual.size}
                    fill={seat.type === 'vip' ? '#fbbf24' : 'white'}
                    stroke={isSelected ? '#3b82f6' : section.color}
                    strokeWidth={isSelected ? 3 / canvasScale : 2 / canvasScale}
                    opacity={isDragging || isRotatingSeat ? 0.6 : 1}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(10, seatVisual.size * 0.4) / canvasScale}
                    fontWeight="bold"
                    fill={section.color}
                    style={{ pointerEvents: 'none' }}
                  >
                    {seat.number}
                  </text>
                </g>
              );
            })}

            {/* 6. 单排座位预览 */}
            {singleRowPreview && (
              <g>
                {/* 绘制连接线 */}
                <line
                  x1={drawStart!.x}
                  y1={drawStart!.y}
                  x2={drawCurrent!.x}
                  y2={drawCurrent!.y}
                  stroke="#3b82f6"
                  strokeWidth={2 / canvasScale}
                  strokeDasharray="5,5"
                />
                
                {/* 绘制预览座位（蓝色正方形） */}
                {singleRowPreview.seats.map((pos, i) => (
                  <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${singleRowPreview.angle})`}>
                    <rect
                      x={-seatVisual.size / 2}
                      y={-seatVisual.size / 2}
                      width={seatVisual.size}
                      height={seatVisual.size}
                      fill="rgba(59, 130, 246, 0.3)"
                      stroke="#3b82f6"
                      strokeWidth={2 / canvasScale}
                    />
                  </g>
                ))}
                
                {/* 显示座位数量标签（黑色方块） */}
                <g transform={`translate(${singleRowPreview.midPoint.x}, ${singleRowPreview.midPoint.y})`}>
                  <rect
                    x={-20 / canvasScale}
                    y={-15 / canvasScale}
                    width={40 / canvasScale}
                    height={30 / canvasScale}
                    fill="#1e293b"
                    rx={4 / canvasScale}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={16 / canvasScale}
                    fontWeight="bold"
                    fill="white"
                  >
                    {singleRowPreview.count}
                  </text>
                </g>
              </g>
            )}

            {/* 7. 矩阵绘制预览 */}
            {matrixPreview && matrixPreview.step === 1 && (
              <g>
                {/* 第一步：显示类似单排的预览 */}
                <line
                  x1={drawStart!.x}
                  y1={drawStart!.y}
                  x2={drawCurrent!.x}
                  y2={drawCurrent!.y}
                  stroke="#3b82f6"
                  strokeWidth={2 / canvasScale}
                  strokeDasharray="5,5"
                />
                
                {matrixPreview.seats.map((pos, i) => (
                  <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${matrixPreview.angle})`}>
                    <rect
                      x={-seatVisual.size / 2}
                      y={-seatVisual.size / 2}
                      width={seatVisual.size}
                      height={seatVisual.size}
                      fill="rgba(59, 130, 246, 0.3)"
                      stroke="#3b82f6"
                      strokeWidth={2 / canvasScale}
                    />
                  </g>
                ))}
                
                <g transform={`translate(${matrixPreview.midPoint?.x || 0}, ${matrixPreview.midPoint?.y || 0})`}>
                  <rect
                    x={-20 / canvasScale}
                    y={-15 / canvasScale}
                    width={40 / canvasScale}
                    height={30 / canvasScale}
                    fill="#1e293b"
                    rx={4 / canvasScale}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={16 / canvasScale}
                    fontWeight="bold"
                    fill="white"
                  >
                    {matrixPreview.count}
                  </text>
                </g>
              </g>
            )}
            
            {matrixPreview && matrixPreview.step === 2 && (
              <g>
                {/* 第二步：显示矩阵预览 */}
                {matrixPreview.seats.map((pos, i) => {
                  const seatPos = 'row' in pos ? pos : { x: pos.x, y: pos.y, row: 0, col: 0 };
                  return (
                    <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${matrixPreview.angle})`}>
                      <rect
                        x={-seatVisual.size / 2}
                        y={-seatVisual.size / 2}
                        width={seatVisual.size}
                        height={seatVisual.size}
                        fill={seatPos.row === 0 ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.3)"}
                        stroke="#3b82f6"
                        strokeWidth={2 / canvasScale}
                      />
                    </g>
                  );
                })}
                
                {/* 显示矩阵尺寸标签 */}
                <g transform={`translate(${matrixPreview.seats[0].x}, ${matrixPreview.seats[0].y - 30 / canvasScale})`}>
                  <rect
                    x={-40 / canvasScale}
                    y={-15 / canvasScale}
                    width={80 / canvasScale}
                    height={30 / canvasScale}
                    fill="#1e293b"
                    rx={4 / canvasScale}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={14 / canvasScale}
                    fontWeight="bold"
                    fill="white"
                  >
                    {matrixPreview.rows} × {matrixPreview.cols}
                  </text>
                </g>
              </g>
            )}

            {/* 8. 框选预览 */}
            {selectionBoxStart && selectionBoxCurrent && currentTool === 'select' && !isRotating && (
              <rect
                x={Math.min(selectionBoxStart.x, selectionBoxCurrent.x)}
                y={Math.min(selectionBoxStart.y, selectionBoxCurrent.y)}
                width={Math.abs(selectionBoxCurrent.x - selectionBoxStart.x)}
                height={Math.abs(selectionBoxCurrent.y - selectionBoxStart.y)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth={1 / canvasScale}
                strokeDasharray="3,3"
              />
            )}

            {/* 9. 选中座位的边界框和旋转手柄 */}
            {selectedSeatsBbox && currentTool === 'select' && !isDrawing && draggingSeatIds.length === 0 && !selectionBoxStart && (
              <g className="seat-bounding-box" style={{ pointerEvents: 'none' }}>
                {isRotating && rotationCenter ? (
                  // 旋转状态：边界框和手柄跟随旋转
                  <g transform={`rotate(${rotationAngle}, ${rotationCenter.x}, ${rotationCenter.y})`}>
                    {/* 边界框矩形 */}
                    <rect
                      x={selectedSeatsBbox.minX}
                      y={selectedSeatsBbox.minY}
                      width={selectedSeatsBbox.maxX - selectedSeatsBbox.minX}
                      height={selectedSeatsBbox.maxY - selectedSeatsBbox.minY}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={1 / canvasScale}
                      strokeDasharray={`${4 / canvasScale},${2 / canvasScale}`}
                      opacity={0.8}
                    />
                    
                    {/* 旋转手柄连接线 */}
                    <line
                      x1={rotationCenter.x}
                      y1={selectedSeatsBbox.minY}
                      x2={rotationCenter.x}
                      y2={selectedSeatsBbox.minY - 20 / canvasScale}
                      stroke="#3b82f6"
                      strokeWidth={1 / canvasScale}
                    />
                    
                    {/* 旋转手柄圆点 */}
                    <circle
                      cx={rotationCenter.x}
                      cy={selectedSeatsBbox.minY - 20 / canvasScale}
                      r={6 / canvasScale}
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth={2 / canvasScale}
                      style={{ pointerEvents: 'auto', cursor: 'grabbing' }}
                    />
                    
                    {/* 角度文本 */}
                    <text
                      x={rotationCenter.x}
                      y={selectedSeatsBbox.minY - 35 / canvasScale}
                      textAnchor="middle"
                      fontSize={12 / canvasScale}
                      fill="#3b82f6"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {Math.round(rotationAngle)}°
                    </text>
                  </g>
                ) : (
                  // 非旋转状态：正常显示
                  <>
                    {/* 边界框矩形 */}
                    <rect
                      x={selectedSeatsBbox.minX}
                      y={selectedSeatsBbox.minY}
                      width={selectedSeatsBbox.maxX - selectedSeatsBbox.minX}
                      height={selectedSeatsBbox.maxY - selectedSeatsBbox.minY}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={1 / canvasScale}
                      strokeDasharray={`${4 / canvasScale},${2 / canvasScale}`}
                    />
                    
                    {/* 旋转手柄连接线 */}
                    <line
                      x1={(selectedSeatsBbox.minX + selectedSeatsBbox.maxX) / 2}
                      y1={selectedSeatsBbox.minY}
                      x2={(selectedSeatsBbox.minX + selectedSeatsBbox.maxX) / 2}
                      y2={selectedSeatsBbox.minY - 20 / canvasScale}
                      stroke="#3b82f6"
                      strokeWidth={1 / canvasScale}
                    />
                    
                    {/* 旋转手柄圆点 */}
                    <circle
                      cx={(selectedSeatsBbox.minX + selectedSeatsBbox.maxX) / 2}
                      cy={selectedSeatsBbox.minY - 20 / canvasScale}
                      r={6 / canvasScale}
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth={2 / canvasScale}
                      style={{ pointerEvents: 'auto', cursor: 'grab' }}
                    />
                  </>
                )}
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
