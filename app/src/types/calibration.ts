/**
 * 校准相关类型定义
 * 参照 seats.io 的交互式校准流程
 */

/**
 * 校准步骤
 */
export type CalibrationStep =
  | 'intro'        // 介绍页
  | 'zoom'         // 步骤1：缩放到长排座位
  | 'place'        // 步骤2：放置座位
  | 'adjust'       // 步骤3：调整座位尺寸
  | 'spacing'      // 步骤4：定义行间距
  | 'complete';    // 完成

/**
 * 放置的校准座位
 */
export interface PlacedCalibrationSeat {
  id: string;
  x: number;
  y: number;
}

/**
 * 校准向导状态
 */
export interface CalibrationWizardState {
  /** 当前步骤 */
  currentStep: CalibrationStep;
  /** 已放置的座位 */
  placedSeats: PlacedCalibrationSeat[];
  /** 计算出的座位尺寸 */
  calculatedSize: number | null;
  /** 用户确认的座位尺寸 */
  confirmedSize: number | null;
  /** 第一排座位（用于定义行间距） */
  firstRow: PlacedCalibrationSeat[] | null;
  /** 第二排座位（用于计算行间距） */
  secondRow: PlacedCalibrationSeat[] | null;
  /** 计算出的行间距 */
  calculatedRowSpacing: number | null;
}
