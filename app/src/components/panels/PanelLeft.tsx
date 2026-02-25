/**
 * 左侧工具栏 - 占位组件
 *
 * 包含：选择工具、节点工具、区域工具、座位工具、图形工具等
 */

import React from 'react';
import {
  MousePointer2,
  MousePointerClick,
  Brush,
  CircleDot,
  Square,
  Hand,
  Focus,
  Circle,
  MoreHorizontal,
  Route,
  Hexagon,
  Grid3x3,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, tooltip, shortcut, active, onClick }) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <button
        tabIndex={-1}
        onClick={onClick}
        className={`
          relative w-10 h-10 flex items-center justify-center rounded-md
          transition-all duration-200
          ${active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}
        `}
      >
        {icon}
        {shortcut && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] font-medium text-gray-400">
            {shortcut}
          </span>
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={8}>
      <div className="flex items-center gap-2">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400">
            {shortcut}
          </kbd>
        )}
      </div>
    </TooltipContent>
  </Tooltip>
);

interface PanelLeftProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export const PanelLeft: React.FC<PanelLeftProps> = ({ activeTool, onToolChange }) => {
  return (
    <TooltipProvider>
      <div className="w-14 bg-white border-r flex flex-col items-center py-3 gap-1">
      {/* 选择工具组 */}
      <ToolButton
        icon={<MousePointer2 className="w-5 h-5" />}
        tooltip="Select tool"
        shortcut="V"
        active={activeTool === 'select'}
        onClick={() => onToolChange('select')}
      />
      <ToolButton
        icon={<MousePointerClick className="w-5 h-5" />}
        tooltip="Select seats tool"
        shortcut="X"
        active={activeTool === 'select-seats'}
        onClick={() => onToolChange('select-seats')}
      />
      <ToolButton
        icon={<Brush className="w-5 h-5" />}
        tooltip="Selection brush tool"
        shortcut="C"
        active={activeTool === 'brush'}
        onClick={() => onToolChange('brush')}
      />

      <div className="w-8 h-px bg-gray-200 my-1" />

      {/* 绘制工具组 */}
      <ToolButton
        icon={<Focus className="w-5 h-5" />}
        tooltip="Focal point tool"
        shortcut="F"
        active={activeTool === 'focal'}
        onClick={() => onToolChange('focal')}
      />
      <ToolButton
        icon={<Square className="w-5 h-5" />}
        tooltip="Rectangular Section tool"
        shortcut="S"
        active={activeTool === 'section'}
        onClick={() => onToolChange('section')}
      />
      <ToolButton
        icon={<CircleDot className="w-5 h-5" />}
        tooltip="Round Table tool"
        shortcut="E"
        active={activeTool === 'table'}
        onClick={() => onToolChange('table')}
      />
      <ToolButton
        icon={<Square className="w-5 h-5 rotate-45" />}
        tooltip="Rectangular Area tool"
        shortcut="G"
        active={activeTool === 'area'}
        onClick={() => onToolChange('area')}
      />
      <ToolButton
        icon={<Hexagon className="w-5 h-5" />}
        tooltip="Polygon tool"
        shortcut="P"
        active={activeTool === 'polygon'}
        onClick={() => onToolChange('polygon')}
      />

      <div className="w-8 h-px bg-gray-200 my-1" />

      {/* 座位工具组 */}
      <ToolButton
        icon={<Circle className="w-5 h-5" />}
        tooltip="Single seat tool"
        shortcut="1"
        active={activeTool === 'single'}
        onClick={() => onToolChange('single')}
      />
      <ToolButton
        icon={<MoreHorizontal className="w-5 h-5" />}
        tooltip="Row seats tool"
        shortcut="2"
        active={activeTool === 'row'}
        onClick={() => onToolChange('row')}
      />
      <ToolButton
        icon={<Route className="w-5 h-5" />}
        tooltip="Line seats tool"
        shortcut="3"
        active={activeTool === 'line'}
        onClick={() => onToolChange('line')}
      />
      <ToolButton
        icon={<Grid3x3 className="w-5 h-5" />}
        tooltip="Multi-rows seats tool"
        shortcut="4"
        active={activeTool === 'multi-rows'}
        onClick={() => onToolChange('multi-rows')}
      />

      <div className="flex-1" />

      {/* 平移工具 */}
      <ToolButton
        icon={<Hand className="w-5 h-5" />}
        tooltip="Hand tool"
        shortcut="Space"
        active={activeTool === 'hand'}
        onClick={() => onToolChange('hand')}
      />
    </div>
    </TooltipProvider>
  );
};
