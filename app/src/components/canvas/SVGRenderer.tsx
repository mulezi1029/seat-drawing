/**
 * SVG 渲染器
 *
 * 负责渲染所有 SVG 元素：背景、区域、座位、选中状态、绘制预览等
 */

import React from 'react';
import { CANVAS_CONFIG, type Point, type Section, type SnapResult, type AlignmentResult, type BoundingBox } from '@/types';
import { getBoundingBox } from '@/utils/selection';

const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;

interface SVGRendererProps {
  /** 缩放比例 */
  scale: number;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 区域数组 */
  sections?: Section[];
  /** 选中区域 ID（单选，向后兼容） */
  selectedSectionId?: string | null;
  /** 选中区域 ID 集合（多选） */
  selectedIds?: Set<string>;
  /** 悬停区域 ID */
  hoverElementId?: string | null;
  /** 是否正在绘制 */
  isDrawing?: boolean;
  /** 当前绘制的点 */
  drawingPoints?: Point[];
  /** 当前激活的工具 */
  activeTool?: string;
  /** 鼠标位置（世界坐标） */
  mousePosition?: Point | null;
  /** 吸附结果 */
  snapResult?: SnapResult | null;
  /** 是否显示尺寸标注 */
  showDimensions?: boolean;
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 网格大小 */
  gridSize?: number;
  /** 框选起点 */
  selectionBoxStart?: Point | null;
  /** 框选终点 */
  selectionBoxEnd?: Point | null;
  /** 是否正在旋转 */
  isRotating?: boolean;
  /** 当前旋转角度 */
  rotationAngle?: number;
  /** 旋转开始时的初始边界框 */
  initialRotationBbox?: BoundingBox | null;
  /** 旋转手柄悬停回调 */
  onRotationHandleHover?: (isHovered: boolean) => void;
  /** 是否正在拖拽元素 */
  isDraggingElement?: boolean;
}

interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: number;
}

/**
 * 背景图层
 */
const BackgroundLayer: React.FC<{ svgUrl: string | null }> = ({ svgUrl }) => {
  if (!svgUrl) return null;

  return (
    <image
      href={svgUrl}
      x={WORLD_CENTER - 400}
      y={WORLD_CENTER - 400}
      width={800}
      preserveAspectRatio="xMidYMid meet"
      opacity={0.8}
      style={{ pointerEvents: 'none' }}
    />
  );
};

/**
 * 区域图层
 */
const SectionsLayer: React.FC<{
  sections: Section[];
  selectedSectionId: string | null;
  selectedIds: Set<string>;
  scale: number;
}> = ({ sections, selectedSectionId, selectedIds, scale }) => {
  return (
    <g className="sections-layer">
      {sections.map((section) => {
        // 支持多选和单选两种模式
        const isSelected = selectedIds.has(section.id) || selectedSectionId === section.id;
        return (
          <g key={section.id}>
            {/* 区域多边形 */}
            <polygon
              points={section.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={section.color}
              fillOpacity={section.opacity}
              stroke={isSelected ? '#3b82f6' : section.color}
              strokeWidth={isSelected ? 3 / scale : 1 / scale}
            />
            {/* 选中时显示控制点 */}
            {isSelected && (
              <SelectionHandles section={section} scale={scale} />
            )}
            {/* 区域标签 */}
            <SectionLabel section={section} scale={scale} />
          </g>
        );
      })}
    </g>
  );
};

/**
 * 选中控制点
 */
const SelectionHandles: React.FC<{
  section: Section;
  scale: number;
}> = ({ section, scale }) => {
  const handleRadius = 6 / scale;
  const strokeWidth = 2 / scale;

  return (
    <g className="selection-handles">
      {section.points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={handleRadius}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
        />
      ))}
    </g>
  );
};

/**
 * 区域标签
 */
const SectionLabel: React.FC<{ section: Section; scale: number }> = ({
  section,
  scale,
}) => {
  // 计算多边形中心
  const centerX = section.points.reduce((sum, p) => sum + p.x, 0) / section.points.length;
  const centerY = section.points.reduce((sum, p) => sum + p.y, 0) / section.points.length;

  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={14 / scale}
      fontWeight="bold"
      fill="#374151"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {section.name}
    </text>
  );
};

