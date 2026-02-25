/**
 * 悬浮控件
 *
 * 包含：Navigation HUD（方向控制、缩放）、Floor Picker、Status Bar
 */

import React from 'react';
import { Minus, Plus, Settings, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Navigation HUD Props
 */
interface NavigationHUDProps {
  onPanUp: () => void;
  onPanDown: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onResetCenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/**
 * 导航 HUD - 方向控制
 */
export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  onPanUp,
  onPanDown,
  onPanLeft,
  onPanRight,
  onResetCenter,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2">
      {/* 方向控制环 */}
      <div className="relative w-16 h-16 bg-white rounded-full shadow-md border">
        {/* 上箭头 */}
        <button
          tabIndex={-1}
          onClick={onPanUp}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-1 left-1/2 -translate-x-1/2 p-1 hover:bg-gray-100 rounded focus:outline-none"
        >
          <ArrowUp className="w-3 h-3 text-gray-500" />
        </button>
        {/* 下箭头 */}
        <button
          tabIndex={-1}
          onClick={onPanDown}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 p-1 hover:bg-gray-100 rounded focus:outline-none"
        >
          <ArrowDown className="w-3 h-3 text-gray-500" />
        </button>
        {/* 左箭头 */}
        <button
          tabIndex={-1}
          onClick={onPanLeft}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded focus:outline-none"
        >
          <ArrowLeft className="w-3 h-3 text-gray-500" />
        </button>
        {/* 右箭头 */}
        <button
          tabIndex={-1}
          onClick={onPanRight}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded focus:outline-none"
        >
          <ArrowRight className="w-3 h-3 text-gray-500" />
        </button>
        {/* 中心摇杆 - 点击重置到中心 */}
        <button
          tabIndex={-1}
          onClick={onResetCenter}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors focus:outline-none"
          title="Center view"
        >
          <Maximize className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* 缩放按钮 */}
      <div className="flex flex-col gap-1">
        <Button
          tabIndex={-1}
          variant="secondary"
          size="icon"
          className="w-8 h-8 bg-white shadow-md focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={onZoomIn}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          tabIndex={-1}
          variant="secondary"
          size="icon"
          className="w-8 h-8 bg-white shadow-md focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={onZoomOut}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

/**
 * 楼层选择器
 */
export const FloorPicker: React.FC = () => {
  const [activeFloor, setActiveFloor] = React.useState(1);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-md p-1">
      {[1, 2].map((floor) => (
        <button
          key={floor}
          tabIndex={-1}
          onClick={() => setActiveFloor(floor)}
          onMouseDown={(e) => e.preventDefault()}
          className={`
            w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors focus:outline-none
            ${activeFloor === floor ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-gray-600'}
          `}
        >
          {floor}
        </button>
      ))}
      <div className="w-px h-6 bg-gray-200 mx-1" />
      <button
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center focus:outline-none"
      >
        <Settings className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
};

/**
 * 状态栏
 */
export const StatusBar: React.FC = () => {
  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-md px-4 py-2 text-sm">
      <div className="font-medium text-gray-700">Select</div>
      <div className="text-xs text-gray-500 mt-1">
        <span className="font-medium bg-gray-100 px-1 rounded">Shift + Click</span> to add or remove objects
      </div>
      <div className="text-xs text-gray-400 mt-1">1 object selected</div>
    </div>
  );
};

/**
 * FloatingControls Props
 */
interface FloatingControlsProps {
  onPanUp: () => void;
  onPanDown: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onResetCenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/**
 * 所有悬浮控件的容器
 */
export const FloatingControls: React.FC<FloatingControlsProps> = (props) => {
  return (
    <>
      <NavigationHUD {...props} />
      {/* <FloorPicker /> */}
      <StatusBar />
    </>
  );
};
