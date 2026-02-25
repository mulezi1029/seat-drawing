/**
 * 座位类别管理 Hook
 *
 * 管理座位类别的 CRUD 操作，包括：
 * - 创建、更新、删除类别
 * - 将类别应用到座位或区域
 * - 默认类别初始化
 */

import { useState, useCallback } from 'react';
import type { Category, Seat, Section } from '@/types';

/**
 * 默认类别列表
 */
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'vip', name: 'VIP', color: '#ef4444', price: 200, icon: 'crown' },
  { id: 'standard', name: 'Standard', color: '#3b82f6', price: 100, icon: 'seat' },
  { id: 'economy', name: 'Economy', color: '#10b981', price: 50, icon: 'seat' },
  { id: 'accessible', name: 'Accessible', color: '#f59e0b', price: 80, icon: 'wheelchair' },
];

export interface UseCategoriesReturn {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string | undefined) => Category | undefined;
  applyCategoryToSeats: (section: Section, seatIds: string[], categoryId: string) => Seat[];
  applyCategoryToSection: (section: Section, categoryId: string) => Seat[];
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  /**
   * 生成唯一 ID
   */
  const generateId = () => `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * 添加新类别
   */
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
    };
    setCategories(prev => [...prev, newCategory]);
  }, []);

  /**
   * 更新类别
   */
  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev =>
      prev.map(cat => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  }, []);

  /**
   * 删除类别
   */
  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  }, []);

  /**
   * 根据 ID 获取类别
   */
  const getCategoryById = useCallback((id: string | undefined) => {
    if (!id) return undefined;
    return categories.find(cat => cat.id === id);
  }, [categories]);

  /**
   * 将类别应用到选中的座位
   */
  const applyCategoryToSeats = useCallback((section: Section, seatIds: string[], categoryId: string): Seat[] => {
    const category = getCategoryById(categoryId);
    if (!category) return section.seats;

    return section.seats.map(seat =>
      seatIds.includes(seat.id)
        ? { ...seat, categoryId, color: category.color }
        : seat
    );
  }, [getCategoryById]);

  /**
   * 将类别应用到整个区域
   */
  const applyCategoryToSection = useCallback((section: Section, categoryId: string): Seat[] => {
    const category = getCategoryById(categoryId);
    if (!category) return section.seats;

    return section.seats.map(seat => ({
      ...seat,
      categoryId,
      color: category.color,
    }));
  }, [getCategoryById]);

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    applyCategoryToSeats,
    applyCategoryToSection,
  };
}
