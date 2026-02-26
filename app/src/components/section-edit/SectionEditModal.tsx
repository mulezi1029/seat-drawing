/**
 * SectionEditModal - 区域编辑主容器
 *
 * 全屏模态框，根据 phase 渲染校准模式或编辑模式
 */

import React, { useEffect } from 'react';
import type { Section, SectionEditState, Seat } from '@/types';
import { CalibrationMode } from './CalibrationMode';
import { EditMode } from './EditMode';

export interface SectionEditModalProps {
  /** 区域编辑状态 */
  state: SectionEditState;
  /** 正在编辑的区域 */
  section: Section | null;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 退出编辑模式 */
  onExit: () => void;
  /** 更新校准数据 */
  onUpdateCalibration: (updates: Partial<import('@/types').CalibrationData>) => void;
  /** 重置校准 */
  onResetCalibration: () => void;
  /** 完成校准 */
  onCompleteCalibration: () => void;
  /** 保存座位数据（接收区域ID和座位数组） */
  onSaveSeats: (sectionId: string, seats: Seat[]) => void;
}

export const SectionEditModal: React.FC<SectionEditModalProps> = ({
  state,
  section,
  svgUrl,
  onExit,
  onUpdateCalibration,
  onResetCalibration,
  onCompleteCalibration,
  onSaveSeats,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在校准模式（非编辑模式）下，ESC 键才退出整个模态框
      // 编辑模式下，ESC 由 EditModeCanvas 处理（取消绘制/切换工具）
      if (e.key === 'Escape' && state.phase === 'calibrating') {
        e.preventDefault();
        e.stopPropagation();
        if (state.hasUnsavedChanges) {
          const confirmed = window.confirm(
            '有未保存的更改，确定要退出吗？'
          );
          if (confirmed) {
            onExit();
          }
        } else {
          onExit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [state.hasUnsavedChanges, state.phase, onExit]);

  if (!state.isActive || !section) {
    return null;
  }

  const handleBack = () => {
    if (state.hasUnsavedChanges) {
      const confirmed = window.confirm(
        '有未保存的更改，确定要退出吗？'
      );
      if (confirmed) {
        onExit();
      }
    } else {
      onExit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="区域编辑"
    >
      {state.phase === 'calibrating' && (
        <CalibrationMode
          section={section}
          svgUrl={svgUrl}
          calibration={state.calibration}
          onCalibrationChange={onUpdateCalibration}
          onReset={onResetCalibration}
          onComplete={onCompleteCalibration}
          onBack={handleBack}
        />
      )}
      {state.phase === 'editing' && (
        <EditMode
          section={section}
          svgUrl={svgUrl}
          calibration={state.calibration}
          onCalibrationChange={onUpdateCalibration}
          onSaveSeats={onSaveSeats}
          onBack={handleBack}
        />
      )}
    </div>
  );
};
