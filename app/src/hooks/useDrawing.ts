/**
 * useDrawing Hook
 *
 * 绘制状态管理 Hook，负责管理区域和座位的绘制逻辑。
 *
 * 功能：
 * - 管理区域绘制 (多边形/矩形)
 * - 管理座位绘制 (单个/行/线)
 * - 网格吸附
 * - 预览线计算
 */

import { useState, useCallback } from 'react';
import type { Point, Section } from '@/types';

/** 自动闭合阈值（像素距离） */
const AUTO_CLOSE_THRESHOLD = 20;

/** 最大顶点数限制 */
const MAX_VERTEX_COUNT = 50;

/** 添加点结果 */
export interface AddPointResult {
  /** 是否成功添加 */
  added: boolean;
  /** 是否触发自动闭合 */
  shouldAutoClose: boolean;
  /** 是否达到顶点限制 */
  atMaxVertices: boolean;
  /** 当前顶点数 */
  vertexCount: number;
}

export interface UseDrawingReturn {
  // 区域绘制
  isDrawingSection: boolean;
  sectionPoints: Point[];
  startSectionDrawing: () => void;
  addSectionPoint: (point: Point, snapToGrid?: boolean, gridSize?: number) => AddPointResult;
  removeLastSectionPoint: () => void;
  completeSectionDrawing: (name?: string, defaultColor?: string, sectionOpacity?: number) => Section | null;
  cancelSectionDrawing: () => void;

  // 矩形模式辅助
  updateRectanglePreview: (point: Point) => void;
  getRectanglePoints: () => Point[];

  // 座位绘制
  isDrawingSeat: boolean;
  seatPreviewPosition: Point | null;
  setSeatPreviewPosition: (point: Point | null) => void;

  // 配置
  autoCloseThreshold: number;
  maxVertexCount: number;

  // 通用
  resetDrawing: () => void;
}

export function useDrawing(): UseDrawingReturn {
  // 区域绘制状态
  const [isDrawingSection, setIsDrawingSection] = useState(false);
  const [sectionPoints, setSectionPoints] = useState<Point[]>([]);

  // 矩形模式预览
  const [rectanglePreview, setRectanglePreview] = useState<Point | null>(null);

  // 座位绘制状态
  const [isDrawingSeat, setIsDrawingSeat] = useState(false);
  const [seatPreviewPosition, setSeatPreviewPosition] = useState<Point | null>(null);

  // 生成唯一 ID
  const generateId = () => crypto.randomUUID();

  // 吸附到网格
  const snapPointToGrid = useCallback((point: Point, gridSize: number): Point => {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }, []);

  // 计算两点距离
  const getDistance = useCallback((p1: Point, p2: Point): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 开始区域绘制
  const startSectionDrawing = useCallback(() => {
    setIsDrawingSection(true);
    setSectionPoints([]);
    setRectanglePreview(null);
  }, []);

  // 添加区域顶点
  const addSectionPoint = useCallback((
    point: Point,
    snapToGrid?: boolean,
    gridSize?: number
  ): AddPointResult => {
    const finalPoint = snapToGrid && gridSize ? snapPointToGrid(point, gridSize) : point;

    // 检查是否达到最大顶点数限制
    if (sectionPoints.length >= MAX_VERTEX_COUNT) {
      return {
        added: false,
        shouldAutoClose: false,
        atMaxVertices: true,
        vertexCount: sectionPoints.length,
      };
    }

    // 检查与上一个点是否重合（距离小于 5px）
    if (sectionPoints.length > 0) {
      const lastPoint = sectionPoints[sectionPoints.length - 1];
      const distanceToLast = getDistance(finalPoint, lastPoint);
      if (distanceToLast < 5) {
        return {
          added: false,
          shouldAutoClose: false,
          atMaxVertices: false,
          vertexCount: sectionPoints.length,
        };
      }
    }

    // 检查是否触发自动闭合（距离第一个点小于阈值）
    let shouldAutoClose = false;
    if (sectionPoints.length >= 3) {
      const firstPoint = sectionPoints[0];
      const distanceToFirst = getDistance(finalPoint, firstPoint);
      if (distanceToFirst < AUTO_CLOSE_THRESHOLD) {
        shouldAutoClose = true;
      }
    }

    setSectionPoints(prev => [...prev, finalPoint]);

    return {
      added: true,
      shouldAutoClose,
      atMaxVertices: sectionPoints.length + 1 >= MAX_VERTEX_COUNT,
      vertexCount: sectionPoints.length + 1,
    };
  }, [getDistance, snapPointToGrid, sectionPoints]);

  // 移除最后一个顶点
  const removeLastSectionPoint = useCallback(() => {
    setSectionPoints(prev => prev.slice(0, -1));
  }, []);

  // 更新矩形预览
  const updateRectanglePreview = useCallback((point: Point) => {
    setRectanglePreview(point);
  }, []);

  // 获取矩形顶点
  const getRectanglePoints = useCallback((): Point[] => {
    if (sectionPoints.length < 1 || !rectanglePreview) return [];

    const p1 = sectionPoints[0];
    const p2 = rectanglePreview;

    return [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p1.x, y: p2.y },
    ];
  }, [sectionPoints, rectanglePreview]);

  // 完成区域绘制
  const completeSectionDrawing = useCallback((
    name?: string,
    defaultColor?: string,
    sectionOpacity?: number
  ): Section | null => {
    let finalPoints = sectionPoints;

    // 如果是矩形模式且有预览点，使用矩形顶点
    if (rectanglePreview && sectionPoints.length === 1) {
      finalPoints = getRectanglePoints();
    }

    if (finalPoints.length < 3) return null;

    const newSection: Section = {
      id: generateId(),
      name: name ?? 'New Section',
      points: finalPoints,
      color: defaultColor ?? '#e3e3e3',
      seats: [],
      opacity: sectionOpacity ?? 0.5,
    };

    // 重置绘制状态
    setIsDrawingSection(false);
    setSectionPoints([]);
    setRectanglePreview(null);

    return newSection;
  }, [sectionPoints, rectanglePreview, getRectanglePoints]);

  // 取消区域绘制
  const cancelSectionDrawing = useCallback(() => {
    setIsDrawingSection(false);
    setSectionPoints([]);
    setRectanglePreview(null);
  }, []);

  // 重置所有绘制状态
  const resetDrawing = useCallback(() => {
    setIsDrawingSection(false);
    setSectionPoints([]);
    setRectanglePreview(null);
    setIsDrawingSeat(false);
    setSeatPreviewPosition(null);
  }, []);

  return {
    isDrawingSection,
    sectionPoints,
    startSectionDrawing,
    addSectionPoint,
    removeLastSectionPoint,
    completeSectionDrawing,
    cancelSectionDrawing,
    updateRectanglePreview,
    getRectanglePoints,
    isDrawingSeat,
    seatPreviewPosition,
    setSeatPreviewPosition,
    autoCloseThreshold: AUTO_CLOSE_THRESHOLD,
    maxVertexCount: MAX_VERTEX_COUNT,
    resetDrawing,
  };
}
