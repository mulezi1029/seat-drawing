/**
 * SeatToolsPanel - 座位绘制工具面板
 */

import React from 'react';
import { MousePointer, Minus, Grid3x3 } from 'lucide-react';
import type { SectionEditTool } from '@/types';

export interface SeatToolsPanelProps {
  currentTool: SectionEditTool;
  onToolChange: (tool: SectionEditTool) => void;
}

interface ToolConfig {
  id: SectionEditTool;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  shortcut: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'select', icon: MousePointer, label: '选择工具', shortcut: 'V' },
  { id: 'single-row', icon: Minus, label: '单排座位', shortcut: '1' },
  { id: 'matrix', icon: Grid3x3, label: '矩阵座位', shortcut: '2' },
];

export const SeatToolsPanel: React.FC<SeatToolsPanelProps> = ({
  currentTool,
  onToolChange,
}) => {
  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`
              w-12 h-12 flex flex-col items-center justify-center rounded-lg
              transition-all duration-200
              ${isActive
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }
            `}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon size={20} />
            <span className="text-xs mt-1">{tool.shortcut}</span>
          </button>
        );
      })}
    </div>
  );
};
