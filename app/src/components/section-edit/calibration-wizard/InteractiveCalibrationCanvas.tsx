/**
 * InteractiveCalibrationCanvas - 交互式校准画布
 * 支持点击放置座位、拖拽移动、右键删除
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { CANVAS_CONFIG } from '@/types';
import { getBoundingBox } from '@/utils/selection';
import type { Section, Point } from '@/types';
import type { PlacedCalibrationSeat } from '@/types/calibration';

const WORLD_SIZE = CANVAS_CONFIG.WORLD_SIZE;
const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.03;

const SVG_IMAGE_SIZE = 800;
const SVG_IMAGE_OFFSET = 400;

export interface InteractiveCalibrationCanvasProps {
  /** 正在编辑的区域 */
  section: Section;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 画布缩放 */
  canvasScale: number;
  /** 座位尺寸 */
  seatSize: number;
  /** 已放置的座位 */
  placedSeats: PlacedCalibrationSeat[];
  /** 是否允许放置座位 */
  canPlaceSeats: boolean;
  /** 缩放变化回调 */
  onScaleChange: (scale: number) => void;
  /** 添加座位 */
  onAddSeat: (seat: PlacedCalibrationSeat) => void;
  /** 移除座位 */
  onRemoveSeat: (seatId: string) => void;
  /** 更新座位位置 */
  onUpdateSeatPosition: (seatId: string, x: number, y: number) => void;
}

export const InteractiveCalibrationCanvas: React.FC<InteractiveCalibrationCanvasProps> = ({
  section,
  svgUrl,
  canvasScale,
  seatSize,
  placedSeats,
  canPlaceSeats,
  onScaleChange,
  onAddSeat,
  onRemoveSeat,
  onUpdateSeatPosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [draggingSeatId, setDraggingSeatId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);

  const pointsString = useMemo(
    () => section.points.map((p) => `${p.x},${p.y}`).join(' '),
    [section.points]
  );

  const clipPathId = `section-clip-${section.id}`;
  const maskId = `section-mask-${section.id}`;

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

  /** 点击画布放置座位 */
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!canPlaceSeats || isSpacePressed || draggingSeatId) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    const newSeat: PlacedCalibrationSeat = {
      id: `seat-${Date.now()}-${Math.random()}`,
      x: worldPos.x,
      y: worldPos.y,
    };

    onAddSeat(newSeat);
  }, [canPlaceSeats, isSpacePressed, draggingSeatId, screenToWorld, onAddSeat]);

  /** 开始拖拽座位 */
  const handleSeatMouseDown = useCallback((e: React.MouseEvent, seatId: string, seat: PlacedCalibrationSeat) => {
    if (isSpacePressed) return;
    
    e.stopPropagation();
    setDraggingSeatId(seatId);
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setDragOffset({
      x: worldPos.x - seat.x,
      y: worldPos.y - seat.y,
    });
  }, [isSpacePressed, screenToWorld]);

  /** 拖拽座位移动 */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingSeatId && dragOffset) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      onUpdateSeatPosition(
        draggingSeatId,
        worldPos.x - dragOffset.x,
        worldPos.y - dragOffset.y
      );
    } else if (isPanningRef.current && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      containerRef.current.scrollLeft = panStartRef.current.scrollX - dx;
      containerRef.current.scrollTop = panStartRef.current.scrollY - dy;
    }
  }, [draggingSeatId, dragOffset, screenToWorld, onUpdateSeatPosition]);

  /** 结束拖拽 */
  const handleMouseUp = useCallback(() => {
    setDraggingSeatId(null);
    setDragOffset(null);
    isPanningRef.current = false;
    panStartRef.current = null;
  }, []);

  /** 右键删除座位 */
  const handleSeatContextMenu = useCallback((e: React.MouseEvent, seatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onRemoveSeat(seatId);
  }, [onRemoveSeat]);

  /** Space 键平移 */
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
    }
  }, [isSpacePressed]);

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

  /** Space 键监听 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
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
  }, []);

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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-gray-100 relative"
      style={{
        cursor: isSpacePressed ? 'grab' : canPlaceSeats ? 'crosshair' : 'default',
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
          onClick={handleCanvasClick}
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
              opacity={0.5}
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

            {/* 5. 已放置的座位 */}
            {placedSeats.map((seat) => (
              <g
                key={seat.id}
                transform={`translate(${seat.x}, ${seat.y})`}
                onMouseDown={(e) => handleSeatMouseDown(e, seat.id, seat)}
                onContextMenu={(e) => handleSeatContextMenu(e, seat.id)}
                style={{ cursor: 'move' }}
              >
                <rect
                  x={-seatSize / 2}
                  y={-seatSize / 2}
                  width={seatSize}
                  height={seatSize}
                  fill="white"
                  stroke={section.color}
                  strokeWidth={2 / canvasScale}
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};
