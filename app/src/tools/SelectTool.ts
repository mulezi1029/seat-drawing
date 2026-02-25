/**
 * SelectTool 选择工具
 *
 * 负责框选、多选、套索选择等功能。
 * 在座位编辑模式下使用此工具选择多个座位。
 */

import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { BaseTool } from './types';
import type { ToolEvent } from './types';
import type { Point } from '@/types';

export class SelectTool extends BaseTool {
  id = 'select';
  name = 'Select';
  icon = MousePointer2;
  cursor = 'crosshair';

  /** 拖拽起始点 (世界坐标) */
  private dragStart: Point | null = null;

  /** 拖拽当前点 (世界坐标) */
  private dragCurrent: Point | null = null;

  /** 是否正在拖拽 */
  private isDragging = false;

  /** 拖拽阈值 */
  private readonly DRAG_THRESHOLD = 5;

  /** 选择前的座位选择状态 (用于 Shift 多选) */
  private selectionBeforeDrag: string[] = [];

  onActivate(): void {
    this.resetState();
  }

  onDeactivate(): void {
    this.resetState();
  }

  onMouseDown(e: ToolEvent): void {
    if (e.button !== 0) return;

    this.dragStart = e.worldPoint;
    this.dragCurrent = e.worldPoint;
    this.isDragging = false;

    // 保存当前选择状态 (用于 Shift 多选)
    if (e.shiftKey) {
      this.selectionBeforeDrag = Array.from(this.context.selectedSeatIds);
    } else {
      this.selectionBeforeDrag = [];
    }
  }

  onMouseMove(e: ToolEvent): void {
    if (!this.dragStart) return;

    this.dragCurrent = e.worldPoint;

    // 检测是否开始拖拽
    if (!this.isDragging) {
      const dx = e.worldPoint.x - this.dragStart.x;
      const dy = e.worldPoint.y - this.dragStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }
    }

