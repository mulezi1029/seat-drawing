/**
 * useSelection Hook
 *
 * 选择管理 Hook，负责管理区域和座位的选择状态。
 * 使用 Set 替代 Array 以提升性能和简化逻辑。
 *
 * 功能：
 * - 管理区域选择 (单选)
 * - 管理座位选择 (多选，支持 Shift 模式)
 * - 提供选择查询函数
 * - 支持全选/清空
 */

import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionReturn {
  /** 当前选中的区域 ID */
  selectedSectionId: string | null;
  /** 设置选中的区域 ID */
  setSelectedSectionId: (id: string | null) => void;
  /** 当前选中的座位 ID 集合 */
  selectedSeatIds: Set<string>;
  /** 当前选中的座位 ID 数组 (兼容现有组件) */
  selectedSeatIdsArray: string[];
  /** 选择单个座位 (替换当前选择) */
  selectSeat: (seatId: string) => void;
  /** 切换座位选择状态 (Shift 多选模式) */
  toggleSeatSelection: (seatId: string) => void;
  /** 批量选择座位 */
  selectSeats: (seatIds: string[]) => void;
  /** 全选指定区域内的座位 */
  selectAllSeatsInSection: (sectionId: string | null, getSeatIds: () => string[]) => void;
  /** 清空座位选择 */
  clearSeatSelection: () => void;
  /** 检查座位是否被选中 */
  isSeatSelected: (seatId: string) => boolean;
  /** 清空所有选择 */
  clearAll: () => void;
}

export function useSelection(): UseSelectionReturn {
  // 区域选择 (单选)
  const [selectedSectionId, setSelectedSectionIdState] = useState<string | null>(null);

  // 座位选择 (多选，使用 Set)
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());

  // 兼容性：转换为数组
  const selectedSeatIdsArray = useMemo(() => Array.from(selectedSeatIds), [selectedSeatIds]);

  // 设置选中的区域
  const setSelectedSectionId = useCallback((id: string | null) => {
    setSelectedSectionIdState(id);
    // 切换区域时，清空座位选择
    if (id !== selectedSectionId) {
      setSelectedSeatIds(new Set());
    }
  }, [selectedSectionId]);

  // 选择单个座位 (替换当前选择)
  const selectSeat = useCallback((seatId: string) => {
    setSelectedSeatIds(new Set([seatId]));
  }, []);

  // 切换座位选择状态 (Shift 多选模式)
  const toggleSeatSelection = useCallback((seatId: string) => {
    setSelectedSeatIds(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  }, []);

  // 批量选择座位
  const selectSeats = useCallback((seatIds: string[]) => {
    setSelectedSeatIds(new Set(seatIds));
  }, []);

  // 全选指定区域内的座位
  const selectAllSeatsInSection = useCallback((
    sectionId: string | null,
    getSeatIds: () => string[]
  ) => {
    if (!sectionId) return;
    const seatIds = getSeatIds();
    setSelectedSeatIds(new Set(seatIds));
  }, []);

  // 清空座位选择
  const clearSeatSelection = useCallback(() => {
    setSelectedSeatIds(new Set());
  }, []);

  // 检查座位是否被选中
  const isSeatSelected = useCallback((seatId: string) => {
    return selectedSeatIds.has(seatId);
  }, [selectedSeatIds]);

  // 清空所有选择
  const clearAll = useCallback(() => {
    setSelectedSectionIdState(null);
    setSelectedSeatIds(new Set());
  }, []);

  return {
    selectedSectionId,
    setSelectedSectionId,
    selectedSeatIds,
    selectedSeatIdsArray,
    selectSeat,
    toggleSeatSelection,
    selectSeats,
    selectAllSeatsInSection,
    clearSeatSelection,
    isSeatSelected,
    clearAll,
  };
}
