/**
 * 工具栏组件
 *
 * 工具栏是应用的主要交互界面，包含：
 * 1. 文件操作：上传 SVG、导出、导入
 * 2. 编辑操作：撤销、重做
 * 3. 画布工具：自动模式、平移模式
 * 4. 编辑模式：视图、绘制区域
 * 5. 座位工具：选择、单个、行、线
 * 6. 配置：绘制设置
 * 7. 视图控制：网格、吸附、缩放、视图重置
 *
 * 根据当前编辑模式和上下文动态显示/隐藏相关按钮
 */

import React, { useState } from 'react';
import {
  Upload,
  Square,
  MousePointer2,
  Circle,
  Rows3,
  Route,
  LogOut,
  RotateCcw,
  Download,
  FolderOpen,
  Undo2,
  Redo2,
  Settings2,
  Hand,
  Grid3x3,
  Maximize,
  Minus,
  Plus,
  Eye,
  EyeOff,
  Magnet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EditorMode, SeatTool, CanvasTool, ViewConfig } from '@/types';

/**
 * 工具栏组件的 Props 接口
 * 定义了所有需要传入的属性和回调函数
 */
interface ToolbarProps {
  mode: EditorMode;                    // 当前编辑模式
  seatTool: SeatTool;                  // 当前座位工具
  canvasTool: CanvasTool;              // 当前画布工具
  hasSvg: boolean;                     // 是否已上传 SVG 底图
  isInSection: boolean;                // 是否在区域编辑模式中
  zoom: number;                        // 当前缩放比例
  viewConfig: ViewConfig;              // 视图配置
  canUndo: boolean;                    // 是否可以撤销
  canRedo: boolean;                    // 是否可以重做
  onUploadClick: () => void;           // 上传 SVG 的回调
  onModeChange: (mode: EditorMode) => void;  // 编辑模式变化的回调
  onSeatToolChange: (tool: SeatTool) => void;  // 座位工具变化的回调
  onCanvasToolChange: (tool: CanvasTool) => void;  // 画布工具变化的回调
  onExitSection: () => void;           // 退出区域编辑的回调
  onZoomIn: () => void;                // 放大的回调
  onZoomOut: () => void;               // 缩小的回调
  onZoomChange: (zoom: number) => void;  // 缩放值变化的回调
  onResetView: () => void;             // 重置视图的回调
  onFitToView: () => void;             // 适配到视图的回调
  onExport: () => void;                // 导出数据的回调
  onImport: () => void;                // 导入数据的回调
  onUndo: () => void;                  // 撤销的回调
  onRedo: () => void;                  // 重做的回调
  onShowConfig: () => void;            // 显示配置对话框的回调
  onToggleGrid: () => void;            // 切换网格显示的回调
  onToggleSnap: () => void;            // 切换网格吸附的回调
}

