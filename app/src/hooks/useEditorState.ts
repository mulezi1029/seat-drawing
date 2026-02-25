/**
 * useEditorState Hook
 *
 * 编辑器状态管理 Hook，负责管理编辑器的模式、工具选择等 UI 状态。
 *
 * 功能：
 * - 管理编辑模式 (view, draw-section, draw-seat, focus)
 * - 管理座位工具选择 (select, single, row, line)
 * - 管理画布工具选择 (auto, pan, select)
 * - 管理绘制状态 (isDrawing, drawingPoints)
 * - 管理区域绘制模式 (polygon, rectangle)
 * - 管理 Focus Mode 配置
 */

import { useState, useCallback } from 'react';
import type {
  EditorMode,
  SeatTool,
  CanvasTool,
  SectionDrawMode,
  Point,
} from '@/types';


export interface UseEditorStateReturn {
  // 编辑模式
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  // 座位工具
  seatTool: SeatTool;
  setSeatTool: (tool: SeatTool) => void;

  // 画布工具
  canvasTool: CanvasTool;
  setCanvasTool: (tool: CanvasTool) => void;

  // 绘制状态
  isDrawing: boolean;
  drawingPoints: Point[];
  setDrawingPoints: (points: Point[]) => void;
  addDrawingPoint: (point: Point) => void;
  removeLastDrawingPoint: () => void;
  clearDrawingPoints: () => void;
  startDrawing: () => void;
  stopDrawing: () => void;

  // 区域绘制模式
  sectionDrawMode: SectionDrawMode;
  setSectionDrawMode: (mode: SectionDrawMode) => void;

  // 重置所有状态
  resetState: () => void;
}

export function useEditorState(): UseEditorStateReturn {
  // 编辑模式
  const [mode, setModeState] = useState<EditorMode>('view');

  // 座位工具
  const [seatTool, setSeatToolState] = useState<SeatTool>('select');

  // 画布工具
  const [canvasTool, setCanvasToolState] = useState<CanvasTool>('auto');

  // 绘制状态
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  // 区域绘制模式
  const [sectionDrawMode, setSectionDrawModeState] = useState<SectionDrawMode>('polygon');

  // 设置编辑模式 (清除绘制状态)
  const setMode = useCallback((newMode: EditorMode) => {
    setModeState(newMode);
    setIsDrawing(false);
    setDrawingPoints([]);
  }, []);

  // 设置座位工具 (清除绘制状态)
  const setSeatTool = useCallback((tool: SeatTool) => {
    setSeatToolState(tool);
    setIsDrawing(false);
    setDrawingPoints([]);
  }, []);

  // 设置画布工具
  const setCanvasTool = useCallback((tool: CanvasTool) => {
    setCanvasToolState(tool);
  }, []);

  // 设置区域绘制模式
  const setSectionDrawMode = useCallback((mode: SectionDrawMode) => {
    setSectionDrawModeState(mode);
    setDrawingPoints([]);
  }, []);

  // 开始绘制
  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setDrawingPoints([]);
  }, []);

  // 停止绘制
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // 添加绘制点
  const addDrawingPoint = useCallback((point: Point) => {
    setDrawingPoints(prev => [...prev, point]);
  }, []);

  // 移除最后一个绘制点
  const removeLastDrawingPoint = useCallback(() => {
    setDrawingPoints(prev => prev.slice(0, -1));
  }, []);

  // 清空绘制点
  const clearDrawingPoints = useCallback(() => {
    setDrawingPoints([]);
  }, []);

  // 重置所有状态
  const resetState = useCallback(() => {
    setModeState('view');
    setSeatToolState('select');
    setCanvasToolState('auto');
    setIsDrawing(false);
    setDrawingPoints([]);
    setSectionDrawModeState('polygon');
  }, []);

  return {
    mode,
    setMode,
    seatTool,
    setSeatTool,
    canvasTool,
    setCanvasTool,
    isDrawing,
    drawingPoints,
    setDrawingPoints,
    addDrawingPoint,
    removeLastDrawingPoint,
    clearDrawingPoints,
    startDrawing,
    stopDrawing,
    sectionDrawMode,
    setSectionDrawMode,
    resetState,
  };
}
