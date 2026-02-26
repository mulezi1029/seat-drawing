/**
 * 校准向导 - 完成页
 * 参照 seats.io 的 "Reference chart was calibrated" 完成页
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CompleteStepProps {
  onDone: () => void;
}

export const CompleteStep: React.FC<CompleteStepProps> = ({ onDone }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
      <div className="max-w-md text-center space-y-6">
        {/* 成功图标 */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900">
          参考图已校准
        </h1>

        {/* 说明 */}
        <p className="text-lg text-gray-600 leading-relaxed">
          您现在可以开始在参考图上绘制座位了。
        </p>

        {/* 完成按钮 */}
        <Button
          size="lg"
          onClick={onDone}
          className="mt-8 px-8"
        >
          完成
        </Button>
      </div>
    </div>
  );
};
