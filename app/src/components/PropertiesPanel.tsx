/**
 * 属性面板组件 (PropertiesPanel)
 *
 * 右侧面板，根据当前选中的目标动态显示不同的属性内容
 *
 * 显示内容：
 * 1. 未选中区域时：显示所有区域列表（原 SectionPanel 功能）
 * 2. 选中单个区域但未进入编辑时：显示区域属性面板
 * 3. 进入区域编辑时：显示座位编辑面板（原 SeatPanel 功能）
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Edit2,
  Trash2,
  Check,
  X,
  LogIn,
  AlertTriangle,
  Armchair,
  Palette,
  Hash,
  Grid3x3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  ArrowLeftRight,
  ArrowUpDown,
  Move,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Section, Seat, AlignType, Category } from '@/types';

/**
 * 预设颜色列表
 */
const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#f97316',
];

/**
 * 属性面板 Props 接口
 */
interface PropertiesPanelProps {
  // 区域相关
  sections: Section[];
  selectedSectionId: string | null;
  currentSection: Section | null;
  // 座位相关
  selectedSeatIds: string[];
  // 类别相关
  categories: Category[];
  // 回调函数
  onEnterSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void;
  onUpdateSeat: (sectionId: string, seatId: string, updates: Partial<Seat>) => void;
  onDeleteSeat: (sectionId: string, seatId: string) => void;
  onClearSelection: () => void;
  onAlignSeats: (sectionId: string, seatIds: string[], alignType: AlignType) => void;
  onApplyCategoryToSeats?: (categoryId: string, seatIds: string[]) => void;
}