/**
 * 工具栏函数组件
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  seatTool,
  canvasTool,
  hasSvg,
  isInSection,
  zoom,
  viewConfig,
  canUndo,
  canRedo,
  onUploadClick,
  onModeChange,
  onSeatToolChange,
  onCanvasToolChange,
  onExitSection,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onResetView,
  onFitToView,
  onExport,
  onImport,
  onUndo,
  onRedo,
  onShowConfig,
  onToggleGrid,
  onToggleSnap,
}) => {
  // 本地状态：是否显示缩放滑块
  const [showZoomSlider, setShowZoomSlider] = useState(false);

  // 计算缩放百分比用于显示
  const zoomPercent = Math.round(zoom * 100);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 p-3 bg-white border-b shadow-sm">
        {/* ========== 第一组：文件操作 ========== */}
        <div className="flex items-center gap-1">
          {/* 上传 SVG 文件按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onUploadClick}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload SVG
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload venue floor plan</p>
            </TooltipContent>
          </Tooltip>

          {/* 导出数据按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onExport}
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export configuration</p>
            </TooltipContent>
          </Tooltip>

          {/* 导入数据按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onImport}
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Import configuration</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* ========== 第二组：撤销/重做 ========== */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* ========== 第三组：画布工具 ========== */}
        <div className="flex items-center gap-1">
          {/* 自动模式 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canvasTool === 'auto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCanvasToolChange('auto')}
                className="gap-2"
              >
                <MousePointer2 className="w-4 h-4" />
                Auto
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Auto mode - Hold Space to pan</p>
            </TooltipContent>
          </Tooltip>

          {/* 平移模式 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canvasTool === 'pan' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCanvasToolChange('pan')}
                className="gap-2"
              >
                <Hand className="w-4 h-4" />
                Pan
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pan mode - Drag to move canvas</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* ========== 第四组：编辑模式和座位工具（条件渲染）========== */}
        {/* 仅在不在区域编辑模式时显示编辑模式选择 */}
        {!isInSection && (
          <div className="flex items-center gap-1">
            {/* 选择/查看模式 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === 'view' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onModeChange('view')}
                  className="gap-2"
                >
                  <MousePointer2 className="w-4 h-4" />
                  Select
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Double-click section to edit</p>
              </TooltipContent>
            </Tooltip>

            {/* 绘制区域模式 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === 'draw-section' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onModeChange('draw-section')}
                  disabled={!hasSvg}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Draw Section
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to draw polygon sections</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* 仅在区域编辑模式时显示座位工具 */}
        {isInSection && (
          <>
            <div className="flex items-center gap-1">
              {/* 区域模式标签 */}
              <Badge variant="secondary" className="mr-2">
                Section Mode
              </Badge>

              {/* 选择工具 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={seatTool === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSeatToolChange('select')}
                    className="gap-2"
                  >
                    <MousePointer2 className="w-4 h-4" />
                    Select
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select seats (V) - Alt+Drag for lasso</p>
                </TooltipContent>
              </Tooltip>

              {/* 单个座位工具 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={seatTool === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSeatToolChange('single')}
                    className="gap-2"
                  >
                    <Circle className="w-4 h-4" />
                    Single
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Single seat (S)</p>
                </TooltipContent>
              </Tooltip>

              {/* 行工具 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={seatTool === 'row' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSeatToolChange('row')}
                    className="gap-2"
                  >
                    <Rows3 className="w-4 h-4" />
                    Row
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Row of seats (R)</p>
                </TooltipContent>
              </Tooltip>

              {/* 线工具 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={seatTool === 'line' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSeatToolChange('line')}
                    className="gap-2"
                  >
                    <Route className="w-4 h-4" />
                    Line
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Line of seats (L)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* 配置按钮 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onShowConfig}
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Drawing Settings</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-8" />

            {/* 退出区域编辑模式按钮 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExitSection}
                  className="gap-2 text-orange-600 hover:text-orange-700"
                >
                  <LogOut className="w-4 h-4" />
                  Exit
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exit section editing</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* 占位符：将后续元素推向右侧 */}
        <div className="flex-1" />

        {/* ========== 第五组：视图选项 ========== */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View Options</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* 网格显示/隐藏 */}
              <DropdownMenuItem onClick={onToggleGrid}>
                {viewConfig.showGrid ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                {viewConfig.showGrid ? 'Hide Grid' : 'Show Grid'}
              </DropdownMenuItem>

              {/* 网格吸附 */}
              <DropdownMenuItem onClick={onToggleSnap}>
                <Magnet className={`w-4 h-4 mr-2 ${viewConfig.snapToGrid ? 'text-blue-500' : ''}`} />
                Snap to Grid
                {viewConfig.snapToGrid && <span className="ml-auto text-blue-500">✓</span>}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 适配到视图 */}
              <DropdownMenuItem onClick={onFitToView}>
                <Maximize className="w-4 h-4 mr-2" />
                Fit to View
              </DropdownMenuItem>

              {/* 重置视图 */}
              <DropdownMenuItem onClick={onResetView}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* ========== 第六组：缩放控制 ========== */}
        <div className="flex items-center gap-1">
          {/* 缩小按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onZoomOut}>
                <Minus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          {/* 缩放显示和滑块 */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-16"
                  onClick={() => setShowZoomSlider(!showZoomSlider)}
                >
                  {zoomPercent}%
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to adjust zoom</p>
              </TooltipContent>
            </Tooltip>

            {/* 缩放滑块下拉菜单 */}
            {showZoomSlider && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border rounded-lg shadow-lg p-3 z-50 w-48">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">100%</span>
                  <Slider
                    value={[zoom]}
                    onValueChange={([v]) => onZoomChange(v)}
                    min={1}
                    max={10}
                    step={0.05}
                  />
                  <span className="text-xs text-slate-400">1000%</span>
                </div>
                <div className="text-center text-xs text-slate-500 mt-2">
                  {zoomPercent}%
                </div>
              </div>
            )}
          </div>

          {/* 放大按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onZoomIn}>
                <Plus className="w-4 h-4" />
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
