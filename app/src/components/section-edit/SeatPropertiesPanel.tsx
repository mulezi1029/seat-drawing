/**
 * SeatPropertiesPanel - 座位属性编辑面板
 */

import React from 'react';
import type { Seat, SeatType } from '@/types';

export interface SeatPropertiesPanelProps {
  selectedSeats: Seat[];
  onUpdateSeat: (seatId: string, updates: Partial<Seat>) => void;
}

const SEAT_TYPES: { value: SeatType; label: string }[] = [
  { value: 'normal', label: '正常座位' },
  { value: 'vip', label: 'VIP 座位' },
  { value: 'accessible', label: '无障碍座位' },
  { value: 'empty', label: '空位' },
];

export const SeatPropertiesPanel: React.FC<SeatPropertiesPanelProps> = ({
  selectedSeats,
  onUpdateSeat,
}) => {
  if (selectedSeats.length === 0) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-400 mt-8">
          <p className="text-sm">未选中座位</p>
          <p className="text-xs mt-2">请选择座位以编辑属性</p>
        </div>
      </div>
    );
  }

  const isSingleSelection = selectedSeats.length === 1;
  const seat = selectedSeats[0];

  const handleRowChange = (value: string) => {
    if (isSingleSelection) {
      onUpdateSeat(seat.id, { row: value.toUpperCase() });
    }
  };

  const handleNumberChange = (value: string) => {
    if (isSingleSelection) {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num > 0) {
        onUpdateSeat(seat.id, { number: num });
      }
    }
  };

  const handleTypeChange = (value: SeatType) => {
    selectedSeats.forEach((s) => {
      onUpdateSeat(s.id, { type: value });
    });
  };

  const handleAngleChange = (value: string) => {
    const angle = parseInt(value, 10);
    if (!isNaN(angle) && angle >= 0 && angle <= 360) {
      selectedSeats.forEach((s) => {
        onUpdateSeat(s.id, { angle });
      });
    }
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            座位属性
            {selectedSeats.length > 1 && (
              <span className="ml-2 text-xs text-gray-500">
                ({selectedSeats.length} 个座位)
              </span>
            )}
          </h3>
        </div>

        {isSingleSelection && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                行号
              </label>
              <input
                type="text"
                value={seat.row}
                onChange={(e) => handleRowChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                座位号
              </label>
              <input
                type="number"
                value={seat.number}
                onChange={(e) => handleNumberChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            座位类型
          </label>
          <select
            value={isSingleSelection ? seat.type : 'normal'}
            onChange={(e) => handleTypeChange(e.target.value as SeatType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEAT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            座位角度
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={isSingleSelection ? seat.angle : 0}
              onChange={(e) => handleAngleChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
              max={360}
              step={15}
            />
            <span className="text-xs text-gray-500">°</span>
          </div>
        </div>

        {isSingleSelection && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <p>位置: ({Math.round(seat.x)}, {Math.round(seat.y)})</p>
              <p>ID: {seat.id.slice(0, 12)}...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
