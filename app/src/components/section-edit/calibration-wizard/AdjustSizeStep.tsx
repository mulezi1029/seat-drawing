/**
 * 校准向导 - 步骤3：确认座位尺寸
 * 参照 seats.io 的 "Seat size was automatically adjusted" 和 "Confirm seat size" 步骤
 */

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';

export interface AdjustSizeStepProps {
  /** 自动计算的座位尺寸 */
  calculatedSize: number;
  /** 用户调整后的座位尺寸 */
  confirmedSize: number;
  /** 座位尺寸变化回调 */
  onSeatSizeChange: (size: number) => void;
  /** 返回上一步 */
  onBack: () => void;
  /** 进入下一步 */
  onNext: () => void;
}

export const AdjustSizeStep: React.FC<AdjustSizeStepProps> = ({
  calculatedSize,
  confirmedSize,
  onSeatSizeChange,
  onBack,
  onNext,
}) => {
  const isAutoAdjusted = Math.abs(calculatedSize - confirmedSize) < 0.1;

  const handleSizeDecrease = useCallback(() => {
    const next = Math.max(0.5, parseFloat((confirmedSize - 0.5).toFixed(1)));
    onSeatSizeChange(next);
  }, [confirmedSize, onSeatSizeChange]);

  const handleSizeIncrease = useCallback(() => {
    const next = Math.min(100, parseFloat((confirmedSize + 0.1).toFixed(1)));
    onSeatSizeChange(next);
  }, [confirmedSize, onSeatSizeChange]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* 顶部说明 */}
      <div className="pointer-events-auto bg-white border-b shadow-sm p-4">
        <div className="flex items-start gap-3">
          {isAutoAdjusted ? (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-2xl">ℹ</span>
            </div>
          ) : (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
              3
            </div>
          )}
          <div className="flex-1">
            {isAutoAdjusted ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  座位尺寸已自动调整
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  这是推荐的尺寸，以获得最佳的图表可读性。
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  确认座位尺寸
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  如果建议的尺寸不太适合您的布局，您可以手动调整。
                </p>
              </>
            )}
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
                disabled={confirmedSize <= 0.5}
                className="px-4 py-2 text-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              <span className="px-6 py-2 text-sm font-mono text-gray-800 min-w-[80px] text-center border-x select-none">
                {confirmedSize.toFixed(1)} pt
              </span>
              <button
                type="button"
                onClick={handleSizeIncrease}
                disabled={confirmedSize >= 100}
                className="px-4 py-2 text-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>

          {/* 导航按钮 */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
            >
              ‹ 返回
            </Button>
            <Button onClick={onNext}>
              下一步 ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
