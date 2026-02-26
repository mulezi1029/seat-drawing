/**
 * useSectionEdit - 区域编辑状态管理 Hook
 *
 * 功能：
 * - 进入/退出区域编辑模式
 * - 校准数据管理
 * - 完成校准后保存
 */

import { useState, useCallback } from 'react';
import type {
  Section,
  SectionEditState,
  CalibrationData,
  Seat,
} from '@/types';

/** 默认校准数据 */
const DEFAULT_CALIBRATION: CalibrationData = {
  canvasScale: 1,
  anchorScale: 1,
  seatVisual: {
    size: 20,
    gapX: 5,
    gapY: 5,
  },
  isCalibrated: false,
};

/** useSectionEdit 参数 */
export interface UseSectionEditParams {
  /** 保存校准数据到 Section 的回调 */
  onSaveCalibration?: (sectionId: string, calibrationData: CalibrationData) => void;
  /** 保存座位数据到 Section 的回调 */
  onSaveSeats?: (sectionId: string, seats: Seat[]) => void;
}

/** useSectionEdit 返回值 */
export interface UseSectionEditReturn {
  /** 区域编辑状态 */
  state: SectionEditState;
  /** 进入编辑模式 */
  enterEditMode: (section: Section, selectedCount?: number) => boolean;
  /** 退出编辑模式 */
  exitEditMode: () => void;
  /** 更新校准数据 */
  updateCalibration: (updates: Partial<CalibrationData>) => void;
  /** 完成校准，保存并切换到编辑阶段 */
  completeCalibration: () => void;
  /** 重置校准参数 */
  resetCalibration: () => void;
  /** 设置未保存更改标记 */
  setHasUnsavedChanges: (value: boolean) => void;
  /** 保存座位数据 */
  saveSeats: (seats: Seat[]) => void;
}

/**
 * 区域编辑状态管理 Hook
 *
 * @param params 配置参数
 * @returns 状态和操作方法
 */
export function useSectionEdit(
  params: UseSectionEditParams = {}
): UseSectionEditReturn {
  const { onSaveCalibration, onSaveSeats } = params;

  const [state, setState] = useState<SectionEditState>({
    isActive: false,
    sectionId: null,
    phase: 'calibrating',
    calibration: { ...DEFAULT_CALIBRATION },
    hasUnsavedChanges: false,
  });

  const enterEditMode = useCallback(
    (section: Section, selectedCount = 1): boolean => {
      if (selectedCount > 1) {
        return false;
      }

      if (section.points.length < 3) {
        return false;
      }

      const hasCalibration = section.calibrationData?.isCalibrated;
      const calibration = section.calibrationData ?? { ...DEFAULT_CALIBRATION };

      setState({
        isActive: true,
        sectionId: section.id,
        phase: hasCalibration ? 'editing' : 'calibrating',
        calibration,
        hasUnsavedChanges: false,
      });

      return true;
    },
    []
  );

  const exitEditMode = useCallback(() => {
    setState({
      isActive: false,
      sectionId: null,
      phase: 'calibrating',
      calibration: { ...DEFAULT_CALIBRATION },
      hasUnsavedChanges: false,
    });
  }, []);

  const updateCalibration = useCallback((updates: Partial<CalibrationData>) => {
    setState((prev) => ({
      ...prev,
      calibration: {
        ...prev.calibration,
        ...updates,
        seatVisual: updates.seatVisual
          ? { ...prev.calibration.seatVisual, ...updates.seatVisual }
          : prev.calibration.seatVisual,
      },
    }));
  }, []);

  const completeCalibration = useCallback(() => {
    setState((prev) => {
      if (!prev.sectionId) return prev;

      const calibrationData: CalibrationData = {
        ...prev.calibration,
        isCalibrated: true,
        anchorScale: prev.calibration.canvasScale,
      };

      onSaveCalibration?.(prev.sectionId, calibrationData);

      return {
        ...prev,
        phase: 'editing' as const,
        calibration: calibrationData,
      };
    });
  }, [onSaveCalibration]);

  const resetCalibration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      calibration: { ...DEFAULT_CALIBRATION },
    }));
  }, []);

  const setHasUnsavedChanges = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hasUnsavedChanges: value }));
  }, []);

  const saveSeats = useCallback((seats: Seat[]) => {
    if (state.sectionId) {
      onSaveSeats?.(state.sectionId, seats);
      setHasUnsavedChanges(false);
    }
  }, [state.sectionId, onSaveSeats, setHasUnsavedChanges]);

  return {
    state,
    enterEditMode,
    exitEditMode,
    updateCalibration,
    completeCalibration,
    resetCalibration,
    setHasUnsavedChanges,
    saveSeats,
  };
}
