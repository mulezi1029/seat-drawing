/**
 * CalibrationCanvas - 校准画布
 *
 * 显示底图、区域高亮、遮罩、边框和预览座位
 * 支持 Ctrl+滚轮缩放、Space+拖拽平移
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
import type { Section, CalibrationData } from '@/types';
import { SeatPreview } from './SeatPreview';

const WORLD_SIZE = CANVAS_CONFIG.WORLD_SIZE;
const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.03;

/** 背景图尺寸（与 SVGRenderer 一致） */
const SVG_IMAGE_SIZE = 800;
const SVG_IMAGE_OFFSET = 400;

export interface CalibrationCanvasProps {
  /** 正在编辑的区域 */
  section: Section;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 校准数据 */
  calibration: CalibrationData;
  /** 更新校准数据（用于缩放） */
  onCalibrationChange: (updates: Partial<CalibrationData>) => void;
}

/**
 * 计算使区域居中的初始滚动偏移
 */
function computeCenterOffset(
  section: Section,
  scale: number,
  viewportWidth: number,
  viewportHeight: number
): { offsetX: number; offsetY: number } {
  const bounds = getBoundingBox(section.points);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const offsetX =
    centerX * scale +
    (1 - scale) * WORLD_CENTER -
    viewportWidth / 2;
  const offsetY =
    centerY * scale +
    (1 - scale) * WORLD_CENTER -
    viewportHeight / 2;

  return {
    offsetX: Math.max(0, Math.min(WORLD_SIZE * scale - viewportWidth, offsetX)),
    offsetY: Math.max(0, Math.min(WORLD_SIZE * scale - viewportHeight, offsetY)),
  };
}

export const CalibrationCanvas: React.FC<CalibrationCanvasProps> = ({
  section,
  svgUrl,
  calibration,
  onCalibrationChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isHoveringSection, setIsHoveringSection] = useState(false);

  const { canvasScale } = calibration;
  const pointsString = useMemo(
    () => section.points.map((p) => `${p.x},${p.y}`).join(' '),
    [section.points]
  );

  const clipPathId = `section-clip-${section.id}`;
  const maskId = `section-mask-${section.id}`;

  /** 首次挂载时居中区域 */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !section.points.length) return;

    const updateCenter = () => {
      const rect = container.getBoundingClientRect();
      const { offsetX: ox, offsetY: oy } = computeCenterOffset(
        section,
        canvasScale,
        rect.width,
        rect.height
      );
      container.scrollLeft = ox;
      container.scrollTop = oy;
    };

    updateCenter();
    const observer = new ResizeObserver(updateCenter);
    observer.observe(container);
    return () => observer.disconnect();
  }, [section.id]);

  /** 同步滚动位置（预留，用于可能的扩展） */
  const handleScroll = useCallback(() => {
    // 滚动由 DOM 管理，此处可扩展状态同步
  }, []);

  /** 滚轮缩放和平移 */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
        const newScale = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, canvasScale * zoomFactor)
        );

        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left + container.scrollLeft;
          const mouseY = e.clientY - rect.top + container.scrollTop;

          const scaleFactor = newScale / canvasScale;
          const newScrollLeft = mouseX - (mouseX - container.scrollLeft) * scaleFactor;
          const newScrollTop = mouseY - (mouseY - container.scrollTop) * scaleFactor;

          onCalibrationChange({ canvasScale: newScale });
          container.scrollLeft = Math.max(0, newScrollLeft);
          container.scrollTop = Math.max(0, newScrollTop);
        } else {
          onCalibrationChange({ canvasScale: newScale });
        }
      }
    },
    [canvasScale, onCalibrationChange]
  );

  /** Space 键按下时切换到手型 */
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [isSpacePressed]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      containerRef.current.scrollLeft = panStartRef.current.scrollX - dx;
      containerRef.current.scrollTop = panStartRef.current.scrollY - dy;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    panStartRef.current = null;
  }, []);

  const handleSectionMouseEnter = useCallback(() => {
    setIsHoveringSection(true);
  }, []);

  const handleSectionMouseLeave = useCallback(() => {
    setIsHoveringSection(false);
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

  const worldLayerTransform = `matrix(${canvasScale}, 0, 0, ${canvasScale}, ${(1 - canvasScale) * WORLD_CENTER}, ${(1 - canvasScale) * WORLD_CENTER})`;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-gray-100 relative"
      style={{
        cursor: isSpacePressed ? 'grab' : 'default',
      }}
      onScroll={handleScroll}
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
              opacity={0.5}
              mask={`url(#${maskId})`}
            />

            {/* 4. 区域边框 */}
            <polygon
              points={pointsString}
              fill="rgba(0,0,0,0.001)"
              stroke={section.color}
              strokeWidth={2 / canvasScale}
              strokeDasharray="5,5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={handleSectionMouseEnter}
              onMouseLeave={handleSectionMouseLeave}
            />

            {/* 5. 悬停时显示座位样本 */}
            {isHoveringSection && (
              <SeatPreview
                sectionPoints={section.points}
                seatVisual={calibration.seatVisual}
                sectionColor={section.color}
                scale={canvasScale}
              />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
