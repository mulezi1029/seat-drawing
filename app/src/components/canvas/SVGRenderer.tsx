/**
 * SVG 渲染器
 *
 * 负责渲染所有 SVG 元素：背景、区域、座位、选中状态、绘制预览等
 */

import React from 'react';
import { CANVAS_CONFIG, type Point, type Section, type SnapResult, type AlignmentResult } from '@/types';

const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;

interface SVGRendererProps {
  /** 缩放比例 */
  scale: number;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 区域数组 */
  sections?: Section[];
  /** 选中区域 ID */
  selectedSectionId?: string | null;
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
  scale: number;
}> = ({ sections, selectedSectionId, scale }) => {
  return (
    <g className="sections-layer">
      {sections.map((section) => (
        <g key={section.id}>
          {/* 区域多边形 */}
          <polygon
            points={section.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={section.color}
            fillOpacity={section.opacity}
            stroke={selectedSectionId === section.id ? '#3b82f6' : section.color}
            strokeWidth={selectedSectionId === section.id ? 3 / scale : 1 / scale}
          />
          {/* 区域标签 */}
          <SectionLabel section={section} scale={scale} />
        </g>
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
 * 覆盖图层 - 选中/悬停效果
 */
const OverlayLayer: React.FC = () => {
  return (
    <g className="overlay-layer">
      {/* 选中框占位 */}
      {/* 悬停指示器占位 */}
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
  isDrawing = false,
  drawingPoints = [],
  activeTool = 'select',
  mousePosition = null,
  snapResult = null,
  showDimensions = true,
  showGrid = false,
  gridSize = 50,
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

        {/* 覆盖层 */}
        <OverlayLayer />

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
        <circle
          cx={WORLD_CENTER}
          cy={WORLD_CENTER}
          r={8 / scale}
          fill={'red'}
          pointerEvents="none"
          style={{ zIndex: 1000 }}
        />
      </g>
    </svg>
  );
};
