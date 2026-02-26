/**
 * 悬浮控件
 *
 * 包含：Navigation HUD（方向控制、缩放）、Floor Picker、Status Bar
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, Settings, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Joystick Props
 */
interface JoystickProps {
  onPan: (dx: number, dy: number) => void;
  onReset: () => void;
}

/**
 * 摇杆组件 - 支持 360 度控制画布移动
 */
const Joystick: React.FC<JoystickProps> = ({ onPan, onReset }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const joystickStateRef = useRef({ angle: 0, distance: 0, active: false });
  const MAX_RADIUS = 12; // 最大拖拽半径(px)
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Store animate in a ref to avoid the use-before-define ESLint error
  const animateRef = useRef<(() => void) | null>(null);

  // 动画循环
  const animate = useCallback(() => {
    if (joystickStateRef.current.active) {
      const { angle, distance } = joystickStateRef.current;
      const speed = 8 * distance; // 距离越大速度越快，每帧移动像素
      const rad = (angle * Math.PI) / 180;
      const dx = Math.cos(rad) * speed;
      const dy = Math.sin(rad) * speed;
      onPan(dx, dy);
      animationRef.current = requestAnimationFrame(animateRef.current!);
    }
  }, [onPan]);

  // Update the ref whenever animate changes
  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    hasMovedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!isDragging) {
      // 停止动画
      joystickStateRef.current.active = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      const rawDistance = Math.sqrt(dx * dx + dy * dy);
      const distance = Math.min(rawDistance, MAX_RADIUS);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // 标记是否移动了足够距离
      if (rawDistance > 3) {
        hasMovedRef.current = true;
      }

      // 计算限制后的位置
      const rad = Math.atan2(dy, dx);
      const x = Math.cos(rad) * distance;
      const y = Math.sin(rad) * distance;
      setPosition({ x, y });

      // 更新摇杆状态
      joystickStateRef.current = { angle, distance: distance / MAX_RADIUS, active: true };

      // 启动动画（如果还没启动）
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animateRef.current!);
      }
    };

    const handleMouseUp = () => {
      // 如果没有移动或移动很小，视为点击，触发重置
      if (!hasMovedRef.current) {
        onReset();
      }
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      joystickStateRef.current.active = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onReset]);

  // 清理动画
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-6 h-6 cursor-pointer"
      onMouseDown={handleMouseDown}
      title="Drag to pan, click to reset center"
    >
      {/* 轨道 */}
      <div className="absolute inset-0 rounded-full border-2 border-gray-300 bg-white" />
      {/* 摇杆头 */}
      <div
        className={`absolute w-3 h-3 bg-blue-500 rounded-full transition-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          left: '6px',
          top: '6px',
        }}
      />
    </div>
  );
};

/**
 * Navigation HUD Props
 */
interface NavigationHUDProps {
  onPanUp?: () => void;
  onPanDown?: () => void;
  onPanLeft?: () => void;
  onPanRight?: () => void;
  onPan?: (dx: number, dy: number) => void;
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
  onPan,
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
        {/* 中心摇杆 - 支持 360 度控制 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Joystick
            onPan={(dx, dy) => {
              onPan?.(dx, dy);
            }}
            onReset={onResetCenter}
          />
        </div>
      </div>

      {/* 缩放按钮 */}
      <div className="flex flex-col gap-1">
        <Button
          tabIndex={-1}
          variant="secondary"
          size="icon"
          className="w-8 h-8 bg-white shadow-md focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={onZoomIn}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          tabIndex={-1}
          variant="secondary"
          size="icon"
          className="w-8 h-8 bg-white shadow-md focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={onZoomOut}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
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
  onPanUp?: () => void;
  onPanDown?: () => void;
  onPanLeft?: () => void;
  onPanRight?: () => void;
  onPan?: (dx: number, dy: number) => void;
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
      <FloorPicker />
      <StatusBar />
    </>
  );
};