/**
 * 座位图层 - 占位
 */
const SeatsLayer: React.FC = () => {
  const seats: Seat[] = [];
  const SEAT_RADIUS = 12;

  return (
    <g className="seats-layer">
      {seats.map((seat) => (
        <g key={seat.id} transform={`translate(${seat.x}, ${seat.y})`}>
          <circle
            r={SEAT_RADIUS}
            fill="white"
            stroke="#bd7d00"
            strokeWidth={2}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight="bold"
            fill="#bd7d00"
          >
            {seat.number}
          </text>
        </g>
      ))}
    </g>
  );
};

/**
 * 绘制预览图层
 */
const DrawingPreviewLayer: React.FC<{
  isDrawing: boolean;
  drawingPoints: Point[];
  scale: number;
  activeTool?: string;
  mousePosition?: Point | null;
  snapResult?: SnapResult | null;
}> = ({ isDrawing, drawingPoints, scale, activeTool, mousePosition, snapResult }) => {
  if (!isDrawing || drawingPoints.length === 0) return null;

  const isPolygon = activeTool === 'polygon';
  const lastPoint = drawingPoints[drawingPoints.length - 1];

  // Use snapped point when available, otherwise use mouse position
  const targetPoint = snapResult && snapResult.type !== 'none' ? snapResult.point : mousePosition;

  return (
    <g className="drawing-preview-layer">
      {/* 绘制中的多边形/矩形预览 */}
      <polygon
        points={drawingPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        strokeWidth={2 / scale}
        strokeDasharray={isPolygon ? '5,5' : undefined}
      />

      {/* 绘制边线（多边形模式下连接各顶点） */}
      {isPolygon && drawingPoints.length > 1 && (
        <polyline
          points={drawingPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2 / scale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* 多边形模式：鼠标跟随线（从最后一个点到目标位置，优先使用吸附点） */}
      {isPolygon && targetPoint && lastPoint && (
        <line
          x1={lastPoint.x}
          y1={lastPoint.y}
          x2={targetPoint.x}
          y2={targetPoint.y}
          stroke="#3b82f6"
          strokeWidth={2 / scale}
          strokeLinecap="round"
        />
      )}

      {/* 顶点标记 */}
      {drawingPoints.map((point, i) => (
        <g key={i}>
          <circle
            cx={point.x}
            cy={point.y}
            r={6 / scale}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={1 / scale}
          />
          {/* 第一个点特殊标记（用于多边形闭合） */}
          {isPolygon && i === 0 && drawingPoints.length > 1 && (
            <>
              <circle
                cx={point.x}
                cy={point.y}
                r={10 / scale}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2 / scale}
                strokeDasharray="3,3"
              />
              {/* 闭合提示 - 当鼠标靠近第一个点时显示 */}
              {targetPoint && (
                (() => {
                  const dx = targetPoint.x - point.x;
                  const dy = targetPoint.y - point.y;
                  const distance = Math.hypot(dx, dy);
                  const closeThreshold = 20 / scale;
                  if (distance < closeThreshold) {
                    return (
                      <g>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={15 / scale}
                          fill="rgba(34, 197, 94, 0.3)"
                          stroke="#22c55e"
                          strokeWidth={2 / scale}
                        />
                        <text
                          x={point.x}
                          y={point.y - 20 / scale}
                          textAnchor="middle"
                          fontSize={12 / scale}
                          fill="#22c55e"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          点击闭合
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()
              )}
            </>
          )}
        </g>
      ))}
    </g>
  );
};

/**
 * 辅助线层 - 显示吸附辅助线
 */
const GuideLinesLayer: React.FC<{
  snapResult: SnapResult | null;
  scale: number;
}> = ({ snapResult, scale }) => {
  if (!snapResult || snapResult.type === 'none') return null;

  const { point, type, source } = snapResult;

  return (
    <g className="guide-lines">
      {/* 吸附点高亮 */}
      <circle
        cx={point.x}
        cy={point.y}
        r={8 / scale}
        fill="none"
        stroke="#22c55e"
        strokeWidth={2 / scale}
      />

      {/* 顶点吸附时的对齐线 */}
      {type === 'vertex' && source && (
        <>
          <line
            x1={source.x}
            y1={source.y - 1000}
            x2={source.x}
            y2={source.y + 1000}
            stroke="#22c55e"
            strokeWidth={1 / scale}
            opacity={0.8}
          />
          <line
            x1={source.x - 1000}
            y1={source.y}
            x2={source.x + 1000}
            y2={source.y}
            stroke="#22c55e"
            strokeWidth={1 / scale}
            opacity={0.8}
          />
        </>
      )}

      {/* 角度吸附时的辅助线 */}
      {type === 'angle' && source && (
        <line
          x1={source.x}
          y1={source.y}
          x2={point.x}
          y2={point.y}
          stroke="#22c55e"
          strokeWidth={1 / scale}
          opacity={0.8}
        />
      )}
    </g>
  );
};

/**
 * 尺寸标注组件
 */
const DimensionLabel: React.FC<{
  points: Point[];
  scale: number;
}> = ({ points, scale }) => {
  if (points.length < 2) return null;

  // 计算矩形边界
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return (
    <g className="dimension-label">
      {/* 宽度标注 */}
      <text
        x={centerX}
        y={minY - 10 / scale}
        textAnchor="middle"
        fontSize={12 / scale}
        fill="#374151"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {Math.round(width)}px
      </text>

      {/* 高度标注 */}
      <text
        x={maxX + 10 / scale}
        y={centerY}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={12 / scale}
        fill="#374151"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {Math.round(height)}px
      </text>
    </g>
  );
};

/**
 * 光标辅助线层 - 显示水平和垂直辅助线
 * 默认蓝色实线，对齐时变为绿色实线
 */
const CursorGuideLayer: React.FC<{
  mousePosition: Point | null;
  scale: number;
  alignment?: AlignmentResult | null;
}> = ({ mousePosition, scale, alignment }) => {
  if (!mousePosition) return null;

  const { x, y } = mousePosition;
  const lineLength = 10000;

  // 对齐时线条变绿色且实线，否则蓝色实线
  const isHorizontalAligned = alignment?.isHorizontalAligned ?? false;
  const isVerticalAligned = alignment?.isVerticalAligned ?? false;
  const horizontalColor = isHorizontalAligned ? '#22c55e' : '#3b82f6';
  const verticalColor = isVerticalAligned ? '#22c55e' : '#3b82f6';

  return (
    <g className="cursor-guide-layer">
      {/* 水平辅助线 - 对齐时为绿色实线，否则蓝色实线，strokeWidth 统一为 1/scale */}
      <line
        x1={x - lineLength}
        y1={y}
        x2={x + lineLength}
        y2={y}
        stroke={horizontalColor}
        strokeWidth={1 / scale}
        opacity={0.8}
      />

      {/* 垂直辅助线 - 对齐时为绿色实线，否则蓝色实线，strokeWidth 统一为 1/scale */}
      <line
        x1={x}
        y1={y - lineLength}
        x2={x}
        y2={y + lineLength}
        stroke={verticalColor}
        strokeWidth={1 / scale}
        opacity={0.8}
      />

      {/* 对齐指示点 */}
      {alignment?.horizontalSource && (
        <circle
          cx={alignment.horizontalSource.x}
          cy={alignment.horizontalSource.y}
          r={6 / scale}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2 / scale}
        />
      )}
      {alignment?.verticalSource && alignment.verticalSource.x !== alignment.horizontalSource?.x && (
        <circle
          cx={alignment.verticalSource.x}
          cy={alignment.verticalSource.y}
          r={6 / scale}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2 / scale}
        />
      )}
    </g>
  );
};

/**
 * 多边形预览点层 - 显示光标处的预览点
 * 默认橙色，吸附时变为红色
 */
const PolygonPreviewPoint: React.FC<{
  mousePosition: Point | null;
  scale: number;
  isDrawing: boolean;
  activeTool: string;
  isSnapped: boolean;
}> = ({ mousePosition, scale, isDrawing, activeTool, isSnapped }) => {
  if (!mousePosition || !isDrawing || activeTool !== 'polygon') return null;

  const { x, y } = mousePosition;

  // 吸附时红色，否则橙色
  const fillColor = isSnapped ? '#ef4444' : '#f97316';

  return (
    <g className="polygon-preview-point">
      <circle
        cx={x}
        cy={y}
        r={8 / scale}
        fill={fillColor}
        stroke="white"
        strokeWidth={2 / scale}
        opacity={0.8}
      />
    </g>
  );
};

/**
 * 选择框图层
 */
const SelectionBoxLayer: React.FC<{
  boxStart: Point | null;
  boxEnd: Point | null;
  scale: number;
}> = ({ boxStart, boxEnd, scale }) => {
  if (!boxStart || !boxEnd) return null;

  const minX = Math.min(boxStart.x, boxEnd.x);
  const maxX = Math.max(boxStart.x, boxEnd.x);
  const minY = Math.min(boxStart.y, boxEnd.y);
  const maxY = Math.max(boxStart.y, boxEnd.y);

  return (
    <g className="selection-box-layer">
      {/* 选择框矩形 */}
      <rect
        x={minX}
        y={minY}
        width={maxX - minX}
        height={maxY - minY}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={1 / scale}
        strokeDasharray={`${4 / scale},${4 / scale}`}
      />
    </g>
  );
};

/**
 * 网格图层 - 显示网格辅助线
 */
const GridLayer: React.FC<{
  scale: number;
  gridSize: number;
}> = ({ scale, gridSize }) => {
  const lines = [];
  const worldMin = CANVAS_CONFIG.WORLD_MIN;
  const worldMax = CANVAS_CONFIG.WORLD_MAX;

  // Vertical lines
  for (let x = worldMin; x <= worldMax; x += gridSize) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={worldMin}
        x2={x}
        y2={worldMax}
        stroke="#e5e7eb"
        strokeWidth={1 / scale}
        opacity={0.5}
      />
    );
  }

  // Horizontal lines
  for (let y = worldMin; y <= worldMax; y += gridSize) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={worldMin}
        y1={y}
        x2={worldMax}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth={1 / scale}
        opacity={0.5}
      />
    );
  }

  return <g className="grid-layer">{lines}</g>;
};

