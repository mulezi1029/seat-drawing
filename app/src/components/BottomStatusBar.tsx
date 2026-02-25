/**
 * 底部状态栏组件
 *
 * 参照 seats.io 布局，底部状态栏显示：
 * 1. 当前缩放比例
 * 2. 画布坐标信息
 * 3. 选中对象数量
 * 4. 操作提示
 */

import React from 'react';
import { Minus, Plus, Maximize, RotateCcw, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EditorMode } from '@/types';

interface BottomStatusBarProps {
  zoom: number;
  mode: EditorMode;
  selectedSeatCount: number;
  totalSeatCount: number;
  sectionCount: number;
  drawingPointsCount?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  onFitToView: () => void;
  onResetView: () => void;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  zoom,
  mode,
  selectedSeatCount,
  totalSeatCount,
  sectionCount,
  drawingPointsCount = 0,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onFitToView,
  onResetView,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  // 获取模式显示文本
  const getModeText = () => {
    switch (mode) {
      case 'view':
        return 'View Mode';
      case 'draw-section':
        return 'Drawing Section';
      case 'draw-seat':
        return 'Editing Seats';
      default:
        return 'View Mode';
    }
  };

  // 获取操作提示文本
  const getOperationHints = () => {
    if (mode === 'draw-section') {
      const hints = [];
      hints.push('Click: 插入节点');
      if (drawingPointsCount > 0) {
        hints.push('Right Click: 移除最后节点');
        hints.push('Ctrl+Z: 撤销节点');
      }
      if (drawingPointsCount >= 3) {
        hints.push('点击起点: 自动闭合');
        hints.push('Enter: 完成绘制');
      }
      hints.push('Esc: 取消');
      return hints.join(' • ');
    }
    return null;
  };

  const operationHints = getOperationHints();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-9 bg-white border-t flex items-center px-3 gap-4 text-sm">
        {/* 左侧：模式信息 */}
        <div className="flex items-center gap-2 text-slate-600">
          <MousePointer2 className="w-4 h-4" />
          <span>{getModeText()}</span>
        </div>

        <div className="w-px h-4 bg-slate-200" />

        {/* 操作提示 */}
        {operationHints && (
          <>
            <div className="flex items-center text-xs text-blue-600 font-medium">
              {operationHints}
            </div>
            <div className="w-px h-4 bg-slate-200" />
          </>
        )}

        {/* 中间：对象统计 */}
        <div className="flex items-center gap-4 text-slate-600">
          <span>{sectionCount} sections</span>
          <span>{totalSeatCount} seats</span>
          {selectedSeatCount > 0 && (
            <span className="text-blue-600 font-medium">
              {selectedSeatCount} selected
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* 右侧：缩放控制 */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onResetView}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset View</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onFitToView}
              >
                <Maximize className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fit to View</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* 缩放控制 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onZoomOut}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 w-32">
            <Slider
              value={[zoom]}
              onValueChange={([v]) => onZoomChange(v)}
              min={1}
              max={10}
              step={0.05}
              className="flex-1"
            />
            <span className="text-xs text-slate-500 w-12 text-right">
              {zoomPercent}%
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onZoomIn}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
