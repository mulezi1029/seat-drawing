/**
 * useSimpleViewer - 极简场馆查看器 Hook
 *
 * 仅保留功能：
 * - SVG 背景图状态管理
 * - 缩放/平移视口控制
 * - 文件上传处理
 */

import { useState, useCallback, useRef } from 'react';
import { CANVAS_CONFIG } from '@/types';

/** 简单查看器状态接口 */
export interface SimpleViewerState {
  /** 背景图 URL */
  svgUrl: string | null;
  /** 缩放比例 */
  scale: number;
  /** 水平滚动位置 */
  offsetX: number;
  /** 垂直滚动位置 */
  offsetY: number;
}

/** 简单查看器操作接口 */
export interface SimpleViewerActions {
  /** 上传 SVG 文件 */
  uploadSvg: (file: File) => void;
  /** 直接设置背景图 URL */
  setSvgUrl: (url: string | null) => void;
  /** 设置缩放比例 */
  setScale: (scale: number) => void;
  /** 以指定点为中心设置缩放 */
  zoomAt: (scale: number, centerX: number, centerY: number) => void;
  /** 设置偏移位置 */
  setOffset: (x: number, y: number) => void;
  /** 相对平移 */
  panBy: (deltaX: number, deltaY: number) => void;
  /** 放大 */
  zoomIn: () => void;
  /** 缩小 */
  zoomOut: () => void;
  /** 重置视图 */
  resetView: () => void;
  /** 适应视图 */
  fitToView: (containerWidth: number, containerHeight: number) => void;
  /** 触发文件上传 */
  triggerFileUpload: () => void;
}

/** 简单查看器 Hook 返回值 */
export interface UseSimpleViewerReturn extends SimpleViewerState, SimpleViewerActions {
  /** 文件输入引用 */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

/** 默认缩放步长 (3% 步长，提供更精细的缩放控制) */
const ZOOM_STEP = 1.03;

/** 最小/最大缩放限制 */
const MIN_ZOOM = CANVAS_CONFIG.MIN_ZOOM;
const MAX_ZOOM = CANVAS_CONFIG.MAX_ZOOM;

/** 世界画布中心 */
const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;

/**
 * 极简场馆查看器 Hook
 *
 * @returns 查看器状态和操作
 */
export function useSimpleViewer(): UseSimpleViewerReturn {
  // ===== 核心状态 =====
  const [svgUrl, setSvgUrlState] = useState<string | null>(null);
  const [scale, setScaleState] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(WORLD_CENTER - window.innerWidth / 2);
  const [offsetY, setOffsetY] = useState<number>(WORLD_CENTER - window.innerHeight / 2);

  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 缩放操作 =====

  /**
   * 设置缩放比例（带限制）
   */
  const setScale = useCallback((newScale: number) => {
    setScaleState(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale)));
  }, []);

  /**
   * 以指定点为中心缩放
   */
  const zoomAt = useCallback((newScale: number, centerX: number, centerY: number) => {
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    const oldScale = scale;
    const zoomFactor = clampedScale / oldScale;

    // 计算新的偏移量，保持中心点不变
    const newOffsetX = WORLD_CENTER - (WORLD_CENTER - offsetX - centerX) * zoomFactor - centerX;
    const newOffsetY = WORLD_CENTER - (WORLD_CENTER - offsetY - centerY) * zoomFactor - centerY;

    setScaleState(clampedScale);
    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
  }, [scale, offsetX, offsetY]);

  /**
   * 放大
   */
  const zoomIn = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    zoomAt(scale * ZOOM_STEP, centerX, centerY);
  }, [scale, zoomAt]);

  /**
   * 缩小
   */
  const zoomOut = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    zoomAt(scale / ZOOM_STEP, centerX, centerY);
  }, [scale, zoomAt]);

  /**
   * 重置视图
   */
  const resetView = useCallback(() => {
    setScaleState(1);
    setOffsetX(WORLD_CENTER - window.innerWidth / 2);
    setOffsetY(WORLD_CENTER - window.innerHeight / 2);
  }, []);

  /**
   * 适应视图（简化版，居中显示）
   */
  const fitToView = useCallback((containerWidth: number, containerHeight: number) => {
    // 默认缩放到 0.8，居中显示
    const newScale = 0.8;
    setScaleState(newScale);
    setOffsetX(WORLD_CENTER - containerWidth / 2);
    setOffsetY(WORLD_CENTER - containerHeight / 2);
  }, []);

  // ===== 平移操作 =====

  /**
   * 设置偏移位置
   */
  const setOffset = useCallback((x: number, y: number) => {
    setOffsetX(x);
    setOffsetY(y);
  }, []);

  /**
   * 相对平移
   */
  const panBy = useCallback((deltaX: number, deltaY: number) => {
    setOffsetX((prev) => prev + deltaX);
    setOffsetY((prev) => prev + deltaY);
  }, []);

  // ===== 文件操作 =====

  /**
   * 处理 SVG 文件上传
   */
  const uploadSvg = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = URL.createObjectURL(file);
      setSvgUrlState(url);

      // 上传后重置视图到中心
      const newScale = 1;
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;

      setScaleState(newScale);
      setOffsetX(WORLD_CENTER - canvasWidth / 2);
      setOffsetY(WORLD_CENTER - canvasHeight / 2);
    };
    reader.readAsText(file);
  }, []);

  /**
   * 直接设置 SVG URL
   */
  const setSvgUrl = useCallback((url: string | null) => {
    setSvgUrlState(url);
  }, []);

  /**
   * 触发文件上传点击
   */
  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    // 状态
    svgUrl,
    scale,
    offsetX,
    offsetY,
    fileInputRef,

    // 操作
    uploadSvg,
    setSvgUrl,
    setScale,
    zoomAt,
    setOffset,
    panBy,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    triggerFileUpload,
  };
}
