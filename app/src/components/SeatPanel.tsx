/**
 * 座位面板组件 (SeatPanel)
 *
 * 右侧面板，显示和管理选中区域的座位信息
 *
 * 功能包括：
 * 1. 显示选中区域的所有座位列表
 * 2. 单个座位编辑（行号、座位号、颜色）
 * 3. 批量编辑选中座位（行号前缀、起始座位号、颜色）
 * 4. 座位对齐和分布（左/中/右对齐、上/中/下对齐、水平/竖直分布）
 * 5. 座位删除操作
 * 6. 数据验证（检查重复标签、未标记的座位）
 * 7. 座位位置显示（X、Y 坐标）
 */

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

/**
 * 座位面板 Props 接口
 * 定义了面板接收的所有属性和回调函数
 */
interface SeatPanelProps {
  section: Section | null;                 // 当前编辑的区域，null 表示未选中区域
  selectedSeatIds: string[];               // 选中的座位 ID 数组
  onUpdateSeat: (sectionId: string, seatId: string, updates: Partial<Seat>) => void;  // 更新座位的回调函数
  onDeleteSeat: (sectionId: string, seatId: string) => void;  // 删除座位的回调函数
  onClearSelection: () => void;            // 清除座位选择的回调函数
  onAlignSeats: (sectionId: string, seatIds: string[], alignType: AlignType) => void;  // 对齐座位的回调函数
}

/**
 * 预设颜色列表
 * 用户可以快速为座位选择这些颜色
 * 包括：蓝色、红色、绿色、黄色、紫色等
 */
const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#f97316',
];

/**
 * 座位面板组件
 * 右侧面板，用于管理和编辑选中区域的座位信息
 */
