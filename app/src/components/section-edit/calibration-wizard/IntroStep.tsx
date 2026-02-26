/**
 * 校准向导 - 介绍页
 * 参照 seats.io 的 "Reference chart calibration" 介绍页
 */

import React from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface IntroStepProps {
  onNext: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
      <div className="max-w-md text-center space-y-6">
        {/* 图标 */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center shadow-lg">
            <Wrench className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900">
          参考图校准
        </h1>

        {/* 说明 */}
        <p className="text-lg text-gray-600 leading-relaxed">
          此向导将帮助您找到上传图像的正确比例，通过在底图上放置和调整虚拟座位来完成校准。
        </p>

        {/* 开始按钮 */}
        <Button
          size="lg"
          onClick={onNext}
          className="mt-8 px-8"
        >
          下一步 ›
        </Button>
      </div>
    </div>
  );
};
