/**
 * useViewport Hook
 *
 * 视口管理 Hook，负责管理画布的缩放和平移状态。
 * 基于完整设计方案中的坐标系统设计。
 *
 * 功能：
 * - 管理视口状态 (scale, offsetX, offsetY)
 * - 提供坐标转换函数 (screen <-> world)
 * - 支持以鼠标位置为中心的缩放
 * - 支持平移操作
 */

import { useState, useCallback, useRef } from 'react';
import type { ViewportState, Point } from '@/types';
import { CANVAS_CONFIG } from '@/types';

/** 默认 viewport（scale=1, 原点居中显示） */
const getDefaultViewport = (): ViewportState => ({
  scale: CANVAS_CONFIG.DEFAULT_ZOOM,
  offsetX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  offsetY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
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
  zoomAtMouse: (mouseX: number, mouseY: number, zoomDelta: number) => void;
  /** 屏幕坐标转世界坐标 */
  screenToWorld: (screenX: number, screenY: number) => Point;
  /** 世界坐标转屏幕坐标 */
  worldToScreen: (worldX: number, worldY: number) => Point;
  /** 开始平移 */
  startPan: (screenX: number, screenY: number) => void;
  /** 更新平移 */
  updatePan: (screenX: number, screenY: number) => void;
  /** 结束平移 */
  endPan: () => void;
  /** 是否正在平移 */
  isPanning: boolean;
}

export function useViewport(initialViewport?: ViewportState): UseViewportReturn {
  const [viewport, setViewportState] = useState<ViewportState>(() => initialViewport ?? getDefaultViewport());

  // 平移状态
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panInitialOffsetRef = useRef<{ x: number; y: number } | null>(null);

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

  // 缩放以适应区域
  const zoomToFit = useCallback((
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    padding: number = 50
  ) => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // 计算合适的缩放比例
    const scaleX = (window.innerWidth - padding * 2) / width;
    const scaleY = (window.innerHeight - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY, CANVAS_CONFIG.MAX_ZOOM);

    // 计算居中的偏移量
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setViewportState({
      scale,
      offsetX: window.innerWidth / 2 - centerX * scale,
      offsetY: window.innerHeight / 2 - centerY * scale,
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

      // 计算新的 offset，使世界坐标在缩放后仍对应屏幕中心
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      const newOffsetX = screenCenterX - point.x * clampedScale;
      const newOffsetY = screenCenterY - point.y * clampedScale;

      return {
        scale: clampedScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  }, []);

  // 以鼠标位置为中心缩放
  const zoomAtMouse = useCallback((mouseX: number, mouseY: number, zoomDelta: number) => {
    setViewportState(prev => {
      const newScale = Math.max(
        CANVAS_CONFIG.MIN_ZOOM,
        Math.min(CANVAS_CONFIG.MAX_ZOOM, prev.scale * (1 + zoomDelta))
      );

      // 计算鼠标位置对应的世界坐标 (缩放前)
      const worldX = (mouseX - prev.offsetX) / prev.scale;
      const worldY = (mouseY - prev.offsetY) / prev.scale;

      // 计算新的 offset，使世界坐标在缩放后仍对应鼠标位置
      const newOffsetX = mouseX - worldX * newScale;
      const newOffsetY = mouseY - worldY * newScale;

      return {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  }, []);

  // 屏幕坐标转世界坐标
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    return {
      x: (screenX - viewport.offsetX) / viewport.scale,
      y: (screenY - viewport.offsetY) / viewport.scale,
    };
  }, [viewport]);

  // 世界坐标转屏幕坐标
  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    return {
      x: worldX * viewport.scale + viewport.offsetX,
      y: worldY * viewport.scale + viewport.offsetY,
    };
  }, [viewport]);

  // 开始平移
  const startPan = useCallback((screenX: number, screenY: number) => {
    setIsPanning(true);
    panStartRef.current = { x: screenX, y: screenY };
    panInitialOffsetRef.current = {
      x: viewport.offsetX,
      y: viewport.offsetY,
    };
  }, [viewport]);

  // 更新平移
  const updatePan = useCallback((screenX: number, screenY: number) => {
    if (!isPanning || !panStartRef.current || !panInitialOffsetRef.current) return;

    const dx = screenX - panStartRef.current.x;
    const dy = screenY - panStartRef.current.y;

    setViewportState(prev => ({
      ...prev,
      offsetX: panInitialOffsetRef.current!.x + dx,
      offsetY: panInitialOffsetRef.current!.y + dy,
    }));
  }, [isPanning]);

  // 结束平移
  const endPan = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    panInitialOffsetRef.current = null;
  }, []);

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
  };
}
