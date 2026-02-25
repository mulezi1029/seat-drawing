/**
 * DrawSectionTool 区域绘制工具
 *
 * 负责绘制区域多边形或矩形。
 * 支持多边形模式和矩形模式。
 */

import React from 'react';
import { Square } from 'lucide-react';
import { BaseTool } from './types';
import type { ToolEvent, Command } from './types';
import type { Point } from '@/types';

export interface DrawSectionCommand extends Command {
  points: Point[];
  name: string;
}

export class DrawSectionTool extends BaseTool {
  id = 'draw-section';
  name = 'Draw Section';
  icon = Square;
  cursor = 'crosshair';
  supportsUndo = false; // 绘制过程中不加入历史，完成后整体加入

  /** 绘制模式: 'polygon' | 'rectangle' */
  drawMode: 'polygon' | 'rectangle' = 'polygon';

  /** 已绘制的顶点 */
  private points: Point[] = [];

  /** 当前鼠标位置 (用于预览线) */
  private currentMousePos: Point | null = null;

  /** 矩形模式的第一个点 */
  private rectFirstPoint: Point | null = null;

  onActivate(): void {
    this.resetState();
  }

  onDeactivate(): void {
    // 如果还有未完成的绘制，取消它
    if (this.context.sectionPoints.length > 0) {
      this.cancelDrawing();
    }
    this.resetState();
  }

  onMouseDown(e: ToolEvent): void {
    if (e.button !== 0) return;

    // 检查是否点击了起点 (闭合多边形)
    if (this.drawMode === 'polygon' && this.points.length >= 3) {
      const firstPoint = this.points[0];
      const distance = this.getDistance(e.worldPoint, firstPoint);

      if (distance < 15) {
        // 点击了起点，完成绘制
        this.completeDrawing();
        return;
      }
    }

    // 添加新点
    this.addPoint(e.worldPoint);
  }

  onMouseMove(e: ToolEvent): void {
    this.currentMousePos = e.worldPoint;

    // 矩形模式: 更新预览
    if (this.drawMode === 'rectangle' && this.rectFirstPoint && this.currentMousePos) {
      // 矩形预览在 renderOverlay 中处理
    }
  }

  onMouseUp(_e: ToolEvent): void {
    // 矩形模式: 释放鼠标完成矩形
    if (this.drawMode === 'rectangle' && this.rectFirstPoint) {
      const distance = this.getDistance(_e.worldPoint, this.rectFirstPoint);

      if (distance > 15) {
        // 生成矩形的四个顶点
        const p1 = this.rectFirstPoint;
        const p2 = _e.worldPoint;
        this.points = [
          { x: p1.x, y: p1.y },
          { x: p2.x, y: p1.y },
          { x: p2.x, y: p2.y },
          { x: p1.x, y: p2.y },
        ];
        this.completeDrawing();
      } else {
        // 距离太小，取消
        this.rectFirstPoint = null;
      }
    }
  }

  onDoubleClick(_e: ToolEvent): void {
    // 双击完成多边形绘制
    if (this.drawMode === 'polygon' && this.context.sectionPoints.length >= 3) {
      this.completeDrawing();
    }
  }

  onKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Escape':
        this.cancelDrawing();
        break;
      case 'Backspace':
      case 'Delete':
        this.removeLastPoint();
        break;
      case 'Enter':
        if (this.context.sectionPoints.length >= 3) {
          this.completeDrawing();
        }
        break;
    }

    // Ctrl+Z 撤销最后一个点
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      this.removeLastPoint();
    }
  }

  /**
   * 添加顶点
   */
  private addPoint(point: Point): void {
    // 使用 context 的 addSectionPoint 方法，让编辑器状态更新
    this.context.addSectionPoint(point);
    // 同时更新本地 points 用于渲染
    this.points = this.context.sectionPoints;
  }

  /**
   * 移除最后一个顶点
   */
  private removeLastPoint(): void {
    this.context.removeLastSectionPoint();
    this.points = this.context.sectionPoints;
  }

  /**
   * 完成绘制
   */
  private completeDrawing(): void {
    if (this.context.sectionPoints.length < 3) return;

    // 检查是否共线 (不能形成有效多边形)
    if (this.arePointsCollinear(this.context.sectionPoints)) {
      console.warn('Points are collinear, cannot create section');
      return;
    }

    // 使用 context 的 completeSectionDrawing 方法
    const defaultName = `Section ${this.context.venueMap.sections.length + 1}`;
    this.context.completeSectionDrawing(defaultName);

    this.resetState();
  }

  /**
   * 取消绘制
   */
  private cancelDrawing(): void {
    this.context.cancelSectionDrawing();
    this.resetState();
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.points = [];
    this.currentMousePos = null;
    this.rectFirstPoint = null;
  }

  /**
   * 计算两点距离
   */
  private getDistance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查点是否共线
   */
  private arePointsCollinear(points: Point[]): boolean {
    if (points.length < 3) return true;

    const p1 = points[0];
    const p2 = points[1];

    for (let i = 2; i < points.length; i++) {
      const p3 = points[i];
      const crossProduct = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
      if (Math.abs(crossProduct) > 1e-10) {
        return false;
      }
    }
    return true;
  }

  /**
   * 绘制完成回调
   */
  onDrawingComplete?: (points: Point[], name: string) => void;

  /**
   * 获取当前绘制的点
   */
  getPoints(): Point[] {
    return this.context.sectionPoints;
  }

  /**
   * 渲染绘制预览
   */
  renderOverlay(): React.ReactNode {
    const points = this.context.sectionPoints;
    if (points.length === 0) return null;

    const elements: React.ReactNode[] = [];

    // 渲染已绘制的线段
    if (points.length > 1) {
      const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');
      elements.push(
        React.createElement('polyline', {
          key: 'drawn-lines',
          points: pointsStr,
          fill: 'none',
          stroke: '#3b82f6',
          strokeWidth: 2,
          strokeDasharray: 'none',
        })
      );
    }

    // 渲染预览线
    if (this.currentMousePos) {
      if (this.drawMode === 'rectangle' && this.rectFirstPoint) {
        // 矩形预览
        const p1 = this.rectFirstPoint;
        const p2 = this.currentMousePos;
        const rectPoints = `${p1.x},${p1.y} ${p2.x},${p1.y} ${p2.x},${p2.y} ${p1.x},${p2.y}`;
        elements.push(
          React.createElement('polygon', {
            key: 'rect-preview',
            points: rectPoints,
            fill: 'rgba(59, 130, 246, 0.1)',
            stroke: '#3b82f6',
            strokeWidth: 2,
            strokeDasharray: '4 4',
          })
        );
      } else if (points.length > 0) {
        // 多边形预览线
        const lastPoint = points[points.length - 1];
        elements.push(
          React.createElement('line', {
            key: 'preview-line',
            x1: lastPoint.x,
            y1: lastPoint.y,
            x2: this.currentMousePos.x,
            y2: this.currentMousePos.y,
            stroke: '#3b82f6',
            strokeWidth: 2,
            strokeDasharray: '4 4',
          })
        );
      }
    }

    // 渲染顶点
    points.forEach((point, index) => {
      elements.push(
        React.createElement('circle', {
          key: `point-${index}`,
          cx: point.x,
          cy: point.y,
          r: index === 0 ? 6 : 4,
          fill: index === 0 ? '#10b981' : '#3b82f6',
          stroke: 'white',
          strokeWidth: 2,
        })
      );
    });

    return React.createElement('g', null, elements);
  }
}
