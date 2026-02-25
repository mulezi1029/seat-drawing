/**
 * 左侧工具栏组件 (参照 seats.io 布局)
 *
 * 垂直工具栏位于界面左侧，包含：
 * 1. 文件操作区：上传、导出、导入
 * 2. 编辑操作区：撤销、重做
 * 3. 工具选择区：根据当前模式显示不同工具
 *    - 视图模式：选择、绘制区域
 *    - 座位编辑模式：选择、单个、行、线
 * 4. 画布工具区：平移、网格设置
 *
 * 垂直布局，图标+Tooltip 的简洁设计
 */

import React from 'react';
import {
  Square,
  MousePointer2,
  Circle,
  Rows3,
  Route,
  LogOut,
  Settings2,
  Badge,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EditorMode, SeatTool } from '@/types';

/**
 * 工具按钮组件
 */
interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon: Icon,
  label,
  shortcut,
  isActive,
  isDisabled,
  onClick,
  variant = 'default'
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={isActive ? 'default' : 'ghost'}
        size="icon"
        onClick={onClick}
        disabled={isDisabled}
        className={`h-10 w-10 ${variant === 'danger' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : ''}`}
      >
        <Icon className="w-5 h-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="right">
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && <span className="text-xs text-slate-400">({shortcut})</span>}
      </div>
    </TooltipContent>
  </Tooltip>
);

/**
 * 工具栏组件的 Props 接口
 */
interface ToolbarProps {
  mode: EditorMode;
  seatTool: SeatTool;
  hasSvg: boolean;
  isInSection: boolean;
  onModeChange: (mode: Exclude<EditorMode, 'edit-section'>) => void;
  onSeatToolChange: (tool: SeatTool) => void;
  onExitSection: () => void;
  onShowConfig: () => void;
}

/**
 * 左侧垂直工具栏组件
 *
 * 参照 seats.io 的 designer 布局，将工具栏放置在左侧
 * 使用图标按钮 + Tooltip 的简洁设计
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  seatTool,
  hasSvg,
  isInSection,
  onModeChange,
  onSeatToolChange,
  onExitSection,
  onShowConfig,
}) => {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-14 bg-white border-r flex flex-col items-center py-3 gap-1">
        {/* ========== 绘制工具区（根据模式切换）========== */}
        {!isInSection ? (
          <>
            {/* 视图模式工具 */}
            <ToolButton
              icon={MousePointer2}
              label="Select"
              isActive={mode === 'view'}
              onClick={() => onModeChange('view')}
            />
            <ToolButton
              icon={Square}
              label="Draw Section"
              shortcut="Polygon tool"
              isActive={mode === 'draw-section'}
              isDisabled={!hasSvg}
              onClick={() => onModeChange('draw-section')}
            />
          </>
        ) : (
          <>
            {/* 座位编辑模式工具 */}
            <div className="px-2 py-1">
              <Badge className="text-[10px] w-full justify-center">
                Seat Tools
              </Badge>
            </div>
            <ToolButton
              icon={MousePointer2}
              label="Select"
              shortcut="V"
              isActive={seatTool === 'select'}
              onClick={() => onSeatToolChange('select')}
            />
            <ToolButton
              icon={Circle}
              label="Single Seat"
              shortcut="S"
              isActive={seatTool === 'single'}
              onClick={() => onSeatToolChange('single')}
            />
            <ToolButton
              icon={Rows3}
              label="Row"
              shortcut="R"
              isActive={seatTool === 'row'}
              onClick={() => onSeatToolChange('row')}
            />
            <ToolButton
              icon={Route}
              label="Line"
              shortcut="L"
              isActive={seatTool === 'line'}
              onClick={() => onSeatToolChange('line')}
            />

            <Separator className="my-2 w-8" />

            {/* 配置按钮 */}
            <ToolButton
              icon={Settings2}
              label="Settings"
              onClick={onShowConfig}
            />

            <Separator className="my-2 w-8" />

            {/* 退出按钮 */}
            <ToolButton
              icon={LogOut}
              label="Exit Section"
              variant="danger"
              onClick={onExitSection}
            />
          </>
        )}

      </div>
    </TooltipProvider>
  );
};