export const SeatPanel: React.FC<SeatPanelProps> = ({
  section,
  selectedSeatIds,
  onUpdateSeat,
  onDeleteSeat,
  onClearSelection,
  onAlignSeats,
}) => {
  // ========== 状态管理 ==========
  // 批量编辑选中座位的状态
  const [bulkRow, setBulkRow] = useState('');              // 批量编辑的行号前缀
  const [bulkStartNumber, setBulkStartNumber] = useState(1);  // 批量编辑的起始座位号

  // 单个座位编辑的状态
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);  // 正在编辑的座位 ID
  const [editRow, setEditRow] = useState('');              // 编辑中的行号
  const [editNumber, setEditNumber] = useState(1);         // 编辑中的座位号
  const [editColor, setEditColor] = useState('');          // 编辑中的座位颜色

  // 计算派生状态
  const selectedSeats = section?.seats.filter(s => selectedSeatIds.includes(s.id)) || [];  // 选中的座位对象数组
  const hasMultipleSelection = selectedSeats.length > 1;  // 是否有多个座位被选中

  /**
   * 当选中的座位变化时，重置单个座位的编辑状态
   * 确保打开新座位编辑时不会显示上一个座位的数据
   */
  useEffect(() => {
    setEditingSeatId(null);
    setEditRow('');
    setEditNumber(1);
    setEditColor('');
  }, [selectedSeatIds]);

  /**
   * 检查数据验证问题
   * 检查内容：
   * 1. 重复的座位标签（相同的行号-座位号组合）
   * 2. 未标记的座位（没有行号或座位号为 0）
   *
   * @returns {Array} 问题列表，每个问题包含类型和描述消息
   */
  const getValidationIssues = () => {
    if (!section) return [];
    const issues: { type: string; message: string }[] = [];

    // 检查重复的座位标签
    const labels = section.seats.map(s => `${s.row}-${s.number}`);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    labels.forEach(label => {
      if (seen.has(label)) {
        duplicates.add(label);  // 添加到重复集合
      }
      seen.add(label);
    });
    if (duplicates.size > 0) {
      issues.push({ type: 'duplicate', message: `${duplicates.size} duplicate seat labels` });
    }

    // 检查未标记的座位
    const unlabeled = section.seats.filter(s => !s.row || s.number <= 0);
    if (unlabeled.length > 0) {
      issues.push({ type: 'unlabeled', message: `${unlabeled.length} unlabeled seats` });
    }

    return issues;
  };

  const issues = getValidationIssues();

  /**
   * 批量更新选中座位的行号和座位号
   * 如果行号为空，则保持每个座位的原行号
   * 座位号从 startNumber 开始递增
   */
  const handleBulkUpdate = () => {
    if (!section || selectedSeats.length === 0) return;
    selectedSeats.forEach((seat, index) => {
      onUpdateSeat(section.id, seat.id, {
        row: bulkRow || seat.row,  // 使用输入的行号，或保持原行号
        number: bulkStartNumber + index,  // 座位号从 startNumber 开始递增
      });
    });
  };

  /**
   * 批量更新选中座位的颜色
   */
  const handleBulkColorUpdate = (color: string) => {
    if (!section || selectedSeats.length === 0) return;
    selectedSeats.forEach((seat) => {
      onUpdateSeat(section.id, seat.id, { color });
    });
  };

  /**
   * 删除所有选中的座位
   * 完成后清除座位选择
   */
  const handleDeleteSelected = () => {
    if (!section) return;
    selectedSeatIds.forEach(seatId => {
      onDeleteSeat(section.id, seatId);
    });
    onClearSelection();  // 删除后清除选择状态
  };

  /**
   * 开始编辑单个座位
   * 将座位的当前信息加载到编辑表单
   */
  const startEditingSeat = (seat: Seat) => {
    setEditingSeatId(seat.id);
    setEditRow(seat.row);
    setEditNumber(seat.number);
    setEditColor(seat.color || '#3b82f6');  // 使用座位颜色或默认蓝色
  };

  /**
   * 保存单个座位的编辑
   */
  const saveSeatEdit = (seatId: string) => {
    if (!section) return;
    onUpdateSeat(section.id, seatId, {
      row: editRow,
      number: editNumber,
      color: editColor,
    });
    setEditingSeatId(null);  // 关闭编辑模式
  };

  /**
   * 取消单个座位的编辑
   */
  const cancelSeatEdit = () => {
    setEditingSeatId(null);
  };

  /**
   * 对齐选中的座位
   */
  const handleAlign = (alignType: AlignType) => {
    if (!section || selectedSeatIds.length === 0) return;
    onAlignSeats(section.id, selectedSeatIds, alignType);
  };

  // 如果没有选中区域，显示空状态提示
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

  // 选中区域时显示完整的座位管理面板
  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-80 bg-white border-l flex flex-col h-full">
        {/* 头部：显示区域名称和座位总数 */}
        <div className="p-4 border-b flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold">Seats</h3>
            {/* 座位数量徽章 */}
            <Badge variant="secondary" className="ml-auto">
              {section.seats.length}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            in {section.name}
          </p>

          {/* 数据验证警告 */}
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

        {/* 主内容区：可滚动 */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* 选择信息和快捷操作 */}
            {selectedSeats.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedSeats.length} selected  {/* 显示选中座位数 */}
                  </span>
                  <div className="flex gap-1">
                    {/* 清除选择按钮 */}
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

                    {/* 删除选中座位按钮 */}
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

            {/* 座位对齐和分布工具（仅当选中多个座位时显示） */}
            {hasMultipleSelection && (
              <div className="space-y-3">
                <Separator />
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <Move className="w-4 h-4" />
                  Align & Distribute
                </h4>
                <div className="grid grid-cols-4 gap-1">
                  {/* 左对齐 */}
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

                  {/* 居中对齐 */}
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

                  {/* 右对齐 */}
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

                  {/* 水平分布 */}
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

                  {/* 上对齐 */}
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

                  {/* 中间对齐 */}
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

                  {/* 下对齐 */}
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

                  {/* 竖直分布 */}
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

            {/* 批量编辑（仅当有座位被选中时显示） */}
            {selectedSeats.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <Grid3x3 className="w-4 h-4" />
                  Bulk Edit
                </h4>

                <div className="space-y-2">
                  {/* 批量编辑行号和座位号 */}
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

                {/* 批量编辑颜色 */}
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

            {/* 座位列表 */}
            <Separator />
            <h4 className="text-sm font-medium flex items-center gap-2 text-slate-700">
              <Hash className="w-4 h-4" />
              All Seats
            </h4>

            <div className="space-y-1">
              {/* 空状态：没有座位 */}
              {section.seats.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  <Armchair className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No seats yet</p>
                  <p className="text-xs mt-1">Use tools to add seats</p>
                </div>
              )}

              {/* 座位列表项 */}
              {section.seats.map((seat) => (
                <div
                  key={seat.id}
                  className={`p-2 rounded text-sm border transition-all ${
                    selectedSeatIds.includes(seat.id)
                      ? 'bg-blue-50 border-blue-200'  // 选中状态
                      : 'hover:bg-slate-50 border-transparent'  // 未选中状态
                  }`}
                >
                  {editingSeatId === seat.id ? (
                    // 编辑模式
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
                    // 查看模式
                    <div className="flex items-center gap-2">
                      {/* 座位颜色指示器 */}
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 border border-slate-200"
                        style={{ backgroundColor: seat.color || '#3b82f6' }}
                      />
                      {/* 座位标签 */}
                      <span className="flex-1 font-medium">
                        {seat.row}-{seat.number}
                      </span>
                      {/* 座位坐标 */}
                      <span className="text-xs text-slate-400 font-mono">
                        {Math.round(seat.x)},{Math.round(seat.y)}
                      </span>
                      {/* 编辑按钮 */}
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
                      {/* 删除按钮 */}
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
