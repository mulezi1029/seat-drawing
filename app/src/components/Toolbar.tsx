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

interface ToolbarProps {
  mode: EditorMode;
  seatTool: SeatTool;
  canvasTool: CanvasTool;
  hasSvg: boolean;
  isInSection: boolean;
  zoom: number;
  viewConfig: ViewConfig;
  canUndo: boolean;
  canRedo: boolean;
  onUploadClick: () => void;
  onModeChange: (mode: EditorMode) => void;
  onSeatToolChange: (tool: SeatTool) => void;
  onCanvasToolChange: (tool: CanvasTool) => void;
  onExitSection: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  onFitToView: () => void;
  onExport: () => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowConfig: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
}

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
  const [showZoomSlider, setShowZoomSlider] = useState(false);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 p-3 bg-white border-b shadow-sm">
        {/* File Operations */}
        <div className="flex items-center gap-1">
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

        {/* Undo/Redo */}
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

        {/* Canvas Tools */}
        <div className="flex items-center gap-1">
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

        {/* View Controls */}
        {!isInSection && (
          <div className="flex items-center gap-1">
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

        {/* Seat Tools */}
        {isInSection && (
          <>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="mr-2">
                Section Mode
              </Badge>
              
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

        <div className="flex-1" />

        {/* View Options */}
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
              <DropdownMenuItem onClick={onToggleGrid}>
                {viewConfig.showGrid ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                {viewConfig.showGrid ? 'Hide Grid' : 'Show Grid'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleSnap}>
                <Magnet className={`w-4 h-4 mr-2 ${viewConfig.snapToGrid ? 'text-blue-500' : ''}`} />
                Snap to Grid
                {viewConfig.snapToGrid && <span className="ml-auto text-blue-500">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onFitToView}>
                <Maximize className="w-4 h-4 mr-2" />
                Fit to View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetView}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
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
            
            {showZoomSlider && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border rounded-lg shadow-lg p-3 z-50 w-48">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">10%</span>
                  <Slider
                    value={[zoom]}
                    onValueChange={([v]) => onZoomChange(v)}
                    min={0.1}
                    max={10}
                    step={0.05}
                  />
                  <span className="text-xs text-slate-400">500%</span>
                </div>
                <div className="text-center text-xs text-slate-500 mt-2">
                  {zoomPercent}%
                </div>
              </div>
            )}
          </div>
          
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
