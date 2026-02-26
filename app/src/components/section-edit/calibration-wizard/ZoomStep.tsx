/**
 * 校准向导 - 步骤1：缩放到长排座位
 * 参照 seats.io 的 "Find a long row and zoom into it" 步骤
 */

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';

export interface ZoomStepProps {
  /** 当前缩放级别 (0.5-10) */
  zoomLevel: number;
  /** 缩放变化回调 */
  onZoomChange: (zoom: number) => void;
  /** 返回上一步 */
  onBack: () => void;
  /** 进入下一步 */
  onNext: () => void;
}

export const ZoomStep: React.FC<ZoomStepProps> = ({
  zoomLevel,
  onZoomChange,
  onBack,
  onNext,
}) => {
  const handleZoomDecrease = useCallback(() => {
    const next = Math.max(0.5, parseFloat((zoomLevel - 0.1).toFixed(1)));
    onZoomChange(next);
  }, [zoomLevel, onZoomChange]);

  const handleZoomIncrease = useCallback(() => {
    const next = Math.min(10, parseFloat((zoomLevel + 0.1).toFixed(1)));
    onZoomChange(next);
  }, [zoomLevel, onZoomChange]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* 顶部说明 */}
      <div className="pointer-events-auto bg-white border-b shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              找到一排长座位并放大
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              点击并拖拽移动画布。使用底部控件或 Ctrl+滚轮缩放。
            </p>
          </div>
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="mt-auto pointer-events-auto bg-white border-t shadow-lg p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
          {/* 缩放控制 */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">缩放级别</span>
            <div className="flex items-center border rounded bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={handleZoomDecrease}
                disabled={zoomLevel <= 0.5}
                className="px-4 py-2 text-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              <span className="px-6 py-2 text-sm font-mono text-gray-800 min-w-[80px] text-center border-x select-none">
                {Math.round(zoomLevel * 100)} %
              </span>
              <button
                type="button"
                onClick={handleZoomIncrease}
                disabled={zoomLevel >= 10}
                className="px-4 py-2 text-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>

          {/* 导航按钮 */}
          <div className="flex items-center gap-3">
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
