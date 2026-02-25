/**
 * 右侧属性面板 - 占位组件
 *
 * 包含：Section、Category、Transform、Label、Misc 等 Inspector 面板
 */

import React from 'react';
import { Settings, ChevronRight } from 'lucide-react';

interface InspectorSheetProps {
  title: string;
  children: React.ReactNode;
}

const InspectorSheet: React.FC<InspectorSheetProps> = ({ title, children }) => (
  <div className="border-b last:border-b-0">
    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {title}
    </div>
    <div className="p-4 space-y-3">{children}</div>
  </div>
);

interface InputRowProps {
  label: string;
  value: string;
}

const InputRow: React.FC<InputRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">{label}</span>
    <input
      tabIndex={-1}
      type="text"
      defaultValue={value}
      className="w-20 px-2 py-1 text-sm border rounded text-right"
    />
  </div>
);

export const PanelRight: React.FC = () => {
  return (
    <div tabIndex={-1} className="w-72 bg-white border-l flex flex-col overflow-y-auto focus:outline-none">
      {/* Section Panel */}
      <InspectorSheet title="Section">
        <button tabIndex={-1} onMouseDown={(e) => e.preventDefault()} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 focus:outline-none">
          <Settings className="w-4 h-4" />
          <span>Edit contents</span>
        </button>
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-orange-400" />
          <div>
            <div className="text-sm font-medium">Section A</div>
            <div className="text-xs text-gray-500">92 places</div>
          </div>
        </div>
      </InspectorSheet>

      {/* Category Panel */}
      <InspectorSheet title="Category">
        <div className="flex items-center justify-between p-2 border rounded hover:border-blue-400 cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-400" />
            <span className="text-sm">A</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </InspectorSheet>

      {/* Transform Panel */}
      <InspectorSheet title="Transform">
        <InputRow label="Scale" value="100%" />
        <InputRow label="Smoothing" value="50%" />
      </InspectorSheet>

      {/* Label Panel */}
      <InspectorSheet title="Label">
        <InputRow label="Label" value="?" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Visible</span>
          <input tabIndex={-1} type="checkbox" defaultChecked className="rounded" />
        </div>
        <InputRow label="Font size" value="12 pt" />
        <InputRow label="Rotation" value="0°" />
        <InputRow label="Position X" value="0%" />
        <InputRow label="Position Y" value="0%" />
      </InspectorSheet>

      {/* View Image Panel */}
      <InspectorSheet title="View from seats">
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-xs text-gray-500">Drop an image here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">PNG, GIF, JPEG up to 4 MB</p>
        </div>
      </InspectorSheet>

      {/* Misc Panel */}
      <InspectorSheet title="Miscellaneous">
        <InputRow label="Entrance" value="" />
      </InspectorSheet>
    </div>
  );
};

// Placeholder for Image icon
const Image: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);
