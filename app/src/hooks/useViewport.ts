/**
 * useViewport Hook - Overflow Scroll 版本
 *
 * 视口管理 Hook，负责管理画布的缩放和平移状态。
 * 基于 seats.io 风格的 overflow scroll 实现。
 *
 * 架构变更：
 * - 外层容器 overflow: scroll，通过 scrollLeft/scrollTop 实现平移
 * - 内层内容区域固定大尺寸 (WORLD_SIZE x WORLD_SIZE)
 * - 缩放通过 CSS transform scale 实现
 * - 世界坐标系原点 (0,0) 在内容区域中心
 *
 * 功能：
 * - 管理视口状态 (scale, scrollLeft, scrollTop)
 * - 提供坐标转换函数 (screen <-> world)
 * - 支持以鼠标位置为中心的缩放
 * - 支持平移操作（通过 scroll）
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ViewportState, Point } from '@/types';
import { CANVAS_CONFIG } from '@/types';

/** 内容区域尺寸（世界坐标空间） */
const WORLD_SIZE = CANVAS_CONFIG.WORLD_SIZE;
const WORLD_CENTER = WORLD_SIZE / 2;

/** 默认 viewport（scale=1, 原点居中显示） */
const getDefaultViewport = (): ViewportState => ({
  scale: CANVAS_CONFIG.DEFAULT_ZOOM,
  offsetX: WORLD_CENTER - (typeof window !== 'undefined' ? window.innerWidth / 2 : 0),
  offsetY: WORLD_CENTER - (typeof window !== 'undefined' ? window.innerHeight / 2 : 0),
});

export interface UseViewportReturn {
  /** 当前视口状态 */
  viewport: ViewportState;
  /** 设置视口状态 */
  setViewport: (viewport: ViewportState) => void;
  /** 重置视口到默认值 */
  resetViewport: () => void;
  /** 缩放以适合指定区域 */
  zoomToFit: (bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding?: number) => void;
  /** 以指定点为中心缩放 */
  zoomAtPoint: (point: Point, scale: number) => void;
  /** 以鼠标位置为中心缩放 (用于滚轮缩放) */
  zoomAtMouse: (mouseX: number, mouseY: number, zoomDelta: number, containerEl?: HTMLElement) => void;
  /** 屏幕坐标转世界坐标 */
  screenToWorld: (screenX: number, screenY: number, containerEl?: HTMLElement) => Point;
  /** 世界坐标转屏幕坐标 */
  worldToScreen: (worldX: number, worldY: number, containerEl?: HTMLElement) => Point;
  /** 开始平移 */
  startPan: () => void;
  /** 更新平移（通过设置 scroll） */
  updatePan: (scrollLeft: number, scrollTop: number) => void;
  /** 结束平移 */
  endPan: () => void;
  /** 是否正在平移 */
  isPanning: boolean;
  /** 内容区域的 transform style（用于缩放） */
  contentTransform: { transform: string; transformOrigin: string };
  /** 内容区域尺寸 */
  contentSize: { width: number; height: number };
  /** 同步容器滚动位置到 viewport 状态 */
  syncScroll: (containerEl: HTMLElement) => void;
}

