/**
 * EditMode - 座位编辑模式容器
 * 校准完成后进入此模式进行座位绘制和编辑
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Section, CalibrationData, Seat, SectionEditTool } from '@/types';
import { EditModeCanvas } from './EditModeCanvas';
import { SeatToolsPanel } from './SeatToolsPanel';
import { SeatPropertiesPanel } from './SeatPropertiesPanel';
import { getBoundingBox } from '@/utils/selection';

export interface EditModeProps {
  /** 正在编辑的区域 */
  section: Section;
  /** SVG 背景图 URL */
  svgUrl: string | null;
  /** 校准数据 */
  calibration: CalibrationData;
  /** 更新校准数据 */
  onCalibrationChange: (updates: Partial<CalibrationData>) => void;
  /** 保存座位数据（接收区域ID和座位数组） */
  onSaveSeats: (sectionId: string, seats: Seat[]) => void;
  /** 返回 */
  onBack: () => void;
}

export const EditMode: React.FC<EditModeProps> = ({
  section,
  svgUrl,
  calibration,
  onCalibrationChange,
  onSaveSeats,
  onBack,
}) => {
  const [currentTool, setCurrentTool] = useState<SectionEditTool>('select');
  
  // 计算 section 的原点（边界框左上角）
  const sectionOrigin = useMemo(() => {
    const bbox = getBoundingBox(section.points);
    return { x: bbox.minX, y: bbox.minY };
  }, [section.points]);
  
  // 加载座位时，将局部坐标转换为世界坐标
  const [seats, setSeats] = useState<Seat[]>(() => {
    const savedSeats = section.seats || [];
    return savedSeats.map(seat => ({
      ...seat,
      x: seat.x + sectionOrigin.x,
      y: seat.y + sectionOrigin.y,
    }));
  });
  
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());

  /** 添加座位 */
  const handleAddSeats = useCallback((newSeats: Seat[]) => {
    setSeats((prev) => [...prev, ...newSeats]);
  }, []);

  /** 更新座位 */
  const handleUpdateSeats = useCallback((updatedSeats: Seat[]) => {
    setSeats((prev) => {
      const updatedMap = new Map(updatedSeats.map((s) => [s.id, s]));
      return prev.map((s) => updatedMap.get(s.id) || s);
    });
  }, []);

  /** 删除座位 */
  const handleDeleteSeats = useCallback((seatIds: string[]) => {
    const idsSet = new Set(seatIds);
    setSeats((prev) => prev.filter((s) => !idsSet.has(s.id)));
    setSelectedSeatIds((prev) => {
      const newSet = new Set(prev);
      seatIds.forEach((id) => newSet.delete(id));
      return newSet;
    });
  }, []);

  /** 选择座位 */
  const handleSelectSeats = useCallback((seatIds: string[]) => {
    setSelectedSeatIds(new Set(seatIds));
  }, []);

  /** 更新单个座位属性 */
  const handleUpdateSeat = useCallback((seatId: string, updates: Partial<Seat>) => {
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, ...updates } : s))
    );
  }, []);

  /** 缩放变化 */
  const handleScaleChange = useCallback((scale: number) => {
    onCalibrationChange({ canvasScale: scale });
  }, [onCalibrationChange]);

  /** 保存并退出 */
  const handleSave = useCallback(() => {
    // 保存时，将世界坐标转换为局部坐标
    const localSeats = seats.map(seat => ({
      ...seat,
      x: seat.x - sectionOrigin.x,
      y: seat.y - sectionOrigin.y,
    }));
    onSaveSeats(section.id, localSeats);
    onBack();
  }, [section.id, seats, sectionOrigin, onSaveSeats, onBack]);

  const selectedSeats = seats.filter((s) => selectedSeatIds.has(s.id));

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部工具栏 */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← 返回
          </button>
          <div className="text-sm font-medium text-gray-700">
            {section.name} - 座位编辑
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            座位数: {seats.length}
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧工具面板 */}
        <SeatToolsPanel
          currentTool={currentTool}
          onToolChange={setCurrentTool}
        />

        {/* 中间画布 */}
        <EditModeCanvas
          section={section}
          svgUrl={svgUrl}
          calibration={calibration}
          currentTool={currentTool}
          seats={seats}
          selectedSeatIds={selectedSeatIds}
          onScaleChange={handleScaleChange}
          onAddSeats={handleAddSeats}
          onUpdateSeats={handleUpdateSeats}
          onDeleteSeats={handleDeleteSeats}
          onSelectSeats={handleSelectSeats}
          onToolChange={setCurrentTool}
        />

        {/* 右侧属性面板 */}
        <SeatPropertiesPanel
          selectedSeats={selectedSeats}
          onUpdateSeat={handleUpdateSeat}
        />
      </div>
    </div>
  );
};
