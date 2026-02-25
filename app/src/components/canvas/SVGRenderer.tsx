/**
 * SVG 渲染器 - 占位组件
 *
 * 负责渲染所有 SVG 元素：背景、区域、座位、选中状态等
 */

import React from 'react';
import { CANVAS_CONFIG } from '@/types';

const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;

interface SVGRendererProps {
  /** 缩放比例 */
  scale: number;
  /** SVG 背景图 URL */
  svgUrl: string | null;
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

interface Section {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  opacity: number;
}

interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: number;
}

/**
 * 区域图层 - 占位
 */
const SectionsLayer: React.FC = () => {
  // 示例区域数据（占位）
  const sections: Section[] = [
    // {
    //   id: 'section-1',
    //   points: [
    //     { x: WORLD_CENTER - 200, y: WORLD_CENTER - 150 },
    //     { x: WORLD_CENTER + 200, y: WORLD_CENTER - 150 },
    //     { x: WORLD_CENTER + 200, y: WORLD_CENTER + 150 },
    //     { x: WORLD_CENTER - 200, y: WORLD_CENTER + 150 },
    //   ],
    //   color: '#fca700',
    //   opacity: 0.3,
    // },
  ];

  return (
    <g className="sections-layer">
      {sections.map((section) => (
        <polygon
          key={section.id}
          points={section.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={section.color}
          fillOpacity={section.opacity}
          stroke={section.color}
          strokeWidth={2}
        />
      ))}
    </g>
  );
};

/**
 * 座位图层 - 占位
 */
const SeatsLayer: React.FC = () => {
  // 示例座位数据（占位）
  const seats: Seat[] = [
    // { id: 'seat-1', x: WORLD_CENTER - 100, y: WORLD_CENTER, row: 'A', number: 1 },
    // { id: 'seat-2', x: WORLD_CENTER, y: WORLD_CENTER, row: 'A', number: 2 },
    // { id: 'seat-3', x: WORLD_CENTER + 100, y: WORLD_CENTER, row: 'A', number: 3 },
  ];

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
 * 覆盖图层 - 选中/悬停效果
 */
const OverlayLayer: React.FC = () => {
  return (
    <g className="overlay-layer">
      {/* 选中框占位 */}
      {/* 悬停指示器占位 */}
      {/* 吸附辅助线占位 */}
    </g>
  );
};

/**
 * SVG 渲染器主组件
 *
 * 与 seats.io 保持一致：使用 width/height 而非 viewBox
 * 通过 transform 进行坐标变换
 */
export const SVGRenderer: React.FC<SVGRendererProps> = ({ scale, svgUrl }) => {
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
        transform={`translate(${WORLD_CENTER}, ${WORLD_CENTER}) scale(${scale}) translate(${-WORLD_CENTER}, ${-WORLD_CENTER})`}
      >
        {/* 背景层 */}
        <BackgroundLayer svgUrl={svgUrl} />

        {/* 区域层 */}
        <SectionsLayer />

        {/* 座位层 */}
        <SeatsLayer />

        {/* 覆盖层 */}
        <OverlayLayer />

        {/* TODO:中心点标记（调试用，待删除） */}
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
