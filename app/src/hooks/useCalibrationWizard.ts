/**
 * useCalibrationWizard - 校准向导状态管理 Hook
 * 参照 seats.io 的交互式校准流程
 */

import { useState, useCallback } from 'react';
import type {
  CalibrationStep,
  CalibrationWizardState,
  PlacedCalibrationSeat,
} from '@/types/calibration';

export interface UseCalibrationWizardReturn {
  /** 向导状态 */
  state: CalibrationWizardState;
  /** 进入下一步 */
  nextStep: () => void;
  /** 返回上一步 */
  prevStep: () => void;
  /** 跳转到指定步骤 */
  goToStep: (step: CalibrationStep) => void;
  /** 添加放置的座位 */
  addPlacedSeat: (seat: PlacedCalibrationSeat) => void;
  /** 移除放置的座位 */
  removePlacedSeat: (seatId: string) => void;
  /** 更新座位位置 */
  updateSeatPosition: (seatId: string, x: number, y: number) => void;
  /** 设置计算出的座位尺寸 */
  setCalculatedSize: (size: number) => void;
  /** 设置用户确认的座位尺寸 */
  setConfirmedSize: (size: number) => void;
  /** 设置行间距 */
  setRowSpacing: (spacing: number) => void;
  /** 重置向导 */
  reset: () => void;
}

const INITIAL_STATE: CalibrationWizardState = {
  currentStep: 'intro',
  placedSeats: [],
  calculatedSize: null,
  confirmedSize: null,
  firstRow: null,
  secondRow: null,
  calculatedRowSpacing: null,
};

const STEP_ORDER: CalibrationStep[] = [
  'intro',
  'zoom',
  'place',
  'adjust',
  'spacing',
  'complete',
];

/**
 * 计算座位尺寸（基于放置的座位间距）
 */
function calculateSeatSize(seats: PlacedCalibrationSeat[]): number {
  if (seats.length < 2) return 20;

  // 计算相邻座位的平均间距
  const distances: number[] = [];
  for (let i = 0; i < seats.length - 1; i++) {
    const dx = seats[i + 1].x - seats[i].x;
    const dy = seats[i + 1].y - seats[i].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    distances.push(distance);
  }

  const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  
  // 假设座位尺寸约为间距的 70%
  const calculatedSize = avgDistance * 0.7;
  
  // 四舍五入到 0.1
  return Math.round(calculatedSize * 10) / 10;
}

/**
 * 识别第一排座位（Y坐标最小的一组座位）
 */
function identifyFirstRow(seats: PlacedCalibrationSeat[]): PlacedCalibrationSeat[] {
  if (seats.length === 0) return [];

  // 按 Y 坐标排序
  const sorted = [...seats].sort((a, b) => a.y - b.y);
  
  // 找到第一排（Y坐标相近的座位）
  const firstY = sorted[0].y;
  const threshold = 50; // Y坐标差异阈值
  
  const firstRow = sorted.filter(seat => Math.abs(seat.y - firstY) < threshold);
  
  // 按 X 坐标排序
  return firstRow.sort((a, b) => a.x - b.x);
}

export function useCalibrationWizard(): UseCalibrationWizardReturn {
  const [state, setState] = useState<CalibrationWizardState>(INITIAL_STATE);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.currentStep);
      if (currentIndex < STEP_ORDER.length - 1) {
        const nextStep = STEP_ORDER[currentIndex + 1];
        
        // 从 place 步骤进入 adjust 步骤时，自动计算座位尺寸
        if (prev.currentStep === 'place' && nextStep === 'adjust') {
          const calculatedSize = calculateSeatSize(prev.placedSeats);
          return {
            ...prev,
            currentStep: nextStep,
            calculatedSize,
            confirmedSize: calculatedSize,
          };
        }
        
        // 从 adjust 步骤进入 spacing 步骤时，识别第一排座位
        if (prev.currentStep === 'adjust' && nextStep === 'spacing') {
          const firstRow = identifyFirstRow(prev.placedSeats);
          return {
            ...prev,
            currentStep: nextStep,
            firstRow,
          };
        }
        
        return { ...prev, currentStep: nextStep };
      }
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.currentStep);
      if (currentIndex > 0) {
        return { ...prev, currentStep: STEP_ORDER[currentIndex - 1] };
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((step: CalibrationStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const addPlacedSeat = useCallback((seat: PlacedCalibrationSeat) => {
    setState((prev) => ({
      ...prev,
      placedSeats: [...prev.placedSeats, seat],
    }));
  }, []);

  const removePlacedSeat = useCallback((seatId: string) => {
    setState((prev) => ({
      ...prev,
      placedSeats: prev.placedSeats.filter((s) => s.id !== seatId),
    }));
  }, []);

  const updateSeatPosition = useCallback((seatId: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      placedSeats: prev.placedSeats.map((s) =>
        s.id === seatId ? { ...s, x, y } : s
      ),
    }));
  }, []);

  const setCalculatedSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, calculatedSize: size }));
  }, []);

  const setConfirmedSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, confirmedSize: size }));
  }, []);

  const setRowSpacing = useCallback((spacing: number) => {
    setState((prev) => ({ ...prev, calculatedRowSpacing: spacing }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    nextStep,
    prevStep,
    goToStep,
    addPlacedSeat,
    removePlacedSeat,
    updateSeatPosition,
    setCalculatedSize,
    setConfirmedSize,
    setRowSpacing,
    reset,
  };
}
