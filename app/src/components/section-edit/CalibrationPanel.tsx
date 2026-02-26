/**
 * CalibrationPanel - 校准设置面板
 *
 * 包含：画布缩放、座位边长、座位间距、容量估算、重置/完成按钮
 * 参数调整采用 seats.io 风格的步进器（‹ value ›）
 */

import React, { useCallback } from 'react';
import type { CalibrationData, SeatVisualParams, BoundingBox } from '@/types';
import { Button } from '@/components/ui/button';

export interface CalibrationPanelProps {
  /** 校准数据 */
  calibration: CalibrationData;
  /** 区域边界框 */
  sectionBounds: BoundingBox;
  /** 更新校准数据 */
  onCalibrationChange: (updates: Partial<CalibrationData>) => void;
  /** 重置校准 */
  onReset: () => void;
  /** 完成校准 */
  onComplete: () => void;
}

/**
 * 估算区域可容纳的座位数量
 */
function estimateCapacity(
  bounds: BoundingBox,
  seatVisual: SeatVisualParams
): { rows: number; cols: number; total: number } {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const cellWidth = seatVisual.size + seatVisual.gapX;
  const cellHeight = seatVisual.size + seatVisual.gapY;
  const cols = Math.max(0, Math.floor(width / cellWidth));
  const rows = Math.max(0, Math.floor(height / cellHeight));
  return { rows, cols, total: rows * cols };
}

interface StepperProps {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}

/**
 * seats.io 风格步进器：label  ‹ value unit ›
 */
function Stepper({ label, value, step, min, max, unit = 'pt', onChange }: StepperProps) {
  const decrease = useCallback(() => {
    const next = Math.max(min, parseFloat((value - step).toFixed(1)));
    onChange(next);
  }, [value, step, min, onChange]);

  const increase = useCallback(() => {
    const next = Math.min(max, parseFloat((value + step).toFixed(1)));
    onChange(next);
  }, [value, step, max, onChange]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center border rounded bg-white overflow-hidden">
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <span className="px-3 py-1 text-xs font-mono text-gray-800 min-w-[56px] text-center border-x select-none">
          {value} {unit}
        </span>
        <button
          type="button"
          onClick={increase}
          disabled={value >= max}
          className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export const CalibrationPanel: React.FC<CalibrationPanelProps> = ({
  calibration,
  sectionBounds,
  onCalibrationChange,
  onReset,
  onComplete,
}) => {
  const { canvasScale, seatVisual } = calibration;
  const capacity = estimateCapacity(sectionBounds, seatVisual);

  const handleScaleDecrease = useCallback(() => {
    const next = Math.max(0.5, parseFloat((canvasScale - 0.1).toFixed(1)));
    onCalibrationChange({ canvasScale: next, anchorScale: next });
  }, [canvasScale, onCalibrationChange]);

  const handleScaleIncrease = useCallback(() => {
    const next = Math.min(10, parseFloat((canvasScale + 0.1).toFixed(1)));
    onCalibrationChange({ canvasScale: next, anchorScale: next });
  }, [canvasScale, onCalibrationChange]);

  const handleSeatSizeChange = useCallback((value: number) => {
    onCalibrationChange({ seatVisual: { ...seatVisual, size: value } });
  }, [seatVisual, onCalibrationChange]);

  const handleGapXChange = useCallback((value: number) => {
    onCalibrationChange({ seatVisual: { ...seatVisual, gapX: value } });
  }, [seatVisual, onCalibrationChange]);

  const handleGapYChange = useCallback((value: number) => {
    onCalibrationChange({ seatVisual: { ...seatVisual, gapY: value } });
  }, [seatVisual, onCalibrationChange]);

  return (
    <div className="w-64 flex-shrink-0 border-r bg-white p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-800">校准设置</h3>

      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
        将鼠标移入区域，查看座位样本。调整参数使虚拟座位与底图对齐。
      </div>

      {/* 画布缩放 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">画布缩放</span>
          <div className="flex items-center border rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={handleScaleDecrease}
              disabled={canvasScale <= 0.5}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="px-3 py-1 text-xs font-mono text-gray-800 min-w-[56px] text-center border-x select-none">
              {Math.round(canvasScale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleScaleIncrease}
              disabled={canvasScale >= 10}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 座位尺寸 */}
      <div className="flex flex-col gap-3">
        <span className="text-xs text-gray-600 font-medium">座位尺寸</span>
        <Stepper
          label="边长"
          value={seatVisual.size}
          step={1}
          min={5}
          max={100}
          onChange={handleSeatSizeChange}
        />
      </div>

      {/* 座位间距 */}
      <div className="flex flex-col gap-3">
        <span className="text-xs text-gray-600 font-medium">座位间距</span>
        <Stepper
          label="横向（列间距）"
          value={seatVisual.gapX}
          step={1}
          min={0}
          max={50}
          onChange={handleGapXChange}
        />
        <Stepper
          label="纵向（行间距）"
          value={seatVisual.gapY}
          step={1}
          min={0}
          max={50}
          onChange={handleGapYChange}
        />
      </div>

      {/* 预计容量 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">预计容量</label>
        <p className="text-sm text-gray-800">
          约 {capacity.rows} 排 × {capacity.cols} 列 = {capacity.total} 座位
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-2 mt-auto pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          重置 (R)
        </Button>
        <Button size="sm" onClick={onComplete} className="w-full">
          开始绘制座位
        </Button>
      </div>
    </div>
  );
};
