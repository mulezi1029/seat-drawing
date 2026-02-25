/**
 * MoveTool 移动工具
 *
 * 负责拖拽移动选中的座位或区域。
 * 支持实时预览和批量移动。
 */

import { Move } from 'lucide-react';
import React from 'react';
import { BaseTool } from './types';
import type { ToolEvent } from './types';
import type { Point } from '@/types';

export interface MoveCommand {
  sectionId?: string;
  seatIds: string[];
  deltaX: number;
  deltaY: number;
}

export class MoveTool extends BaseTool {
  id = 'move';
  name = 'Move';
  icon = Move;
  cursor = 'move';
  supportsUndo = true;

  /** 拖拽起始点 (世界坐标) */
  private dragStart: Point | null = null;

  /** 拖拽当前点 (世界坐标) */
  private dragCurrent: Point | null = null;

  /** 是否正在拖拽 */
  private isDragging = false;

  /** 被移动的座位原始位置 */
  private originalPositions: Map<string, Point> = new Map();

  /** 被移动的座位 ID 列表 */
  private movingSeatIds: string[] = [];

  /** 是否在区域内移动 */
  private inSectionMode: boolean = false;

  /** 拖拽阈值 */
  private readonly DRAG_THRESHOLD = 5;

  onActivate(): void {
    this.resetState();
    // 获取当前选中的座位
    this.movingSeatIds = [...this.context.selectedSeatIds];
    this.inSectionMode = !!this.context.selectedSectionId && this.movingSeatIds.length === 0;

    // 保存原始位置
    if (this.movingSeatIds.length > 0) {
      const selectedSectionId = this.context.selectedSectionId;
      if (selectedSectionId) {
        const section = this.context.venueMap.sections.find((s) => s.id === selectedSectionId);
        if (section) {
          for (const seatId of this.movingSeatIds) {
            const seat = section.seats.find((s) => s.id === seatId);
            if (seat) {
              this.originalPositions.set(seatId, { x: seat.x, y: seat.y });
            }
          }
        }
      }
    }
  }

  onDeactivate(): void {
    // 如果正在拖拽，需要恢复原始位置
    if (this.isDragging) {
      this.cancelMove();
    }
    this.resetState();
  }

  onMouseDown(e: ToolEvent): void {
    if (e.button !== 0) return;

    this.dragStart = e.worldPoint;
    this.dragCurrent = e.worldPoint;
    this.isDragging = false;
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

    // 实时更新位置
    if (this.isDragging) {
      this.updatePositions();
    }
  }

  onMouseUp(_e: ToolEvent): void {
    if (!this.dragStart) return;

    if (this.isDragging) {
      // 完成移动
      this.finalizeMove();
    }

    this.resetState();
  }

  onKeyDown(e: KeyboardEvent): void {
    // Escape 取消移动
    if (e.key === 'Escape') {
      this.cancelMove();
      this.resetState();
    }
  }

  /**
   * 实时更新座位位置
   */
  private updatePositions(): void {
    if (!this.dragStart || !this.dragCurrent) return;

    const deltaX = this.dragCurrent.x - this.dragStart.x;
    const deltaY = this.dragCurrent.y - this.dragStart.y;

    if (this.movingSeatIds.length > 0) {
      // 更新选中座位的位置
      const selectedSectionId = this.context.selectedSectionId;
      if (selectedSectionId) {
        const section = this.context.venueMap.sections.find((s) => s.id === selectedSectionId);
        if (section) {
          for (const seatId of this.movingSeatIds) {
            const originalPos = this.originalPositions.get(seatId);
            if (originalPos) {
              const seat = section.seats.find((s) => s.id === seatId);
              if (seat) {
                seat.x = originalPos.x + deltaX;
                seat.y = originalPos.y + deltaY;
              }
            }
          }
        }
      }
    } else if (this.inSectionMode && this.context.selectedSectionId) {
      // 区域移动模式 - 移动整个区域的顶点
      // 这里简化处理，实际应该通过 command 来修改
    }
  }

  /**
   * 完成移动，触发命令
   */
  private finalizeMove(): void {
    if (!this.dragStart || !this.dragCurrent) return;

    const deltaX = this.dragCurrent.x - this.dragStart.x;
    const deltaY = this.dragCurrent.y - this.dragStart.y;

    // 忽略微小的移动
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return;
    }

    // 触发完成回调
    this.onMoveComplete?.({
      sectionId: this.context.selectedSectionId || undefined,
      seatIds: this.movingSeatIds,
      deltaX,
      deltaY,
    });
  }

  /**
   * 取消移动，恢复原始位置
   */
  private cancelMove(): void {
    if (this.movingSeatIds.length > 0) {
      const selectedSectionId = this.context.selectedSectionId;
      if (selectedSectionId) {
        const section = this.context.venueMap.sections.find((s) => s.id === selectedSectionId);
        if (section) {
          for (const seatId of this.movingSeatIds) {
            const originalPos = this.originalPositions.get(seatId);
            if (originalPos) {
              const seat = section.seats.find((s) => s.id === seatId);
              if (seat) {
                seat.x = originalPos.x;
                seat.y = originalPos.y;
              }
            }
          }
        }
      }
    }
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.dragStart = null;
    this.dragCurrent = null;
    this.isDragging = false;
    this.originalPositions.clear();
    this.movingSeatIds = [];
    this.inSectionMode = false;
  }

  /**
   * 移动完成回调
   */
  onMoveComplete?: (command: MoveCommand) => void;

  /**
   * 渲染移动预览
   */
  renderOverlay(): React.ReactNode {
    if (!this.isDragging || !this.dragStart || !this.dragCurrent) {
      return null;
    }

    const deltaX = this.dragCurrent.x - this.dragStart.x;
    const deltaY = this.dragCurrent.y - this.dragStart.y;

    // 渲染移动距离指示
    const elements: React.ReactNode[] = [];

    // 绘制移动向量线
    elements.push(
      React.createElement('line', {
        key: 'move-line',
        x1: this.dragStart.x,
        y1: this.dragStart.y,
        x2: this.dragCurrent.x,
        y2: this.dragCurrent.y,
        stroke: '#3b82f6',
        strokeWidth: 1,
        strokeDasharray: '4 4',
      })
    );

    // 绘制距离文本
    elements.push(
      React.createElement('text', {
        key: 'move-text',
        x: this.dragCurrent.x + 10,
        y: this.dragCurrent.y - 10,
        fill: '#3b82f6',
        fontSize: 12,
      }, `ΔX: ${Math.round(deltaX)}, ΔY: ${Math.round(deltaY)}`)
    );

    return React.createElement('g', null, elements);
  }
}
