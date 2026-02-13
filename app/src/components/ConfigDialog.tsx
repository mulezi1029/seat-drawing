import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { DrawConfig, ViewConfig } from '@/types';

interface ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  drawConfig: DrawConfig;
  viewConfig: ViewConfig;
  onUpdateDrawConfig: (updates: Partial<DrawConfig>) => void;
  onUpdateViewConfig: (updates: Partial<ViewConfig>) => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
  isOpen,
  onClose,
  drawConfig,
  viewConfig,
  onUpdateDrawConfig,
  onUpdateViewConfig,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure drawing and view parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Drawing Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">Drawing Settings</h4>
            
            {/* Seat Radius */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Seat Radius</Label>
                <span className="text-sm text-slate-500">{drawConfig.seatRadius}px</span>
              </div>
              <Slider
                value={[drawConfig.seatRadius]}
                onValueChange={([v]) => onUpdateDrawConfig({ seatRadius: v })}
                min={4}
                max={20}
                step={1}
              />
            </div>

            {/* Seat Spacing */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Seat Spacing</Label>
                <span className="text-sm text-slate-500">{drawConfig.seatSpacing}px</span>
              </div>
              <Slider
                value={[drawConfig.seatSpacing]}
                onValueChange={([v]) => onUpdateDrawConfig({ seatSpacing: v })}
                min={10}
                max={50}
                step={2}
              />
              <p className="text-xs text-slate-400">
                Distance between seats in a row
              </p>
            </div>

            {/* Row Spacing */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Row Spacing</Label>
                <span className="text-sm text-slate-500">{drawConfig.rowSpacing}px</span>
              </div>
              <Slider
                value={[drawConfig.rowSpacing]}
                onValueChange={([v]) => onUpdateDrawConfig({ rowSpacing: v })}
                min={15}
                max={60}
                step={2}
              />
              <p className="text-xs text-slate-400">
                Distance between rows (for auto-numbering)
              </p>
            </div>

            {/* Default Color */}
            <div>
              <Label className="text-sm mb-2 block">Default Seat Color</Label>
              <div className="flex gap-2 flex-wrap">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'].map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      drawConfig.defaultColor === color ? 'border-slate-800' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onUpdateDrawConfig({ defaultColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* View Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">View Settings</h4>
            
            {/* Show Grid */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Show Grid</Label>
                <p className="text-xs text-slate-400">Display grid on canvas</p>
              </div>
              <Switch
                checked={viewConfig.showGrid}
                onCheckedChange={(v) => onUpdateViewConfig({ showGrid: v })}
              />
            </div>

            {/* Grid Size */}
            {viewConfig.showGrid && (
              <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                <div className="flex justify-between">
                  <Label className="text-sm">Grid Size</Label>
                  <span className="text-sm text-slate-500">{viewConfig.gridSize}px</span>
                </div>
                <Slider
                  value={[viewConfig.gridSize]}
                  onValueChange={([v]) => onUpdateViewConfig({ gridSize: v })}
                  min={5}
                  max={50}
                  step={5}
                />
              </div>
            )}

            {/* Snap to Grid */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Snap to Grid</Label>
                <p className="text-xs text-slate-400">Snap seats and sections to grid</p>
              </div>
              <Switch
                checked={viewConfig.snapToGrid}
                onCheckedChange={(v) => onUpdateViewConfig({ snapToGrid: v })}
              />
            </div>

            {/* Background Color */}
            <div>
              <Label className="text-sm mb-2 block">Canvas Background</Label>
              <div className="flex gap-2 flex-wrap">
                {['#f8fafc', '#ffffff', '#f1f5f9', '#e2e8f0', '#1e293b'].map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      viewConfig.backgroundColor === color ? 'border-blue-500' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onUpdateViewConfig({ backgroundColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