/**
 * 计算多个边界框的整体边界框
 */
function getCombinedBoundingBox(bboxes: BoundingBox[]): BoundingBox | null {
  if (bboxes.length === 0) return null;
  if (bboxes.length === 1) return bboxes[0];

  return {
    minX: Math.min(...bboxes.map(b => b.minX)),
    minY: Math.min(...bboxes.map(b => b.minY)),
    maxX: Math.max(...bboxes.map(b => b.maxX)),
    maxY: Math.max(...bboxes.map(b => b.maxY)),
  };
}

/**
 * 边界框图层 - 显示选中元素的边界框和旋转手柄
 */
const BoundingBoxLayer: React.FC<{
  sections: Section[];
  selectedIds: Set<string>;
  scale: number;
  isRotating?: boolean;
  rotationAngle?: number;
  initialRotationBbox?: BoundingBox | null;
  onRotationHandleHover?: (isHovered: boolean) => void;
}> = ({ sections, selectedIds, scale, isRotating, rotationAngle, initialRotationBbox, onRotationHandleHover }) => {
  const selectedSections = sections.filter((s) => selectedIds.has(s.id));

  if (selectedSections.length === 0) return null;

  // 计算所有选中元素的边界框
  const bboxes = selectedSections.map(s => getBoundingBox(s.points));
  const currentBbox = getCombinedBoundingBox(bboxes);

  if (!currentBbox) return null;

  // 旋转过程中使用初始边界框，非旋转状态使用当前边界框
  const displayBbox = (isRotating && initialRotationBbox) ? initialRotationBbox : currentBbox;

  const width = displayBbox.maxX - displayBbox.minX;
  const height = displayBbox.maxY - displayBbox.minY;
  const centerX = (displayBbox.minX + displayBbox.maxX) / 2;
  const centerY = (displayBbox.minY + displayBbox.maxY) / 2;
  const handleY = displayBbox.minY - 20 / scale;

  // 如果是多选，显示整体边界框；如果是单选，也使用相同的整体边界框逻辑
  return (
    <g className="bounding-box-layer" style={{ pointerEvents: 'none' }}>
      {/* 旋转中的边界框组（带旋转变换） */}
      {isRotating && rotationAngle !== undefined ? (
        <g transform={`rotate(${rotationAngle}, ${centerX}, ${centerY})`}>
          {/* 整体边界框矩形 */}
          <rect
            x={displayBbox.minX}
            y={displayBbox.minY}
            width={width}
            height={height}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1 / scale}
            strokeDasharray={`${4 / scale},${2 / scale}`}
            opacity={0.8}
          />

          {/* 旋转手柄连接线 */}
          <line
            x1={centerX}
            y1={displayBbox.minY}
            x2={centerX}
            y2={handleY}
            stroke="#3b82f6"
            strokeWidth={1 / scale}
          />

          {/* 旋转手柄圆点 */}
          <circle
            cx={centerX}
            cy={handleY}
            r={6 / scale}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2 / scale}
            className="rotation-handle"
            style={{ pointerEvents: 'auto', cursor: 'grabbing' }}
            onMouseEnter={() => onRotationHandleHover?.(true)}
            onMouseLeave={() => onRotationHandleHover?.(false)}
          />

          {/* 角度文本（在旋转手柄上方） */}
          <text
            x={centerX}
            y={handleY - 15 / scale}
            textAnchor="middle"
            fontSize={12 / scale}
            fill="#3b82f6"
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {Math.round(rotationAngle)}°
          </text>
        </g>
      ) : (
        /* 非旋转状态 - 正常显示 */
        <>
          {/* 整体边界框矩形 */}
          <rect
            x={displayBbox.minX}
            y={displayBbox.minY}
            width={width}
            height={height}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1 / scale}
            strokeDasharray={`${4 / scale},${2 / scale}`}
          />

          {/* 旋转手柄连接线 */}
          <line
            x1={centerX}
            y1={displayBbox.minY}
            x2={centerX}
            y2={handleY}
            stroke="#3b82f6"
            strokeWidth={1 / scale}
          />

          {/* 旋转手柄圆点 */}
          <circle
            cx={centerX}
            cy={handleY}
            r={6 / scale}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2 / scale}
            className="rotation-handle"
            style={{ pointerEvents: 'auto', cursor: 'grab' }}
            onMouseEnter={() => onRotationHandleHover?.(true)}
            onMouseLeave={() => onRotationHandleHover?.(false)}
          />

          {/* 多选时显示每个元素的小边界框（仅用于视觉参考） */}
          {selectedSections.length > 1 && bboxes.map((bbox, index) => (
            <rect
              key={index}
              x={bbox.minX}
              y={bbox.minY}
              width={bbox.maxX - bbox.minX}
              height={bbox.maxY - bbox.minY}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={0.5 / scale}
              strokeDasharray={`${2 / scale},${2 / scale}`}
              opacity={0.5}
            />
          ))}
        </>
      )}

      {/* 旋转指示圆环和中心点（在旋转组之外，保持不旋转） */}
      {isRotating && rotationAngle !== undefined && (
        <g>
          {/* 旋转指示圆环 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={Math.max(width, height) / 2 + 30 / scale}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1 / scale}
            strokeDasharray={`${2 / scale},${4 / scale}`}
            opacity={0.5}
          />
          {/* 旋转中心点 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={4 / scale}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2 / scale}
          />
        </g>
      )}
    </g>
  );
};

/**
 * 悬停高亮图层 - 显示鼠标悬停的元素
 */
const HoverHighlightLayer: React.FC<{
  sections: Section[];
  hoverElementId: string | null;
  scale: number;
}> = ({ sections, hoverElementId, scale }) => {
  if (!hoverElementId) return null;

  const hoverSection = sections.find((s) => s.id === hoverElementId);
  if (!hoverSection) return null;

  return (
    <g className="hover-highlight-layer" style={{ pointerEvents: 'none' }}>
      <polygon
        points={hoverSection.points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#60a5fa"
        strokeWidth={2 / scale}
        strokeDasharray={`${3 / scale},${3 / scale}`}
        opacity={0.7}
      />
    </g>
  );
};

/**
 * 拖拽辅助线图层 - 显示选中元素的中心十字线和边界辅助线
 */
const DragGuideLayer: React.FC<{
  sections: Section[];
  selectedIds: Set<string>;
  scale: number;
  isDragging: boolean;
}> = ({ sections, selectedIds, scale, isDragging }) => {
  if (!isDragging || selectedIds.size === 0) return null;

  const selectedSections = sections.filter((s) => selectedIds.has(s.id));
  if (selectedSections.length === 0) return null;

  // 计算所有选中元素的整体边界框
  const bboxes = selectedSections.map(s => getBoundingBox(s.points));
  const combinedBbox = getCombinedBoundingBox(bboxes);
  if (!combinedBbox) return null;

  const minX = combinedBbox.minX;
  const maxX = combinedBbox.maxX;
  const minY = combinedBbox.minY;
  const maxY = combinedBbox.maxY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const lineLength = 10000; // 辅助线延伸长度

  return (
    <g className="drag-guide-layer" style={{ pointerEvents: 'none' }}>
      {/* 中心水平辅助线 */}
      <line
        x1={centerX - lineLength}
        y1={centerY}
        x2={centerX + lineLength}
        y2={centerY}
        stroke="#f59e0b"
        strokeWidth={1 / scale}
        strokeDasharray={`${4 / scale},${2 / scale}`}
        opacity={0.8}
      />

      {/* 中心垂直辅助线 */}
      <line
        x1={centerX}
        y1={centerY - lineLength}
        x2={centerX}
        y2={centerY + lineLength}
        stroke="#f59e0b"
        strokeWidth={1 / scale}
        strokeDasharray={`${4 / scale},${2 / scale}`}
        opacity={0.8}
      />

      {/* 边界水平辅助线 - 顶部 */}
      <line
        x1={minX - lineLength}
        y1={minY}
        x2={minX + lineLength}
        y2={minY}
        stroke="#f59e0b"
        strokeWidth={0.5 / scale}
        strokeDasharray={`${2 / scale},${2 / scale}`}
        opacity={0.6}
      />

      {/* 边界水平辅助线 - 底部 */}
      <line
        x1={minX - lineLength}
        y1={maxY}
        x2={minX + lineLength}
        y2={maxY}
        stroke="#f59e0b"
        strokeWidth={0.5 / scale}
        strokeDasharray={`${2 / scale},${2 / scale}`}
        opacity={0.6}
      />

      {/* 边界垂直辅助线 - 左侧 */}
      <line
        x1={minX}
        y1={minY - lineLength}
        x2={minX}
        y2={minY + lineLength}
        stroke="#f59e0b"
        strokeWidth={0.5 / scale}
        strokeDasharray={`${2 / scale},${2 / scale}`}
        opacity={0.6}
      />

      {/* 边界垂直辅助线 - 右侧 */}
      <line
        x1={maxX}
        y1={minY - lineLength}
        x2={maxX}
        y2={minY + lineLength}
        stroke="#f59e0b"
        strokeWidth={0.5 / scale}
        strokeDasharray={`${2 / scale},${2 / scale}`}
        opacity={0.6}
      />

      {/* 中心点标记 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={4 / scale}
        fill="#f59e0b"
        stroke="white"
        strokeWidth={1 / scale}
      />
    </g>
  );
};

/**
 * SVG 渲染器主组件
 *
 * 与 seats.io 保持一致：使用 width/height 而非 viewBox
 * 通过 transform 进行坐标变换
 */
export const SVGRenderer: React.FC<SVGRendererProps> = ({
  scale,
  svgUrl,
  sections = [],
  selectedSectionId = null,
  selectedIds = new Set(),
  hoverElementId = null,
  isDrawing = false,
  drawingPoints = [],
  activeTool = 'select',
  mousePosition = null,
  snapResult = null,
  showDimensions = true,
  showGrid = false,
  gridSize = 50,
  selectionBoxStart = null,
  selectionBoxEnd = null,
  isRotating = false,
  rotationAngle = 0,
  initialRotationBbox = null,
  onRotationHandleHover,
  isDraggingElement = false,
}) => {
  const isSnapped = snapResult?.type === 'vertex' || snapResult?.type === 'grid';
  const alignment = snapResult?.alignment;

  return (
    <svg
      width={CANVAS_CONFIG.WORLD_SIZE}
      height={CANVAS_CONFIG.WORLD_SIZE}
      style={{
        overflow: 'hidden',
        position: 'absolute',
        left: 0,
        top: 0,
      }}
    >
      {/* 世界层 - 所有内容通过 transform 缩放和平移 */}
      <g
        className="world-layer"
        transform={`matrix(${scale}, 0, 0, ${scale}, ${(1 - scale) * WORLD_CENTER}, ${(1 - scale) * WORLD_CENTER})`}
      >
        {/* 背景层 */}
        <BackgroundLayer svgUrl={svgUrl} />

        {/* 网格层 */}
        {showGrid && <GridLayer scale={scale} gridSize={gridSize} />}

        {/* 区域层 */}
        <SectionsLayer
          sections={sections}
          selectedSectionId={selectedSectionId}
          selectedIds={selectedIds}
          scale={scale}
        />

        {/* 座位层 */}
        <SeatsLayer />

        {/* 绘制预览层 */}
        <DrawingPreviewLayer
          isDrawing={isDrawing}
          drawingPoints={drawingPoints}
          scale={scale}
          activeTool={activeTool}
          mousePosition={mousePosition}
          snapResult={snapResult}
        />

        {/* 辅助线层 */}
        <GuideLinesLayer snapResult={snapResult} scale={scale} />

        {/* 尺寸标注（矩形模式） */}
        {showDimensions && isDrawing && activeTool === 'section' && drawingPoints.length >= 2 && (
          <DimensionLabel points={drawingPoints} scale={scale} />
        )}

        {/* 悬停高亮图层 */}
        <HoverHighlightLayer
          sections={sections}
          hoverElementId={hoverElementId}
          scale={scale}
        />

        {/* 拖拽辅助线图层 - 拖拽选中元素时显示中心十字线和边界辅助线 */}
        <DragGuideLayer
          sections={sections}
          selectedIds={selectedIds}
          scale={scale}
          isDragging={isDraggingElement}
        />

        {/* 边界框图层 - 显示选中元素的边界框和旋转手柄 */}
        <BoundingBoxLayer
          sections={sections}
          selectedIds={selectedIds}
          scale={scale}
          isRotating={isRotating}
          rotationAngle={rotationAngle}
          initialRotationBbox={initialRotationBbox}
          onRotationHandleHover={onRotationHandleHover}
        />

        {/* 选择框图层 */}
        <SelectionBoxLayer
          boxStart={selectionBoxStart}
          boxEnd={selectionBoxEnd}
          scale={scale}
        />

        {/* 光标辅助线层 - 矩形/多边形绘制时显示 */}
        {(activeTool === 'section' || activeTool === 'polygon') && isDrawing && (
          <CursorGuideLayer
            mousePosition={mousePosition}
            scale={scale}
            alignment={alignment}
          />
        )}

        {/* 多边形预览点层 */}
        <PolygonPreviewPoint
          mousePosition={mousePosition}
          scale={scale}
          isDrawing={isDrawing}
          activeTool={activeTool}
          isSnapped={isSnapped}
        />

        {/* 中心点标记（调试用） */}
        <g className="world-center-point">
          <circle
            cx={WORLD_CENTER}
            cy={WORLD_CENTER}
            r={8 / scale}
            fill={'red'}
            pointerEvents="none"
            style={{ zIndex: 1000 }}
          />
          <text
            x={WORLD_CENTER}
            y={WORLD_CENTER - 15}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12 / scale}
            fill="red"
          >
            画布世界中心点</text>
        </g>
      </g>
    </svg>
  );
};
