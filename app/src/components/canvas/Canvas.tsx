/**
 * Canvas 组件 - 极简版本
 *
 * 仅保留功能：
 * - SVG 背景图展示
 * - Space+拖拽平移
 * - Ctrl+滚轮缩放
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { CANVAS_CONFIG } from '@/types';

/** Canvas 组件属性 */
export interface CanvasProps {
  /** 缩放比例 */
  scale: number;
  /** 水平滚动位置 */
  offsetX: number;
  /** 垂直滚动位置 */
  offsetY: number;
  /** 空格键是否按下 */
  isSpacePressed: boolean;
  /** 当前激活的工具 */
  activeTool: string;
  /** 缩放变化回调 */
  onScaleChange: (scale: number, centerX: number, centerY: number) => void;
  /** 偏移变化回调 */
  onOffsetChange: (x: number, y: number) => void;
  /** 子元素 - SVG 渲染内容 */
  children?: React.ReactNode;
}

/**
 * 极简 Canvas 组件
 */
export const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  ({ scale, offsetX, offsetY, isSpacePressed, activeTool, onScaleChange, onOffsetChange, children }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // 暴露容器引用
    useImperativeHandle(ref, () => containerRef.current!);

    // 拖拽状态使用 ref 避免重渲染，只保留光标样式状态
    const isPanningRef = useRef(false);
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const [cursorStyle, setCursorStyle] = useState('default');

    // 用于跳过大容器滚动事件的标记，避免拖拽时触发状态更新
    const isDraggingRef = useRef(false);

    // 是否处于 hand/pan 工具模式
    const isHandToolActive = activeTool === 'hand';

    // 更新光标样式
    useEffect(() => {
      if (isPanningRef.current) {
        setCursorStyle('grabbing');
      } else if (isSpacePressed || isHandToolActive) {
        setCursorStyle('grab');
      } else {
        setCursorStyle('default');
      }
    }, [isSpacePressed, isHandToolActive]);

    // ===== 鼠标事件处理 =====

    /**
     * 判断是否应触发平移
     * - 鼠标中键拖拽
     * - 空格键按下 + 左键拖拽
     * - Hand 工具选中 + 左键拖拽
     */
    const shouldPan = useCallback(
      (e: React.MouseEvent | MouseEvent) => {
        return e.button === 1 || ((isSpacePressed || isHandToolActive) && e.button === 0);
      },
      [isSpacePressed, isHandToolActive]
    );

    /**
     * 鼠标按下
     */
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        if (shouldPan(e)) {
          isPanningRef.current = true;
          isDraggingRef.current = true;
          panStartRef.current = { x: e.clientX, y: e.clientY };
          setCursorStyle('grabbing');
        }
      },
      [shouldPan]
    );

    /**
     * 鼠标移动 - 使用 ref 直接操作 DOM，避免 React 重渲染
     */
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isPanningRef.current && panStartRef.current && containerRef.current) {
          const dx = e.clientX - panStartRef.current.x;
          const dy = e.clientY - panStartRef.current.y;

          // 直接操作 DOM，不触发 React 更新
          containerRef.current.scrollLeft -= dx;
          containerRef.current.scrollTop -= dy;

          panStartRef.current = { x: e.clientX, y: e.clientY };
        }
      },
      []
    );

    /**
     * 鼠标释放
     */
    const handleMouseUp = useCallback(() => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        isDraggingRef.current = false;
        panStartRef.current = null;
        // 恢复光标样式
        if (isSpacePressed || isHandToolActive) {
          setCursorStyle('grab');
        } else {
          setCursorStyle('default');
        }
      }
    }, [isSpacePressed, isHandToolActive]);

    // 滚轮移动优化：使用 ref 标记滚轮操作中，跳过状态同步
    const isWheelingRef = useRef(false);
    const wheelTimeoutRef = useRef<number | null>(null);

    /**
     * 滚轮缩放 (Ctrl+滚轮) 和平移 (滚轮/Shift+滚轮)
     * - 阻止默认行为和冒泡，防止页面滚动
     * - 使用较小的缩放步长 (3%) 实现更精细的控制
     * - 普通滚轮直接操作 DOM 移动画布，避免 React 重渲染
     */
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          // 阻止默认滚动行为和事件冒泡
          e.preventDefault();
          e.stopPropagation();

          // 根据滚轮方向计算缩放因子 (3% 步长)
          const zoomStep = 0.03;
          const zoomFactor = e.deltaY > 0 ? 1 - zoomStep : 1 + zoomStep;
          const newScale = scale * zoomFactor;

          onScaleChange(newScale, e.clientX, e.clientY);
        } else {
          // 普通滚轮：直接操作 DOM 移动画布，避免触发 React 状态更新循环
          if (!containerRef.current) return;

          e.preventDefault();

          // 标记滚轮操作中
          isWheelingRef.current = true;

          // 根据滚轮方向计算滚动偏移
          // deltaY: 垂直滚动，deltaX: 水平滚动（或 Shift+滚轮）
          const scrollSpeed = 1;
          containerRef.current.scrollLeft += e.deltaX * scrollSpeed;
          containerRef.current.scrollTop += e.deltaY * scrollSpeed;

          // 清除之前的 timeout
          if (wheelTimeoutRef.current) {
            window.clearTimeout(wheelTimeoutRef.current);
          }

          // 滚轮结束后延迟同步状态（用于方向控制环等 UI 同步）
          wheelTimeoutRef.current = window.setTimeout(() => {
            isWheelingRef.current = false;
            // 最后一次同步状态
            if (containerRef.current) {
              onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
            }
          }, 150);
        }
      },
      [scale, onScaleChange, onOffsetChange]
    );

    // ===== 滚动同步 =====

    /**
     * 滚动位置变化时同步到状态
     * 拖拽或滚轮期间跳过，避免与直接 DOM 操作冲突
     */
    const handleScroll = useCallback(() => {
      if (!containerRef.current) return;
      // if (isDraggingRef.current || isWheelingRef.current) return;
      onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
    }, [onOffsetChange]);

    /**
     * 状态变化时同步滚动位置
     */
    useEffect(() => {
      if (!containerRef.current) return;
      if (containerRef.current.scrollLeft !== offsetX) {
        containerRef.current.scrollLeft = offsetX;
      }
      if (containerRef.current.scrollTop !== offsetY) {
        containerRef.current.scrollTop = offsetY;
      }
    }, [offsetX, offsetY]);

    /**
     * 原生滚轮事件监听 - 确保 preventDefault 生效
     * 需要 passive: false 才能阻止默认滚动行为
     */
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleNativeWheel = (e: WheelEvent) => {
        // 处理所有滚轮事件：Ctrl+滚轮缩放，普通滚轮平移
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        } else {
          // 普通滚轮也由 React 事件处理，这里只阻止默认行为
          e.preventDefault();
        }
      };

      container.addEventListener('wheel', handleNativeWheel, { passive: false });

      return () => {
        container.removeEventListener('wheel', handleNativeWheel);
      };
    }, []);

    /**
     * 清理滚轮 timeout
     */
    useEffect(() => {
      return () => {
        if (wheelTimeoutRef.current) {
          window.clearTimeout(wheelTimeoutRef.current);
        }
      };
    }, []);

    // ===== 渲染 =====

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-auto scrollbar-hidden"
        style={{ cursor: cursorStyle }}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG 画布容器 - 与 seats.io 一致：width/height 固定，缩放由 SVG 内部 transform 处理 */}
        <div
          style={{
            width: CANVAS_CONFIG.WORLD_SIZE,
            height: CANVAS_CONFIG.WORLD_SIZE,
            position: 'relative',
          }}
        >
          {/* SVG 渲染内容 - 绝对定位覆盖整个容器 */}
          {children}
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';