/**
 * 属性面板组件
 * 根据当前状态动态显示区域列表或座位编辑界面
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  sections,
  selectedSectionId,
  currentSection,
  selectedSeatIds,
  categories,
  onEnterSection,
  onDeleteSection,
  onUpdateSection,
  onUpdateSeat,
  onDeleteSeat,
  onClearSelection,
  onAlignSeats,
  onApplyCategoryToSeats,
}) => {
  // ========== 区域编辑状态 ==========
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  // ========== 座位编辑状态 ==========
  const [bulkRow, setBulkRow] = useState('');
  const [bulkStartNumber, setBulkStartNumber] = useState(1);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState('');
  const [editNumber, setEditNumber] = useState(1);
  const [editColor, setEditColor] = useState('');

  // 计算派生状态
  const selectedSeats = currentSection?.seats.filter(s => selectedSeatIds.includes(s.id)) || [];
  const hasMultipleSelection = selectedSeats.length > 1;

  /**
   * 当选中的座位变化时，重置编辑状态
   */
  useEffect(() => {
    setEditingSeatId(null);
    setEditRow('');
    setEditNumber(1);
    setEditColor('');
  }, [selectedSeatIds]);

  /**
   * 检查区域验证问题
   */
  const getSectionValidationIssues = (section: Section) => {
    const issues: string[] = [];
    if (section.seats.length === 0) {
      issues.push('No seats');
    }
    const labels = section.seats.map(s => `${s.row}-${s.number}`);
    const duplicates = labels.filter((item, index) => labels.indexOf(item) !== index);
    if (duplicates.length > 0) {
      issues.push('Duplicate labels');
    }
    return issues;
  };

  /**
   * 检查座位验证问题
   */
  const getSeatValidationIssues = () => {
    if (!currentSection) return [];
    const issues: { type: string; message: string }[] = [];

    const labels = currentSection.seats.map(s => `${s.row}-${s.number}`);
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

    const unlabeled = currentSection.seats.filter(s => !s.row || s.number <= 0);
    if (unlabeled.length > 0) {
      issues.push({ type: 'unlabeled', message: `${unlabeled.length} unlabeled seats` });
    }

    return issues;
  };

  // ========== 区域操作 ==========
  const startEditingSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
  };

  const saveSectionEditing = (sectionId: string) => {
    onUpdateSection(sectionId, { name: editSectionName });
    setEditingSectionId(null);
  };

  const cancelSectionEditing = () => {
    setEditingSectionId(null);
    setEditSectionName('');
  };

  // ========== 座位操作 ==========
  const handleBulkUpdate = () => {
    if (!currentSection || selectedSeats.length === 0) return;
    selectedSeats.forEach((seat, index) => {
      onUpdateSeat(currentSection.id, seat.id, {
        row: bulkRow || seat.row,
        number: bulkStartNumber + index,
      });
    });
  };

  const handleBulkColorUpdate = (color: string) => {
    if (!currentSection || selectedSeats.length === 0) return;
    selectedSeats.forEach((seat) => {
      onUpdateSeat(currentSection.id, seat.id, { color });
    });
  };

  const handleDeleteSelected = () => {
    if (!currentSection) return;
    selectedSeatIds.forEach(seatId => {
      onDeleteSeat(currentSection.id, seatId);
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
    if (!currentSection) return;
    onUpdateSeat(currentSection.id, seatId, {
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
    if (!currentSection || selectedSeatIds.length === 0) return;
    onAlignSeats(currentSection.id, selectedSeatIds, alignType);
  };

  // 获取当前选中的区域（无论是否进入编辑模式）
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;

  // ========== 渲染选中区域的属性面板（未进入编辑模式，只选中区域时）==========
  if (!currentSection && selectedSection) {
    const issues = getSectionValidationIssues(selectedSection);
    const hasIssues = issues.length > 0;

    return (
      <TooltipProvider delayDuration={200}>
        <div className="w-80 bg-white border-l flex flex-col h-full">
          {/* 头部 */}
          <div className="p-4 border-b flex-shrink-0 bg-slate-50">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold">Section Properties</h3>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* 区域名称 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                {editingSectionId === selectedSection.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editSectionName}
                      onChange={(e) => setEditSectionName(e.target.value)}
                      autoFocus
                      className="h-8"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => saveSectionEditing(selectedSection.id)} className="flex-1 h-7">
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelSectionEditing} className="h-7">
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: selectedSection.color }}
                    />
                    <span className="font-medium flex-1 truncate" title={selectedSection.name}>
                      {selectedSection.name}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => startEditingSection(selectedSection)} className="h-7 w-7 p-0">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Armchair className="w-4 h-4" />
                  <span>{selectedSection.seats.length} seats</span>
                </div>
                {hasIssues && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{issues.join(', ')}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* 颜色设置 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Palette className="w-4 h-4" /> Color
                </Label>
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${selectedSection.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateSection(selectedSection.id, { color })}
                    />
                  ))}
                </div>
              </div>

              {/* 透明度设置 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Palette className="w-4 h-4" /> Opacity
                </Label>
                <Slider
                  value={[selectedSection.opacity * 100]}
                  onValueChange={([v]) => onUpdateSection(selectedSection.id, { opacity: v / 100 })}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onEnterSection(selectedSection.id)}
                  className="flex-1"
                >
                  <LogIn className="w-4 h-4 mr-1" /> Enter to Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteSection(selectedSection.id)}
                  className="h-9 w-9 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Separator />

              {/* 说明 */}
              <div className="text-xs text-slate-500">
                <p>Double-click section on canvas to enter editing mode</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }

  // ========== 渲染座位编辑面板（仅在进入区域编辑模式时显示）==========
  if (currentSection) {
    const seatIssues = getSeatValidationIssues();

    return (
      <TooltipProvider delayDuration={200}>
        <div className="w-80 bg-white border-l flex flex-col h-full">
          {/* 头部 */}
          <div className="p-4 border-b flex-shrink-0 bg-slate-50">
            <div className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold">Seats</h3>
              <Badge variant="secondary" className="ml-auto">
                {currentSection.seats.length}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">in {currentSection.name}</p>

            {seatIssues.length > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <div className="flex items-center gap-1 text-amber-700 font-medium mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Issues found:</span>
                </div>
                {seatIssues.map((issue, i) => (
                  <div key={i} className="text-amber-600 pl-4">• {issue.message}</div>
                ))}
              </div>
            )}
          </div>

          {/* 主内容区 */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* 选择信息和快捷操作 */}
              {selectedSeats.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedSeats.length} selected
                    </span>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={onClearSelection} className="h-7 w-7 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Clear selection (Esc)</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={handleDeleteSelected} className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete selected (Del)</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600">Use arrow keys to nudge seats</div>
                </div>
              )}

              {/* 对齐工具 */}
              {hasMultipleSelection && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                    <Move className="w-4 h-4" /> Align & Distribute
                  </h4>
                  <div className="grid grid-cols-4 gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('left')} className="h-8"><AlignLeft className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Align left</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('center')} className="h-8"><AlignCenter className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Align center</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('right')} className="h-8"><AlignRight className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Align right</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('distribute-h')} className="h-8"><ArrowLeftRight className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Distribute horizontally</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('top')} className="h-8"><AlignVerticalJustifyStart className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Align top</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('middle')} className="h-8"><AlignVerticalJustifyCenter className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Align middle</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('bottom')} className="h-8"><AlignVerticalJustifyEnd className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Align bottom</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => handleAlign('distribute-v')} className="h-8"><ArrowUpDown className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Distribute vertically</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* 批量编辑 */}
              {selectedSeats.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                    <Grid3x3 className="w-4 h-4" /> Bulk Edit
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Row Prefix</Label>
                        <Input value={bulkRow} onChange={(e) => setBulkRow(e.target.value)} placeholder="e.g., A" className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">Start Number</Label>
                        <Input type="number" value={bulkStartNumber} onChange={(e) => setBulkStartNumber(parseInt(e.target.value) || 1)} min={1} className="h-8" />
                      </div>
                    </div>
                    <Button size="sm" className="w-full h-8" onClick={handleBulkUpdate}>Apply to Selection</Button>
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1 mb-2"><Palette className="w-3 h-3" /> Color</Label>
                    <div className="flex gap-1 flex-wrap">
                      {PRESET_COLORS.map(color => (
                        <button key={color} className="w-6 h-6 rounded-full border-2 border-transparent hover:border-slate-400 transition-all hover:scale-110" style={{ backgroundColor: color }} onClick={() => handleBulkColorUpdate(color)} />
                      ))}
                    </div>
                  </div>
                  {/* 类别选择 */}
                  {categories.length > 0 && onApplyCategoryToSeats && (
                    <div>
                      <Label className="text-xs flex items-center gap-1 mb-2">Category</Label>
                      <div className="flex gap-1 flex-wrap">
                        {categories.map(category => (
                          <button
                            key={category.id}
                            className="px-2 py-1 text-xs rounded border transition-all hover:scale-105"
                            style={{
                              backgroundColor: category.color + '20',
                              borderColor: category.color,
                              color: category.color,
                            }}
                            onClick={() => onApplyCategoryToSeats(category.id, selectedSeatIds)}
                            title={`${category.name}${category.price ? ` - $${category.price}` : ''}`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 座位列表 */}
              <Separator />
              <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                <Hash className="w-4 h-4" /> All Seats
              </h4>
              <div className="space-y-1">
                {currentSection.seats.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <Armchair className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No seats yet</p>
                    <p className="text-xs mt-1">Use tools to add seats</p>
                  </div>
                )}
                {currentSection.seats.map((seat) => (
                  <div key={seat.id} className={`p-2 rounded text-sm border transition-all ${selectedSeatIds.includes(seat.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}>
                    {editingSeatId === seat.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Row</Label>
                            <Input value={editRow} onChange={(e) => setEditRow(e.target.value)} className="h-7" />
                          </div>
                          <div>
                            <Label className="text-xs">Number</Label>
                            <Input type="number" value={editNumber} onChange={(e) => setEditNumber(parseInt(e.target.value) || 1)} min={1} className="h-7" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {PRESET_COLORS.map(color => (
                              <button key={color} className={`w-5 h-5 rounded-full border-2 ${editColor === color ? 'border-slate-800' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setEditColor(color)} />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => saveSeatEdit(seat.id)} className="flex-1 h-7"><Check className="w-4 h-4 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={cancelSeatEdit} className="h-7"><X className="w-4 h-4 text-red-600" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0 border border-slate-200" style={{ backgroundColor: seat.color || '#3b82f6' }} />
                        <span className="flex-1 font-medium">{seat.row}-{seat.number}</span>
                        <span className="text-xs text-slate-400 font-mono">{Math.round(seat.x)},{Math.round(seat.y)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => startEditingSeat(seat)} className="h-6 w-6 p-0"><Edit2 className="w-3 h-3" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit seat</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => onDeleteSeat(currentSection.id, seat.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete seat</p></TooltipContent>
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
  }

  // ========== 渲染区域列表面板 ==========
  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-80 bg-white border-l flex flex-col h-full">
        <div className="p-4 border-b flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold">Sections</h3>
            <Badge variant="secondary" className="ml-auto">{sections.length}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">Double-click section on canvas to edit</p>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {sections.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No sections yet</p>
                <p className="text-xs mt-1">Draw a section on the canvas</p>
              </div>
            )}

            {sections.map((section) => {
              const issues = getSectionValidationIssues(section);
              const hasIssues = issues.length > 0;

              return (
                <div key={section.id} className={`p-3 rounded-lg border transition-all duration-200 ${selectedSectionId === section.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                  {editingSectionId === section.id ? (
                    <div className="space-y-2">
                      <Input value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} autoFocus className="h-8" />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => saveSectionEditing(section.id)} className="flex-1 h-7"><Check className="w-4 h-4 text-green-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={cancelSectionEditing} className="h-7"><X className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: section.color }} />
                        <span className="font-medium flex-1 truncate" title={section.name}>{section.name}</span>
                        {hasIssues && (
                          <Tooltip>
                            <TooltipTrigger><AlertTriangle className="w-4 h-4 text-amber-500" /></TooltipTrigger>
                            <TooltipContent><p>{issues.join(', ')}</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <Armchair className="w-3 h-3" />
                        <span>{section.seats.length} seats</span>
                      </div>

                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => onEnterSection(section.id)} className="flex-1 h-7 text-xs">
                              <LogIn className="w-3 h-3 mr-1" /> Edit
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Enter section to edit seats</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => startEditingSection(section)} className="h-7 w-7 p-0"><Edit2 className="w-3 h-3" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit name</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => onDeleteSection(section.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete section</p></TooltipContent>
                        </Tooltip>
                      </div>

                      {selectedSectionId === section.id && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1"><Palette className="w-3 h-3" /> Opacity</Label>
                            <Slider value={[section.opacity * 100]} onValueChange={([v]) => onUpdateSection(section.id, { opacity: v / 100 })} min={0} max={100} step={5} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-2"><Palette className="w-3 h-3" /> Color</Label>
                            <div className="flex gap-1 flex-wrap">
                              {PRESET_COLORS.map(color => (
                                <button key={color} className={`w-5 h-5 rounded-full border-2 transition-all ${section.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: color }} onClick={() => onUpdateSection(section.id, { color })} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};
