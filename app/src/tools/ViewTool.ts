/**
 * ViewTool 视图工具
 *
 * 默认工具，负责:
 * - 画布平移 (拖拽空白处)
 * - 点击选中对象 (Section 或 Seat)
 * - 拖拽移动选中的 Section
 * - 作为其他工具的兜底工具
 */

import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { BaseTool } from './types';
import type { ToolEvent } from './types';
import type { Point } from '@/types';
import { MoveSectionCommand } from '@/commands';

export class ViewTool extends BaseTool {
  id = 'view';
  name = 'View';
  icon = MousePointer2;
  cursor = 'default';

  private panStart: { x: number; y: number } | null = null;
  private initialOffset: { x: number; y: number } | null = null;

  // Section 拖拽状态
  private isDraggingSection = false;
  private dragStartPoint: Point | null = null;
  private dragCurrentPoint: Point | null = null;
  private draggedSectionId: string | null = null;
  private dragThreshold = 5; // 拖拽阈值（像素）

  // 框选状态
  private isBoxSelecting = false;
  private boxSelectStart: Point | null = null;
  private boxSelectCurrent: Point | null = null;
  // 用于保存框选前的选择状态（Shift多选时使用）
  // @ts-expect-error - 保留用于未来实现 Shift+框选功能
  private _selectionBeforeDrag: string[] = [];

  onMouseDown(e: ToolEvent): void {
    // 中键点击或 Space + 左键 = 平移
    if (e.button === 1 || (e.button === 0 && this.context.isSpacePressed())) {
      this.panStart = { x: e.screenPoint.x, y: e.screenPoint.y };
      this.initialOffset = {
        x: this.context.viewport.offsetX,
        y: this.context.viewport.offsetY,
      };
      return;
    }

    // 左键点击 = 选择或开始拖拽/框选
    if (e.button === 0) {
      // 检查是否点击在已选中的 Section 上
      const clickedSection = this.context.getSectionAtPoint(e.worldPoint);
      if (clickedSection && this.context.selectedSectionId === clickedSection.id) {
        // 点击在已选中的 Section 上，开始拖拽
        this.startSectionDrag(e.worldPoint, clickedSection.id);
        return;
      }

      // 否则开始框选（在 mouseup 时如果没有拖动则执行点击选择）
      this.startBoxSelect(e.worldPoint, e.shiftKey);
    }
  }

  /**
   * 开始框选
   */
  private startBoxSelect(point: Point, shiftKey: boolean): void {
    this.isBoxSelecting = true;
    this.boxSelectStart = point;
    this.boxSelectCurrent = point;

    // 保存当前选择状态（用于 Shift 多选）
    if (shiftKey && this.context.selectedSectionId) {
      this._selectionBeforeDrag = [this.context.selectedSectionId];
    } else {
      this._selectionBeforeDrag = [];
    }
  }

  onMouseMove(e: ToolEvent): void {
    // 处理平移
    if (this.panStart && this.initialOffset) {
      const dx = e.screenPoint.x - this.panStart.x;
      const dy = e.screenPoint.y - this.panStart.y;

      this.context.setViewport({
        ...this.context.viewport,
        offsetX: this.initialOffset.x + dx,
        offsetY: this.initialOffset.y + dy,
      });
      return;
    }

    // 处理 Section 拖拽
    if (this.isDraggingSection && this.dragStartPoint) {
      this.dragCurrentPoint = e.worldPoint;

      // 检查是否超过拖拽阈值
      const dx = this.dragCurrentPoint.x - this.dragStartPoint.x;
      const dy = this.dragCurrentPoint.y - this.dragStartPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.dragThreshold) {
        // 更新光标为 grabbing
        this.context.setCursor('grabbing');
      }

      // 触发重绘以更新预览
      this.context.setToolOverlay(this.renderDragPreview());
      return;
    }

