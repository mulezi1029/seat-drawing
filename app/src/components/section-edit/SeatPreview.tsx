/**
 * SeatPreview - 预览座位矩阵
 *
 * 根据 previewSize 生成座位矩阵，用于校准模式下的视觉预览
 */

import React, { useMemo } from 'react';
import type { Point, Seat, SeatVisualParams } from '@/types';
import { getBoundingBox } from '@/utils/selection';

export type PreviewSize = '2×2' | '3×3' | '4×4' | '5×5' | '实际';

export interface SeatPreviewProps {
  /** 区域多边形顶点 */
  sectionPoints: Point[];
  /** 座位视觉参数 */
  seatVisual: SeatVisualParams;
  /** 预览矩阵大小，默认 3×3 */
  previewSize?: PreviewSize;
  /** 区域颜色 */
  sectionColor: string;
  /** 画布缩放（用于 stroke 等） */
  scale: number;
}

/**
 * 根据预览大小和区域边界生成预览座位
 */
function generatePreviewSeats(
  previewSize: PreviewSize,
  center: Point,
  seatVisual: SeatVisualParams
): Seat[] {
  if (previewSize === '实际') {
    return [];
  }

  const [rows, cols] = previewSize.split('×').map(Number) as [number, number];
  const seats: Seat[] = [];

  const cellWidth = seatVisual.size + seatVisual.gapX;
  const cellHeight = seatVisual.size + seatVisual.gapY;
  const totalWidth = cols * cellWidth - seatVisual.gapX;
  const totalHeight = rows * cellHeight - seatVisual.gapY;
  const startX = center.x - totalWidth / 2 + seatVisual.size / 2 + seatVisual.gapX / 2;
  const startY = center.y - totalHeight / 2 + seatVisual.size / 2 + seatVisual.gapY / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        id: `preview-${r}-${c}`,
        x: startX + c * cellWidth,
        y: startY + r * cellHeight,
        row: String.fromCharCode(65 + r),
        number: c + 1,
        type: 'normal',
        angle: 0,
      });
    }
  }

  return seats;
}

export const SeatPreview: React.FC<SeatPreviewProps> = ({
  sectionPoints,
  seatVisual,
  previewSize,
  sectionColor,
  scale,
}) => {
  const size = previewSize ?? '3×3';
  const { seats } = useMemo(() => {
    const bounds = getBoundingBox(sectionPoints);
    const centerPoint: Point = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
    const previewSeats = generatePreviewSeats(size, centerPoint, seatVisual);
    return { seats: previewSeats };
  }, [sectionPoints, seatVisual, size]);

  if (seats.length === 0) {
    return null;
  }

  const strokeWidth = 2 / scale;

  return (
    <g className="seat-preview">
      {seats.map((seat) => (
        <g key={seat.id} transform={`translate(${seat.x}, ${seat.y})`}>
          <rect
            x={-seatVisual.size / 2}
            y={-seatVisual.size / 2}
            width={seatVisual.size}
            height={seatVisual.size}
            fill="white"
            stroke={sectionColor}
            strokeWidth={strokeWidth}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(10, seatVisual.size * 0.5) / scale}
            fontWeight="bold"
            fill={sectionColor}
          >
            {seat.number}
          </text>
        </g>
      ))}
    </g>
  );
};
