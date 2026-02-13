import React, { useState, useEffect } from 'react';
import { 
  Armchair, 
  Trash2, 
  Grid3x3,
  Hash,
  Palette,
  X,
  Edit3,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  ArrowLeftRight,
  ArrowUpDown,
  Move,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Seat, Section, AlignType } from '@/types';

interface SeatPanelProps {
  section: Section | null;
  selectedSeatIds: string[];
  onUpdateSeat: (sectionId: string, seatId: string, updates: Partial<Seat>) => void;
  onDeleteSeat: (sectionId: string, seatId: string) => void;
  onClearSelection: () => void;
  onAlignSeats: (sectionId: string, seatIds: string[], alignType: AlignType) => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#f97316',
];

export const SeatPanel: React.FC<SeatPanelProps> = ({
  section,
  selectedSeatIds,
  onUpdateSeat,
  onDeleteSeat,
  onClearSelection,
  onAlignSeats,
}) => {
  const [bulkRow, setBulkRow] = useState('');
  const [bulkStartNumber, setBulkStartNumber] = useState(1);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState('');
  const [editNumber, setEditNumber] = useState(1);
  const [editColor, setEditColor] = useState('');

  const selectedSeats = section?.seats.filter(s => selectedSeatIds.includes(s.id)) || [];
  const hasMultipleSelection = selectedSeats.length > 1;
  
  useEffect(() => {
    setEditingSeatId(null);
    setEditRow('');
    setEditNumber(1);
    setEditColor('');
  }, [selectedSeatIds]);

  // Check for validation issues
  const getValidationIssues = () => {
    if (!section) return [];
    const issues: { type: string; message: string }[] = [];
    
    // Check for duplicate labels
    const labels = section.seats.map(s => `${s.row}-${s.number}`);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    labels.forEach(label => {
      if (seen.has(label)) {
        duplicates.add(label);
      }
      seen.add(label);
    });
    if (duplicates.size > 0) {
      issues.push({ type: 'duplicate', message: `${duplicates.size} duplicate seat labels` });
    }
    
    // Check for unlabeled seats
    const unlabeled = section.seats.filter(s => !s.row || s.number <= 0);
    if (unlabeled.length > 0) {
      issues.push({ type: 'unlabeled', message: `${unlabeled.length} unlabeled seats` });
    }
    
    return issues;
  };

  const issues = getValidationIssues();

  const handleBulkUpdate = () => {
    if (!section || selectedSeats.length === 0) return;
    selectedSeats.forEach((seat, index) => {
      onUpdateSeat(section.id, seat.id, {
        row: bulkRow || seat.row,
        number: bulkStartNumber + index,
      });
    });
  };

  const handleBulkColorUpdate = (color: string) => {
    if (!section || selectedSeats.length === 0) return;
    selectedSeats.forEach((seat) => {
      onUpdateSeat(section.id, seat.id, { color });
    });
  };

  const handleDeleteSelected = () => {
    if (!section) return;
    selectedSeatIds.forEach(seatId => {
      onDeleteSeat(section.id, seatId);
    });
    onClearSelection();
  };

  const startEditingSeat = (seat: Seat) => {
    setEditingSeatId(seat.id);
    setEditRow(seat.row);
    setEditNumber(seat.number);
    setEditColor(seat.color || '#3b82f6');
  };

  const saveSeatEdit = (seatId: string) => {
    if (!section) return;
    onUpdateSeat(section.id, seatId, {
      row: editRow,
      number: editNumber,
      color: editColor,
    });
    setEditingSeatId(null);
  };

  const cancelSeatEdit = () => {
    setEditingSeatId(null);
  };

  const handleAlign = (alignType: AlignType) => {
    if (!section || selectedSeatIds.length === 0) return;
    onAlignSeats(section.id, selectedSeatIds, alignType);
  };

  if (!section) {
    return (
      <div className="w-80 bg-white border-l flex flex-col h-full">
        <div className="p-4 border-b flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold">Seats</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center">
            <Armchair className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Enter a section to edit seats</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-80 bg-white border-l flex flex-col h-full">
        <div className="p-4 border-b flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold">Seats</h3>
            <Badge variant="secondary" className="ml-auto">
              {section.seats.length}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            in {section.name}
          </p>
          
          {/* Validation warnings */}
          {issues.length > 0 && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <div className="flex items-center gap-1 text-amber-700 font-medium mb-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Issues found:</span>
              </div>
              {issues.map((issue, i) => (
                <div key={i} className="text-amber-600 pl-4">
                  • {issue.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Selection Info & Actions */}
            {selectedSeats.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedSeats.length} selected
                  </span>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onClearSelection}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear selection (Esc)</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleDeleteSelected}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete selected (Del)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                <div className="text-xs text-blue-600">
                  Use arrow keys to nudge seats
                </div>
              </div>
            )}

            {/* Alignment Tools */}
            {hasMultipleSelection && (
              <div className="space-y-3">
                <Separator />
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <Move className="w-4 h-4" />
                  Align & Distribute
                </h4>
                <div className="grid grid-cols-4 gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('left')} className="h-8">
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Align left</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('center')} className="h-8">
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Align center</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('right')} className="h-8">
                        <AlignRight className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Align right</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('distribute-h')} className="h-8">
                        <ArrowLeftRight className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Distribute horizontally</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('top')} className="h-8">
                        <AlignVerticalJustifyStart className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Align top</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('middle')} className="h-8">
                        <AlignVerticalJustifyCenter className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Align middle</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('bottom')} className="h-8">
                        <AlignVerticalJustifyEnd className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Align bottom</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => handleAlign('distribute-v')} className="h-8">
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Distribute vertically</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Bulk Edit */}
            {selectedSeats.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <Grid3x3 className="w-4 h-4" />
                  Bulk Edit
                </h4>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Row Prefix</Label>
                      <Input
                        value={bulkRow}
                        onChange={(e) => setBulkRow(e.target.value)}
                        placeholder="e.g., A"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Start Number</Label>
                      <Input
                        type="number"
                        value={bulkStartNumber}
                        onChange={(e) => setBulkStartNumber(parseInt(e.target.value) || 1)}
                        min={1}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full h-8"
                    onClick={handleBulkUpdate}
                  >
                    Apply to Selection
                  </Button>
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1 mb-2">
                    <Palette className="w-3 h-3" />
                    Color
                  </Label>
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border-2 border-transparent hover:border-slate-400 transition-all hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() => handleBulkColorUpdate(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Seat List */}
            <Separator />
            <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
              <Hash className="w-4 h-4" />
              All Seats
            </h4>
            
            <div className="space-y-1">
              {section.seats.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  <Armchair className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No seats yet</p>
                  <p className="text-xs mt-1">Use tools to add seats</p>
                </div>
              )}
              
              {section.seats.map((seat) => (
                <div
                  key={seat.id}
                  className={`p-2 rounded text-sm border transition-all ${
                    selectedSeatIds.includes(seat.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  {editingSeatId === seat.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Row</Label>
                          <Input
                            value={editRow}
                            onChange={(e) => setEditRow(e.target.value)}
                            className="h-7"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Number</Label>
                          <Input
                            type="number"
                            value={editNumber}
                            onChange={(e) => setEditNumber(parseInt(e.target.value) || 1)}
                            min={1}
                            className="h-7"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Color</Label>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {PRESET_COLORS.map(color => (
                            <button
                              key={color}
                              className={`w-5 h-5 rounded-full border-2 ${
                                editColor === color ? 'border-slate-800' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveSeatEdit(seat.id)}
                          className="flex-1 h-7"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelSeatEdit}
                          className="h-7"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 border border-slate-200"
                        style={{ backgroundColor: seat.color || '#3b82f6' }}
                      />
                      <span className="flex-1 font-medium">
                        {seat.row}-{seat.number}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {Math.round(seat.x)},{Math.round(seat.y)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingSeat(seat)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit seat</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteSeat(section.id, seat.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete seat</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};