    // 实时更新选择
    if (this.isDragging) {
      this.updateSelection(e.shiftKey);
      // 更新框选框显示
      this.context.setToolOverlay(this.renderOverlay());
    }
  }

  onMouseUp(e: ToolEvent): void {
    if (!this.dragStart) return;

    // 如果没有拖拽 (只是点击)
    if (!this.isDragging) {
      // 执行点击选择
      this.handleClickSelect(e);
    } else {
      // 完成框选
      this.finalizeSelection();
    }

    // 清除框选框显示
    this.context.setToolOverlay(null);
    this.resetState();
  }

  onKeyDown(e: KeyboardEvent): void {
    // Escape 取消选择
    if (e.key === 'Escape') {
      this.context.clearSeatSelection();
      this.resetState();
    }

    // Ctrl/Cmd + A 全选
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      this.selectAllInCurrentSection();
    }
  }

  /**
   * 处理点击选择
   */
  private handleClickSelect(e: ToolEvent): void {
    const selectedSectionId = this.context.selectedSectionId;
    if (!selectedSectionId) return;

    const section = this.context.venueMap.sections.find((s) => s.id === selectedSectionId);
    if (!section) return;

    const seatInfo = this.context.getSeatAtPoint(e.worldPoint, section);

    if (seatInfo) {
      // 点击到座位: 切换选择
      this.context.selectSeat(seatInfo.seat.id, e.shiftKey);
    } else if (!e.shiftKey) {
      // 点击空白处且没有按 Shift: 清空选择
      this.context.clearSeatSelection();
    }
  }

  /**
   * 实时更新选择 (拖拽过程中)
   */
  private updateSelection(shiftKey: boolean): void {
    if (!this.dragStart || !this.dragCurrent) return;

    // 计算选择框
    const box = this.getSelectionBox();

    // 根据当前模式决定选择策略
    const mode = this.context.mode;

    if (mode === 'draw-seat') {
      // 在 draw-seat 模式下：框选座位
      this.updateSeatSelection(box, shiftKey);
    } else if (mode === 'view') {
      // 在 view 模式下：框选区域
      this.updateSectionSelection(box, shiftKey);
    }
  }

  /**
   * 更新座位选择 (在 draw-seat 模式下)
   */
  private updateSeatSelection(
    box: { minX: number; minY: number; maxX: number; maxY: number },
    shiftKey: boolean
  ): void {
    const selectedSectionId = this.context.selectedSectionId;
    if (!selectedSectionId) return;

    const section = this.context.venueMap.sections.find((s) => s.id === selectedSectionId);
    if (!section) return;

    // 获取框内的座位
    const seatsInBox = section.seats.filter((seat) =>
      this.isPointInBox({ x: seat.x, y: seat.y }, box)
    );

    const seatIdsInBox = seatsInBox.map((s) => s.id);

    // 更新选择
    if (shiftKey) {
      // Shift 模式: 合并初始选择和框选
      const combined = new Set([...this.selectionBeforeDrag, ...seatIdsInBox]);
      this.context.selectSeats(Array.from(combined));
    } else {
      this.context.selectSeats(seatIdsInBox);
    }
  }

  /**
   * 更新区域选择 (在 view 模式下)
   */
  private updateSectionSelection(
    box: { minX: number; minY: number; maxX: number; maxY: number },
    shiftKey: boolean
  ): void {
    // 获取框内的区域
    const sectionsInBox: string[] = [];

    for (const section of this.context.venueMap.sections) {
      // 计算区域的边界框
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const point of section.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }

      // 检查区域边界框是否与选择框相交
      if (this.isBoxesIntersect(box, { minX, minY, maxX, maxY })) {
        sectionsInBox.push(section.id);
      }
    }

    // 在 view 模式下，只支持单选区域，选择第一个
    if (sectionsInBox.length > 0) {
      const firstSectionId = sectionsInBox[0];
      if (shiftKey) {
        // Shift 模式：如果已选中则取消，否则选中
        if (this.context.selectedSectionId === firstSectionId) {
          this.context.setSelectedSectionId(null);
        } else {
          this.context.setSelectedSectionId(firstSectionId);
        }
      } else {
        this.context.setSelectedSectionId(firstSectionId);
      }
    } else if (!shiftKey) {
      // 没有框中任何区域且没有按 Shift：清空选择
      this.context.setSelectedSectionId(null);
    }
  }

  /**
   * 检查两个边界框是否相交
   */
  private isBoxesIntersect(
    box1: { minX: number; minY: number; maxX: number; maxY: number },
    box2: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return (
      box1.minX <= box2.maxX &&
      box1.maxX >= box2.minX &&
      box1.minY <= box2.maxY &&
      box1.maxY >= box2.minY
    );
  }

  /**
   * 完成选择
   */
  private finalizeSelection(): void {
    // 选择已经在拖拽过程中实时更新
    // 这里可以添加选择完成的回调或动画
  }

  /**
   * 选中当前区域的所有座位
   */
  private selectAllInCurrentSection(): void {
    const selectedSectionId = this.context.selectedSectionId;
    if (!selectedSectionId) return;

    const section = this.context.venueMap.sections.find((s) => s.id === selectedSectionId);
    if (!section) return;

    this.context.selectSeats(section.seats.map((s) => s.id));
  }

  /**
   * 获取选择框
   */
  private getSelectionBox(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.dragStart || !this.dragCurrent) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    return {
      minX: Math.min(this.dragStart.x, this.dragCurrent.x),
      minY: Math.min(this.dragStart.y, this.dragCurrent.y),
      maxX: Math.max(this.dragStart.x, this.dragCurrent.x),
      maxY: Math.max(this.dragStart.y, this.dragCurrent.y),
    };
  }

  /**
   * 检查点是否在框内
   */
  private isPointInBox(
    point: Point,
    box: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return point.x >= box.minX && point.x <= box.maxX && point.y >= box.minY && point.y <= box.maxY;
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.dragStart = null;
    this.dragCurrent = null;
    this.isDragging = false;
    this.selectionBeforeDrag = [];
  }

  /**
   * 渲染选择框 (用于 overlay)
   */
  renderOverlay(): React.ReactNode {
    if (!this.isDragging || !this.dragStart || !this.dragCurrent) {
      return null;
    }

    const box = this.getSelectionBox();

    // 注意: 这里返回的是世界坐标，需要由调用方进行坐标转换
    return React.createElement('rect', {
      x: box.minX,
      y: box.minY,
      width: box.maxX - box.minX,
      height: box.maxY - box.minY,
      fill: 'rgba(59, 130, 246, 0.1)',
      stroke: '#3b82f6',
      strokeWidth: 1,
      strokeDasharray: '4 4',
    });
  }
}