    // 处理框选
    if (this.isBoxSelecting && this.boxSelectStart) {
      this.boxSelectCurrent = e.worldPoint;

      // 检查是否超过拖拽阈值（开始实际框选）
      const dx = this.boxSelectCurrent.x - this.boxSelectStart.x;
      const dy = this.boxSelectCurrent.y - this.boxSelectStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.dragThreshold) {
        // 更新选择
        this.updateBoxSelection();
        // 触发重绘以更新框选框显示
        this.context.setToolOverlay(this.renderBoxSelectPreview());
      }
    }
  }

  /**
   * 更新框选选择
   */
  private updateBoxSelection(): void {
    if (!this.boxSelectStart || !this.boxSelectCurrent) return;

    const box = this.getSelectionBox();

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

    // 在 view 模式下，选择第一个框中的区域
    if (sectionsInBox.length > 0) {
      const firstSectionId = sectionsInBox[0];
      if (this.context.selectedSectionId !== firstSectionId) {
        this.context.setSelectedSectionId(firstSectionId);
        this.context.clearSeatSelection();
      }
    }
  }

  /**
   * 获取选择框
   */
  private getSelectionBox(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.boxSelectStart || !this.boxSelectCurrent) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    return {
      minX: Math.min(this.boxSelectStart.x, this.boxSelectCurrent.x),
      minY: Math.min(this.boxSelectStart.y, this.boxSelectCurrent.y),
      maxX: Math.max(this.boxSelectStart.x, this.boxSelectCurrent.x),
      maxY: Math.max(this.boxSelectStart.y, this.boxSelectCurrent.y),
    };
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
   * 渲染框选预览
   */
  private renderBoxSelectPreview(): React.ReactNode {
    if (!this.isBoxSelecting || !this.boxSelectStart || !this.boxSelectCurrent) {
      return null;
    }

    const box = this.getSelectionBox();

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

  onMouseUp(e: ToolEvent): void {
    // 结束平移
    if (this.panStart) {
      this.panStart = null;
      this.initialOffset = null;
      return;
    }

    // 结束 Section 拖拽
    if (this.isDraggingSection && this.dragStartPoint && this.draggedSectionId) {
      const dx = e.worldPoint.x - this.dragStartPoint.x;
      const dy = e.worldPoint.y - this.dragStartPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 如果移动距离超过阈值，提交移动命令
      if (distance > this.dragThreshold) {
        const command = new MoveSectionCommand(this.draggedSectionId, dx, dy);
        this.context.execute(command);
      }

      this.endSectionDrag();
      return;
    }

    // 结束框选
    if (this.isBoxSelecting) {
      // 检查是否进行了实际拖动（超过阈值）
      let didDrag = false;
      if (this.boxSelectStart && this.boxSelectCurrent) {
        const dx = this.boxSelectCurrent.x - this.boxSelectStart.x;
        const dy = this.boxSelectCurrent.y - this.boxSelectStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        didDrag = distance > this.dragThreshold;
      }

      if (!didDrag) {
        // 没有拖动，执行点击选择
        this.handleClickSelect(e);
      }

      this.endBoxSelect();
      return;
    }

    // 重置光标
    this.context.setCursor(this.cursor);
  }

  /**
   * 结束框选
   */
  private endBoxSelect(): void {
    this.isBoxSelecting = false;
    this.boxSelectStart = null;
    this.boxSelectCurrent = null;
    this._selectionBeforeDrag = [];
    this.context.setToolOverlay(null);
  }

  /**
   * 处理点击选择
   */
  private handleClickSelect(e: ToolEvent): void {
    const { shiftKey } = e;

    // 1. 尝试选中 Seat（如果在 draw-seat 模式下）
    const selectedSectionId = this.context.selectedSectionId;
    if (selectedSectionId) {
      const section = this.context.venueMap.sections.find(s => s.id === selectedSectionId);
      if (section) {
        const seatInfo = this.context.getSeatAtPoint(e.worldPoint, section);
        if (seatInfo) {
          this.context.selectSeat(seatInfo.seat.id, shiftKey);
          return;
        }
      }
    }

    // 2. 尝试选中 Section
    const section = this.context.getSectionAtPoint(e.worldPoint);
    if (section) {
      if (shiftKey) {
        // Shift + 点击: 如果已选中则取消，否则选中
        if (this.context.selectedSectionId === section.id) {
          this.context.setSelectedSectionId(null);
        } else {
          this.context.setSelectedSectionId(section.id);
        }
      } else {
        // 普通点击: 直接选中
        this.context.setSelectedSectionId(section.id);
      }

      // 清空座位选择
      this.context.clearSeatSelection();
      return;
    }

    // 3. 点击空白处: 如果没有按 Shift，清空所有选择
    if (!shiftKey) {
      this.context.setSelectedSectionId(null);
      this.context.clearSeatSelection();
    }
  }

  onDoubleClick(e: ToolEvent): void {
    // 双击 Section 进入编辑模式
    const section = this.context.getSectionAtPoint(e.worldPoint);
    if (section) {
      this.context.enterSection(section.id);
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();

    const { viewport, setViewport } = this.context;
    const zoomDelta = -e.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(10, viewport.scale * (1 + zoomDelta)));

    // 以鼠标位置为中心缩放
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 计算鼠标位置对应的世界坐标 (缩放前)
    const worldX = (mouseX - viewport.offsetX) / viewport.scale;
    const worldY = (mouseY - viewport.offsetY) / viewport.scale;

    // 计算新的 offset，使世界坐标在缩放后仍对应鼠标位置
    const newOffsetX = mouseX - worldX * newScale;
    const newOffsetY = mouseY - worldY * newScale;

    setViewport({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }

  /**
   * 开始 Section 拖拽
   */
  private startSectionDrag(point: Point, sectionId: string): void {
    this.isDraggingSection = true;
    this.dragStartPoint = point;
    this.dragCurrentPoint = point;
    this.draggedSectionId = sectionId;
    this.context.setCursor('grab');
  }

  /**
   * 结束 Section 拖拽
   */
  private endSectionDrag(): void {
    this.isDraggingSection = false;
    this.dragStartPoint = null;
    this.dragCurrentPoint = null;
    this.draggedSectionId = null;
    this.context.setCursor(this.cursor);
    this.context.setToolOverlay(null);
  }

  /**
   * 渲染拖拽预览
   * 返回 SVG 元素供 overlay 层使用
   */
  private renderDragPreview(): React.ReactNode {
    if (!this.isDraggingSection || !this.dragStartPoint || !this.dragCurrentPoint || !this.draggedSectionId) {
      return null;
    }

    const section = this.context.venueMap.sections.find(s => s.id === this.draggedSectionId);
    if (!section) return null;

    const dx = this.dragCurrentPoint.x - this.dragStartPoint.x;
    const dy = this.dragCurrentPoint.y - this.dragStartPoint.y;

    // 计算平移后的点
    const translatedPoints = section.points.map(p => `${p.x + dx},${p.y + dy}`).join(' ');

    return React.createElement('polygon', {
      points: translatedPoints,
      fill: section.color || '#e3e3e3',
      fillOpacity: 0.5,
      stroke: '#3b82f6',
      strokeWidth: 2,
      strokeDasharray: '4 4',
    });
  }

}
