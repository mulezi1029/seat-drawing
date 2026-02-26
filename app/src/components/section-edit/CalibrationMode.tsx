/**
 * CalibrationMode - 校准模式容器
 * 集成 seats.io 风格的交互式校准向导
 */

import React, { useCallback } from 'react';
import type { Section, CalibrationData } from '@/types';
import { useCalibrationWizard } from '@/hooks/useCalibrationWizard';
import {
  IntroStep,
  ZoomStep,
  PlaceSeatsStep,
  AdjustSizeStep,
  SpacingStep,
  CompleteStep,
  InteractiveCalibrationCanvas,
  SpacingCanvas,
} from './calibration-wizard';

export interface CalibrationModeProps {
  /** 正在编辑的区域 */
  section: Section;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 校准数据 */
  calibration: CalibrationData;
  /** 更新校准数据 */
  onCalibrationChange: (updates: Partial<CalibrationData>) => void;
  /** 重置校准 */
  onReset: () => void;
  /** 完成校准 */
  onComplete: () => void;
  /** 返回 */
  onBack: () => void;
}

export const CalibrationMode: React.FC<CalibrationModeProps> = ({
  section,
  svgUrl,
  calibration,
  onCalibrationChange,
  onComplete,
}) => {
  const wizard = useCalibrationWizard();
  const { state } = wizard;

  /** 缩放变化 */
  const handleZoomChange = useCallback((zoom: number) => {
    onCalibrationChange({
      canvasScale: zoom,
      anchorScale: zoom,
    });
  }, [onCalibrationChange]);

  /** 座位尺寸变化 */
  const handleSeatSizeChange = useCallback((size: number) => {
    onCalibrationChange({
      seatVisual: { ...calibration.seatVisual, size },
    });
    wizard.setConfirmedSize(size);
  }, [calibration.seatVisual, onCalibrationChange, wizard]);

  /** 完成校准 */
  const handleComplete = useCallback(() => {
    // 使用确认的座位尺寸和计算出的行间距
    const finalSize = state.confirmedSize ?? calibration.seatVisual.size;
    const finalRowSpacing = state.calculatedRowSpacing ?? calibration.seatVisual.gapY;

    onCalibrationChange({
      seatVisual: {
        size: finalSize,
        gapX: calibration.seatVisual.gapX,
        gapY: finalRowSpacing,
      },
      isCalibrated: true,
    });

    onComplete();
  }, [state, calibration, onCalibrationChange, onComplete]);

  // 根据当前步骤渲染不同内容
  switch (state.currentStep) {
    case 'intro':
      return <IntroStep onNext={wizard.nextStep} />;

    case 'zoom':
      return (
        <div className="flex flex-col h-full bg-white relative">
          <InteractiveCalibrationCanvas
            section={section}
            svgUrl={svgUrl}
            canvasScale={calibration.canvasScale}
            seatSize={calibration.seatVisual.size}
            placedSeats={[]}
            canPlaceSeats={false}
            onScaleChange={handleZoomChange}
            onAddSeat={() => {}}
            onRemoveSeat={() => {}}
            onUpdateSeatPosition={() => {}}
          />
          <ZoomStep
            zoomLevel={calibration.canvasScale}
            onZoomChange={handleZoomChange}
            onBack={wizard.prevStep}
            onNext={wizard.nextStep}
          />
        </div>
      );

    case 'place':
      return (
        <div className="flex flex-col h-full bg-white relative">
          <InteractiveCalibrationCanvas
            section={section}
            svgUrl={svgUrl}
            canvasScale={calibration.canvasScale}
            seatSize={calibration.seatVisual.size}
            placedSeats={state.placedSeats}
            canPlaceSeats={true}
            onScaleChange={handleZoomChange}
            onAddSeat={wizard.addPlacedSeat}
            onRemoveSeat={wizard.removePlacedSeat}
            onUpdateSeatPosition={wizard.updateSeatPosition}
          />
          <PlaceSeatsStep
            placedSeats={state.placedSeats}
            seatSize={calibration.seatVisual.size}
            onSeatSizeChange={handleSeatSizeChange}
            onBack={wizard.prevStep}
            onNext={wizard.nextStep}
          />
        </div>
      );

    case 'adjust':
      return (
        <div className="flex flex-col h-full bg-white relative">
          <InteractiveCalibrationCanvas
            section={section}
            svgUrl={svgUrl}
            canvasScale={calibration.canvasScale}
            seatSize={state.confirmedSize ?? calibration.seatVisual.size}
            placedSeats={state.placedSeats}
            canPlaceSeats={false}
            onScaleChange={handleZoomChange}
            onAddSeat={() => {}}
            onRemoveSeat={() => {}}
            onUpdateSeatPosition={() => {}}
          />
          <AdjustSizeStep
            calculatedSize={state.calculatedSize ?? calibration.seatVisual.size}
            confirmedSize={state.confirmedSize ?? calibration.seatVisual.size}
            onSeatSizeChange={handleSeatSizeChange}
            onBack={wizard.prevStep}
            onNext={wizard.nextStep}
          />
        </div>
      );

    case 'spacing':
      return (
        <div className="flex flex-col h-full bg-white relative">
          <SpacingCanvas
            section={section}
            svgUrl={svgUrl}
            canvasScale={calibration.canvasScale}
            seatSize={state.confirmedSize ?? calibration.seatVisual.size}
            allSeats={state.placedSeats}
            firstRow={state.firstRow ?? []}
            onScaleChange={handleZoomChange}
            onRowSpacingDefined={wizard.setRowSpacing}
          />
          <SpacingStep
            hasDefinedSpacing={state.calculatedRowSpacing !== null}
            onBack={wizard.prevStep}
            onNext={wizard.nextStep}
          />
        </div>
      );

    case 'complete':
      return <CompleteStep onDone={handleComplete} />;

    default:
      return null;
  }
};
