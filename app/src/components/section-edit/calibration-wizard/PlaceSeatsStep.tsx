/**
 * 校准向导 - 步骤2：放置座位
 * 参照 seats.io 的 "Place seats on top of the background seats" 步骤
 */

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { PlacedCalibrationSeat } from '@/types/calibration';

export interface PlaceSeatsStepProps {
  /** 已放置的座位 */
  placedSeats: PlacedCalibrationSeat[];
  /** 当前座位尺寸 */
  seatSize: number;
  /** 座位尺寸变化回调 */
  onSeatSizeChange: (size: number) => void;
  /** 返回上一步 */
  onBack: () => void;
  /** 进入下一步（需要至少4个座位） */
  onNext: () => void;
}

const MIN_SEATS_REQUIRED = 4;

export const PlaceSeatsStep: React.FC<PlaceSeatsStepProps> = ({
  placedSeats,
  seatSize,
  onSeatSizeChange,
  onBack,
  onNext,
}) => {
  const canProceed = placedSeats.length >= MIN_SEATS_REQUIRED;

  const handleSizeDecrease = useCallback(() => {
    const next = Math.max(0.5, parseFloat((seatSize - 0.5).toFixed(1)));
    onSeatSizeChange(next);
  }, [seatSize, onSeatSizeChange]);

  const handleSizeIncrease = useCallback(() => {
    const next = Math.min(100, parseFloat((seatSize + 0.5).toFixed(1)));
    onSeatSizeChange(next);
  }, [seatSize, onSeatSizeChange]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* 顶部说明 */}
      <div className="pointer-events-auto bg-white border-b shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              在底图座位上放置座位
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              点击放置座位。点击并拖拽调整位置。右键删除座位。
            </p>
          </div>
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="mt-auto pointer-events-auto bg-white border-t shadow-lg p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 座位尺寸控制 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">座位尺寸</span>
            <div className="flex items-center border rounded bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={handleSizeDecrease}
                disabled={seatSize <= 0.5}
                className="px-4 py-2 text-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              <span className="px-6 py-2 text-sm font-mono text-gray-800 min-w-[80px] text-center border-x select-none">
                {seatSize.toFixed(1)} pt
              </span>
              <button
                type="button"
                onClick={handleSizeIncrease}
                disabled={seatSize >= 100}
                className="px-4 py-2 text-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>

          {/* 警告提示 */}
          {!canProceed && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded">
              <span className="text-lg">⚠</span>
              <span>您必须至少放置 {MIN_SEATS_REQUIRED} 个座位。</span>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
            >
              ‹ 返回
            </Button>
            <Button
              onClick={onNext}
              disabled={!canProceed}
            >
              下一步 ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
