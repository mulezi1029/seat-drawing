/**
 * DrawSeatTool 座位绘制工具
 *
 * 负责在画布上绘制单个座位。
 * 可以在选中区域内点击添加座位。
 */

import { Circle } from 'lucide-react';
import React from 'react';
import { BaseTool } from './types';
import type { ToolEvent } from './types';
import type { Point } from '@/types';

export interface DrawSeatCommand {
  sectionId: string;
  seatId: string;
  position: Point;
  label?: string;
}

export class DrawSeatTool extends BaseTool {
  id = 'draw-seat';
  name = 'Draw Seat';
  icon = Circle;
  cursor = 'crosshair';
  supportsUndo = false;

  /** 预览位置 */
  private previewPosition: Point | null = null;

  onActivate(): void {
    this.previewPosition = null;
  }

  onDeactivate(): void {
    this.previewPosition = null;
  }

  onMouseMove(e: ToolEvent): void {
    this.previewPosition = e.worldPoint;
  }

  onMouseDown(e: ToolEvent): void {
    if (e.button !== 0) return;

    const selectedSectionId = this.context.selectedSectionId;
    if (!selectedSectionId) {
      // 如果没有选中区域，提示用户
      console.warn('No section selected. Please select a section first.');
      return;
    }

    // 添加座位
    this.addSeat(e.worldPoint, selectedSectionId);
  }

  onMouseLeave(): void {
    this.previewPosition = null;
  }

  onKeyDown(e: KeyboardEvent): void {
    // Escape 取消预览
    if (e.key === 'Escape') {
      this.previewPosition = null;
    }
  }

  /**
   * 添加座位
   */
  private addSeat(position: Point, sectionId: string): void {
    // 使用 context 中的 addSeat 方法
    this.context.addSeat(sectionId, position);
  }

  /**
   * 渲染预览
   */
  renderOverlay(): React.ReactNode {
    if (!this.previewPosition) return null;

    // 检查是否有选中区域
    if (!this.context.selectedSectionId) {
      // 显示无法绘制的提示
      return React.createElement('text', {
        x: this.previewPosition.x + 15,
        y: this.previewPosition.y - 15,
        fill: '#ef4444',
        fontSize: 12,
      }, '请先选择一个区域');
    }

    // 渲染预览圆
    return React.createElement('circle', {
      cx: this.previewPosition.x,
      cy: this.previewPosition.y,
      r: 10,
      fill: 'rgba(59, 130, 246, 0.3)',
      stroke: '#3b82f6',
      strokeWidth: 2,
    });
  }
}
