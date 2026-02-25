/**
 * 类别管理面板组件
 *
 * 显示和管理座位类别，包括：
 * - 类别列表显示（颜色、名称、价格）
 * - 添加/编辑/删除类别
 * - 将类别应用到选中的座位或区域
 */

import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Palette,
  DollarSign,
  Type,
  Crown,
  Armchair,
  Accessibility,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Category, Section } from '@/types';

/**
 * 预设颜色列表
 */
const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#f97316',
  '#14b8a6', '#a855f7', '#64748b', '#94a3b8', '#cbd5e1',
];

/**
 * 图标选项
 */
const ICON_OPTIONS = [
  { value: 'seat', label: 'Seat', icon: Armchair },
  { value: 'crown', label: 'VIP', icon: Crown },
  { value: 'wheelchair', label: 'Accessible', icon: Accessibility },
];

interface CategoryPanelProps {
  categories: Category[];
  currentSection: Section | null;
  selectedSectionId: string | null;
  selectedSeatIds: string[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onApplyToSeats: (categoryId: string) => void;
  onApplyToSection: (categoryId: string, sectionId: string) => void;
}

export const CategoryPanel: React.FC<CategoryPanelProps> = ({
  categories,
  currentSection,
  selectedSectionId,
  selectedSeatIds,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onApplyToSeats,
  onApplyToSection,
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formPrice, setFormPrice] = useState('');
  const [formIcon, setFormIcon] = useState('seat');

  /**
   * 开始添加新类别
   */
  const startAdding = () => {
    setIsAdding(true);
    setFormName('');
    setFormColor(PRESET_COLORS[0]);
    setFormPrice('');
    setFormIcon('seat');
  };

  /**
   * 开始编辑类别
   */
  const startEditing = (category: Category) => {
    setEditingCategoryId(category.id);
    setFormName(category.name);
    setFormColor(category.color);
    setFormPrice(category.price?.toString() || '');
    setFormIcon(category.icon || 'seat');
  };

  /**
   * 取消编辑
   */
  const cancelEditing = () => {
    setEditingCategoryId(null);
    setIsAdding(false);
    setFormName('');
    setFormColor(PRESET_COLORS[0]);
    setFormPrice('');
    setFormIcon('seat');
  };

  /**
   * 保存类别（添加或更新）
   */
  const saveCategory = () => {
    if (!formName.trim()) return;

    const categoryData = {
      name: formName.trim(),
      color: formColor,
      price: formPrice ? parseFloat(formPrice) : undefined,
      icon: formIcon,
    };

    if (isAdding) {
      onAddCategory(categoryData);
      setIsAdding(false);
    } else if (editingCategoryId) {
      onUpdateCategory(editingCategoryId, categoryData);
      setEditingCategoryId(null);
    }

    // 重置表单
    setFormName('');
    setFormColor(PRESET_COLORS[0]);
    setFormPrice('');
    setFormIcon('seat');
  };

  /**
   * 获取图标组件
   */
  const getIconComponent = (iconName: string | undefined) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    const IconComponent = iconOption?.icon || Armchair;
    return <IconComponent className="w-4 h-4" />;
  };

  /**
   * 检查是否可以应用到座位
   * 需要在区域编辑模式且有选中的座位
   */
  const canApplyToSeats = currentSection && selectedSeatIds.length > 0;

  /**
   * 检查是否可以应用到区域
   * 需要选中或进入某个区域
   */
  const targetSectionId = currentSection?.id || selectedSectionId;
  const canApplyToSection = !!targetSectionId;

  return (
    <div className="w-80 bg-white border-l flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b flex-shrink-0 bg-slate-50">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold">Categories</h3>
          <Badge variant="secondary" className="ml-auto">
            {categories.length}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Manage seat categories and pricing
        </p>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* 应用提示 */}
          {targetSectionId && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Apply Category
              </p>
              <p className="text-xs text-blue-600 mb-3">
                Select a category below to apply
              </p>
              {selectedSeatIds.length > 0 && (
                <p className="text-xs text-blue-600">
                  {selectedSeatIds.length} seats selected
                </p>
              )}
            </div>
          )}

          {/* 添加按钮 */}
          {!isAdding && (
            <Button
              variant="outline"
              className="w-full"
              onClick={startAdding}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          )}

          {/* 添加/编辑表单 */}
          {(isAdding || editingCategoryId) && (
            <div className="p-4 border rounded-lg space-y-4 bg-slate-50">
              <h4 className="font-medium text-sm">
                {isAdding ? 'New Category' : 'Edit Category'}
              </h4>

              {/* 名称 */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Type className="w-3 h-3" /> Name
                </Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., VIP"
                  className="h-8"
                />
              </div>

              {/* 颜色 */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Color
                </Label>
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        formColor === color
                          ? 'border-slate-800 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* 价格 */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Price (optional)
                </Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                  step={0.01}
                  className="h-8"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={saveCategory}
                  disabled={!formName.trim()}
                  className="flex-1 h-8"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditing}
                  className="h-8"
                >
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          )}

          {/* 分隔线 */}
          <div className="border-t" />

          {/* 类别列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">
              All Categories
            </h4>
            {categories.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No categories yet</p>
                <p className="text-xs mt-1">Add a category to get started</p>
              </div>
            )}
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-3 border rounded-lg hover:border-slate-300 transition-all group"
              >
                {editingCategoryId === category.id ? null : (
                  <div className="flex items-center gap-3">
                    {/* 颜色指示器 */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    >
                      <span className="text-white text-xs">
                        {getIconComponent(category.icon)}
                      </span>
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {category.name}
                      </p>
                      {category.price !== undefined && (
                        <p className="text-xs text-slate-500">
                          ${category.price.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 应用到座位 */}
                      {canApplyToSeats && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onApplyToSeats(category.id)}
                              className="h-7 w-7 p-0"
                            >
                              <Armchair className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Apply to {selectedSeatIds.length} selected seats</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* 应用到区域 */}
                      {canApplyToSection && selectedSeatIds.length === 0 && targetSectionId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onApplyToSection(category.id, targetSectionId)}
                              className="h-7 w-7 p-0"
                            >
                              <Tag className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Apply to all seats in section</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(category)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit category</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteCategory(category.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete category</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