export function useViewport(initialViewport?: ViewportState): UseViewportReturn {
  const [viewport, setViewportState] = useState<ViewportState>(() => initialViewport ?? getDefaultViewport());

  // 平移状态
  const [isPanning, setIsPanning] = useState(false);

  // 内容区域尺寸
  const contentSize = { width: WORLD_SIZE, height: WORLD_SIZE };

  // 设置视口
  const setViewport = useCallback((newViewport: ViewportState) => {
    // 限制缩放范围
    const clampedScale = Math.max(
      CANVAS_CONFIG.MIN_ZOOM,
      Math.min(CANVAS_CONFIG.MAX_ZOOM, newViewport.scale)
    );
    setViewportState({
      ...newViewport,
      scale: clampedScale,
    });
  }, []);

  // 重置视口
  const resetViewport = useCallback(() => {
    setViewportState(getDefaultViewport());
  }, []);

  // 同步容器滚动位置到 viewport 状态
  const syncScroll = useCallback((containerEl: HTMLElement) => {
    setViewportState(prev => ({
      ...prev,
      offsetX: containerEl.scrollLeft,
      offsetY: containerEl.scrollTop,
    }));
  }, []);

  // 缩放以适应区域
  const zoomToFit = useCallback((
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    padding: number = 50
  ) => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // 计算合适的缩放比例
    const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const containerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const scaleX = (containerWidth - padding * 2) / width;
    const scaleY = (containerHeight - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY, CANVAS_CONFIG.MAX_ZOOM);

    // 计算居中的滚动位置
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // 世界坐标中心对应的滚动位置
    const scrollLeft = WORLD_CENTER + centerX * scale - containerWidth / 2;
    const scrollTop = WORLD_CENTER + centerY * scale - containerHeight / 2;

    setViewportState({
      scale,
      offsetX: scrollLeft,
      offsetY: scrollTop,
    });
  }, []);

  // 以指定点为中心缩放
  const zoomAtPoint = useCallback((point: Point, newScale: number) => {
    setViewportState(_prev => {
      // 限制缩放范围
      const clampedScale = Math.max(
        CANVAS_CONFIG.MIN_ZOOM,
        Math.min(CANVAS_CONFIG.MAX_ZOOM, newScale)
      );

      const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const containerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // 计算新的 scroll，使世界坐标在缩放后仍对应屏幕中心
      const scrollLeft = WORLD_CENTER + point.x * clampedScale - containerWidth / 2;
      const scrollTop = WORLD_CENTER + point.y * clampedScale - containerHeight / 2;

      return {
        scale: clampedScale,
        offsetX: scrollLeft,
        offsetY: scrollTop,
      };
    });
  }, []);

  // 以鼠标位置为中心缩放
  const zoomAtMouse = useCallback((mouseX: number, mouseY: number, zoomDelta: number, containerEl?: HTMLElement) => {
    if (!containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const mouseXInContainer = mouseX - rect.left;
    const mouseYInContainer = mouseY - rect.top;

    setViewportState(prev => {
      const newScale = Math.max(
        CANVAS_CONFIG.MIN_ZOOM,
        Math.min(CANVAS_CONFIG.MAX_ZOOM, prev.scale * (1 + zoomDelta))
      );

      // 计算鼠标位置对应的世界坐标 (缩放前)
      const worldX = (containerEl.scrollLeft + mouseXInContainer - WORLD_CENTER) / prev.scale;
      const worldY = (containerEl.scrollTop + mouseYInContainer - WORLD_CENTER) / prev.scale;

      // 计算新的 scroll，使世界坐标在缩放后仍对应鼠标位置
      const newScrollLeft = WORLD_CENTER + worldX * newScale - mouseXInContainer;
      const newScrollTop = WORLD_CENTER + worldY * newScale - mouseYInContainer;

      return {
        scale: newScale,
        offsetX: newScrollLeft,
        offsetY: newScrollTop,
      };
    });
  }, []);

  // 屏幕坐标转世界坐标
  const screenToWorld = useCallback((screenX: number, screenY: number, containerEl?: HTMLElement): Point => {
    if (!containerEl) {
      return {
        x: (viewport.offsetX + screenX - WORLD_CENTER) / viewport.scale,
        y: (viewport.offsetY + screenY - WORLD_CENTER) / viewport.scale,
      };
    }
    const rect = containerEl.getBoundingClientRect();
    const xInContainer = screenX - rect.left + containerEl.scrollLeft;
    const yInContainer = screenY - rect.top + containerEl.scrollTop;

    return {
      x: (xInContainer - WORLD_CENTER) / viewport.scale,
      y: (yInContainer - WORLD_CENTER) / viewport.scale,
    };
  }, [viewport]);

  // 世界坐标转屏幕坐标
  const worldToScreen = useCallback((worldX: number, worldY: number, containerEl?: HTMLElement): Point => {
    if (!containerEl) {
      return {
        x: WORLD_CENTER + worldX * viewport.scale - viewport.offsetX,
        y: WORLD_CENTER + worldY * viewport.scale - viewport.offsetY,
      };
    }
    const rect = containerEl.getBoundingClientRect();

    return {
      x: WORLD_CENTER + worldX * viewport.scale - containerEl.scrollLeft + rect.left,
      y: WORLD_CENTER + worldY * viewport.scale - containerEl.scrollTop + rect.top,
    };
  }, [viewport]);

  // 开始平移
  const startPan = useCallback(() => {
    setIsPanning(true);
  }, []);

  // 更新平移（通过设置 scroll）
  const updatePan = useCallback((scrollLeft: number, scrollTop: number) => {
    setViewportState(prev => ({
      ...prev,
      offsetX: scrollLeft,
      offsetY: scrollTop,
    }));
  }, []);

  // 结束平移
  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 内容区域的 transform style（用于缩放）
  const contentTransform = {
    transform: `scale(${viewport.scale})`,
    transformOrigin: 'center center',
  };

  return {
    viewport,
    setViewport,
    resetViewport,
    zoomToFit,
    zoomAtPoint,
    zoomAtMouse,
    screenToWorld,
    worldToScreen,
    startPan,
    updatePan,
    endPan,
    isPanning,
    contentTransform,
    contentSize,
    syncScroll,
  };
}
