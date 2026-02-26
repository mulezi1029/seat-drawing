/**
 * 校准向导 - 步骤4：定义行间距
 * 参照 seats.io 的 "Define row spacing by dragging the highlighted row onto the next parallel row" 步骤
 */

import React from 'react';
import { Button } from '@/components/ui/button';

export interface SpacingStepProps {
  /** 是否已定义行间距 */
  hasDefinedSpacing: boolean;
  /** 返回上一步 */
  onBack: () => void;
  /** 进入下一步 */
  onNext: () => void;
}

export const SpacingStep: React.FC<SpacingStepProps> = ({
  hasDefinedSpacing,
  onBack,
  onNext,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* 顶部说明 */}
      <div className="pointer-events-auto bg-white border-b shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
            4
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
            通过拖拽高亮行到下一排平行行来定义行间距
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              点击并拖拽行来调整位置。确认后点击完成。
            </p>
          </div>
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="mt-auto pointer-events-auto bg-white border-t shadow-lg p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
            >
              ‹ 返回
            </Button>
            <Button
              onClick={onNext}
              disabled={!hasDefinedSpacing}
            >
              下一步 ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
