/**
 * OverlayRenderer - 叠加层渲染器
 *
 * 负责渲染叠加在场景之上的图形：
 * - 选中框
 * - 拖拽预览
 * - 测量线
 * - 绘制预览
 *
 * 这些图形位于 viewport 内部，跟随内容移动，但使用 vector-effect="non-scaling-stroke" 保持线宽不变。
 */

import type { Point, BoundingBox } from '@/types';
import { CANVAS_CONFIG } from '@/types';

/**
 * 叠加层渲染器配置
 */
export interface OverlayRendererConfig {
  /** 父容器元素（通常是 viewport） */
  container: SVGGElement | null;
  /** 是否使用非缩放描边 (vector-effect="non-scaling-stroke") */
  useNonScalingStroke?: boolean;
}

/**
 * 叠加层渲染器
 */
export class OverlayRenderer {
  container: SVGGElement | null = null;
  private useNonScalingStroke: boolean = true;

  constructor(config: OverlayRendererConfig | SVGSVGElement | null) {
    // 处理旧版构造函数签名 (svg: SVGSVGElement | null)
    if (config === null || config instanceof SVGSVGElement) {
      const svg = config;
      if (!svg) return;

      // 查找或创建 overlay 层
      this.container = svg.querySelector('.layer-overlay') as SVGGElement;
      if (!this.container) {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttribute('class', 'layer-overlay');
        svg.appendChild(this.container);
      }
      this.useNonScalingStroke = false; // 旧版行为：根级别，不使用非缩放描边
      return;
    }

    // 新版构造函数签名
    if (config.container) {
      this.container = config.container;
      this.useNonScalingStroke = config.useNonScalingStroke ?? true;
    }
  }

  /**
   * 清空叠加层
   */
  clear(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * 设置非缩放描边
   */
  private setNonScalingStroke(element: SVGElement): void {
    if (this.useNonScalingStroke) {
      element.setAttribute('vector-effect', 'non-scaling-stroke');
    }
  }

  /**
   * 渲染选中框
   * @param bounds 边界框（世界坐标）
   * @param color 边框颜色
   * @param showFill 是否显示半透明填充（框选时true，选中框时false）
   */
  renderSelectionBox(bounds: BoundingBox, color: string = '#3b82f6', showFill: boolean = true): void {
    if (!this.container) return;

    // 统一的框选样式配置
    const STROKE_WIDTH = 2;
    const FILL_OPACITY = showFill ? '0.15' : '0';
    const CONTROL_POINT_RADIUS = 3;
    const CONTROL_POINT_SIZE = 6;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(bounds.minX));
    rect.setAttribute('y', String(bounds.minY));
    rect.setAttribute('width', String(bounds.maxX - bounds.minX));
    rect.setAttribute('height', String(bounds.maxY - bounds.minY));
    rect.setAttribute('fill', color);
    rect.setAttribute('fill-opacity', FILL_OPACITY);
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', String(STROKE_WIDTH));
    rect.setAttribute('stroke-dasharray', showFill ? 'none' : '4 2'); // 选中框用虚线，框选用实线
    rect.setAttribute('class', 'selection-box');

    this.setNonScalingStroke(rect);

    this.container.appendChild(rect);

    // 渲染控制点（只在非框选模式下显示，即选中框）
    if (!showFill) {
      this.renderControlPoints(bounds, color, CONTROL_POINT_SIZE, CONTROL_POINT_RADIUS);
    }
  }

  /**
   * 渲染控制点
   * @param bounds 边界框
   * @param color 颜色
   * @param size 控制点外框大小
   * @param radius 控制点半径
   */
  private renderControlPoints(bounds: BoundingBox, color: string, size: number = 6, _radius?: number): void {
    if (!this.container) return;

    const points = [
      { x: bounds.minX, y: bounds.minY, pos: 'nw' }, // 左上
      { x: bounds.maxX, y: bounds.minY, pos: 'ne' }, // 右上
      { x: bounds.maxX, y: bounds.maxY, pos: 'se' }, // 右下
      { x: bounds.minX, y: bounds.maxY, pos: 'sw' }, // 左下
    ];

    for (const point of points) {
      // 外框（白色背景）
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', String(point.x - size / 2));
      bg.setAttribute('y', String(point.y - size / 2));
      bg.setAttribute('width', String(size));
      bg.setAttribute('height', String(size));
      bg.setAttribute('fill', 'white');
      bg.setAttribute('stroke', color);
      bg.setAttribute('stroke-width', '1');
      bg.setAttribute('class', `control-point control-point-${point.pos}`);
      bg.setAttribute('vector-effect', 'non-scaling-stroke');

      this.container.appendChild(bg);
    }
  }

  /**
   * 渲染拖拽预览
   * @param originalBounds 原始边界框
   * @param deltaX X方向偏移
   * @param deltaY Y方向偏移
   */
  renderDragPreview(originalBounds: BoundingBox, deltaX: number, deltaY: number): void {
    if (!this.container) return;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(originalBounds.minX + deltaX));
    rect.setAttribute('y', String(originalBounds.minY + deltaY));
    rect.setAttribute('width', String(originalBounds.maxX - originalBounds.minX));
    rect.setAttribute('height', String(originalBounds.maxY - originalBounds.minY));
    rect.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('class', 'drag-preview');

    this.container.appendChild(rect);
  }

  /**
   * 渲染测量线
   * @param start 起点
   * @param end 终点
   * @param label 标签文本
   */
  renderMeasurementLine(start: Point, end: Point, label?: string): void {
    if (!this.container) return;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'measurement-line');

    // 主线
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(start.x));
    line.setAttribute('y1', String(start.y));
    line.setAttribute('x2', String(end.x));
    line.setAttribute('y2', String(end.y));
    line.setAttribute('stroke', '#ef4444');
    line.setAttribute('stroke-width', '1');

    this.setNonScalingStroke(line);

    group.appendChild(line);

    // 端点标记
    [start, end].forEach(point => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#ef4444');
      this.setNonScalingStroke(circle);
      group.appendChild(circle);
    });

    // 标签
    if (label) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(midX));
      text.setAttribute('y', String(midY - 5));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#ef4444');
      text.setAttribute('font-size', '12');
      text.setAttribute('class', 'measurement-label');
      text.textContent = label;

      group.appendChild(text);
    }

    this.container.appendChild(group);
  }

  /**
   * 渲染绘制预览线
   * @param points 已绘制的点
   * @param currentPos 当前鼠标位置
   */
  renderDrawingPreview(points: Point[], currentPos: Point | null): void {
    if (!this.container || points.length === 0) return;

    // 绘制已完成的线段
    if (points.length > 1) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
      polyline.setAttribute('points', pointsStr);
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', '#3b82f6');
      polyline.setAttribute('stroke-width', '2');
      polyline.setAttribute('class', 'drawing-preview-line');

      this.setNonScalingStroke(polyline);
      this.container.appendChild(polyline);
    }

    // 绘制预览线（从最后一点到鼠标位置）
    if (currentPos && points.length > 0) {
      const lastPoint = points[points.length - 1];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(lastPoint.x));
      line.setAttribute('y1', String(lastPoint.y));
      line.setAttribute('x2', String(currentPos.x));
      line.setAttribute('y2', String(currentPos.y));
      line.setAttribute('stroke', '#3b82f6');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('class', 'drawing-preview-current');

      this.setNonScalingStroke(line);
      this.container.appendChild(line);
    }

    // 绘制顶点
    const container = this.container;
    points.forEach((point, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', '2px');
      circle.setAttribute('fill', index === 0 ? '#10b981' : '#3b82f6');
      circle.setAttribute('class', 'drawing-preview-point');

      container?.appendChild(circle);
    });

    // 绘制水平和垂直辅助线（对齐辅助线）
    if (currentPos) {
      this.renderAlignmentGuides(points, currentPos);
    }
  }

  /**
   * 渲染对齐辅助线
   * @param points 已绘制的点
   * @param currentPos 当前鼠标位置
   */
  private renderAlignmentGuides(points: Point[], currentPos: Point): void {
    if (!this.container) return;

    const worldSize = CANVAS_CONFIG.WORLD_SIZE;
    const snapThreshold = 5; // 对齐阈值（像素）

    // 检查是否与某个已有点水平对齐（y 坐标相同）
    let isHorizontalAligned = false;
    let alignedY: number | null = null;

    for (const point of points) {
      if (Math.abs(point.y - currentPos.y) <= snapThreshold) {
        isHorizontalAligned = true;
        alignedY = point.y;
        break;
      }
    }

    // 检查是否与某个已有点垂直对齐（x 坐标相同）
    let isVerticalAligned = false;
    let alignedX: number | null = null;

    for (const point of points) {
      if (Math.abs(point.x - currentPos.x) <= snapThreshold) {
        isVerticalAligned = true;
        alignedX = point.x;
        break;
      }
    }

    // 水平辅助线（贯穿整个世界坐标范围）
    const hLineY = isHorizontalAligned ? alignedY! : currentPos.y;
    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', String(-worldSize / 2));
    hLine.setAttribute('y1', String(hLineY));
    hLine.setAttribute('x2', String(worldSize / 2));
    hLine.setAttribute('y2', String(hLineY));
    hLine.setAttribute('stroke', isHorizontalAligned ? '#22c55e' : '#94a3b8'); // 对齐时为绿色，否则为灰色
    hLine.setAttribute('stroke-width', isHorizontalAligned ? '2' : '1');
    hLine.setAttribute('class', 'alignment-guide-horizontal');
    hLine.style.opacity = '0.6';

    this.setNonScalingStroke(hLine);
    this.container.appendChild(hLine);

    // 垂直辅助线（贯穿整个世界坐标范围）
    const vLineX = isVerticalAligned ? alignedX! : currentPos.x;
    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vLine.setAttribute('x1', String(vLineX));
    vLine.setAttribute('y1', String(-worldSize / 2));
    vLine.setAttribute('x2', String(vLineX));
    vLine.setAttribute('y2', String(worldSize / 2));
    vLine.setAttribute('stroke', isVerticalAligned ? '#22c55e' : '#94a3b8'); // 对齐时为绿色，否则为灰色
    vLine.setAttribute('stroke-width', isVerticalAligned ? '2' : '1');
    vLine.setAttribute('class', 'alignment-guide-vertical');
    vLine.style.opacity = '0.6';

    this.setNonScalingStroke(vLine);
    this.container.appendChild(vLine);

    // 如果水平对齐，在对应的已有点位置显示一个标记
    if (isHorizontalAligned) {
      const hMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hMarker.setAttribute('cx', String(currentPos.x));
      hMarker.setAttribute('cy', String(alignedY!));
      hMarker.setAttribute('r', '4');
      hMarker.setAttribute('fill', '#22c55e');
      hMarker.setAttribute('stroke', 'white');
      hMarker.setAttribute('stroke-width', '1');
      hMarker.setAttribute('class', 'alignment-marker-horizontal');
      this.container.appendChild(hMarker);
    }

    // 如果垂直对齐，在对应的已有点位置显示一个标记
    if (isVerticalAligned) {
      const vMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      vMarker.setAttribute('cx', String(alignedX!));
      vMarker.setAttribute('cy', String(currentPos.y));
      vMarker.setAttribute('r', '4');
      vMarker.setAttribute('fill', '#22c55e');
      vMarker.setAttribute('stroke', 'white');
      vMarker.setAttribute('stroke-width', '1');
      vMarker.setAttribute('class', 'alignment-marker-vertical');
      this.container.appendChild(vMarker);
    }
  }

  /**
   * 渲染矩形预览
   * @param p1 第一个角点
   * @param p2 对角点
   */
  renderRectanglePreview(p1: Point, p2: Point): void {
    if (!this.container) return;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(Math.min(p1.x, p2.x)));
    rect.setAttribute('y', String(Math.min(p1.y, p2.y)));
    rect.setAttribute('width', String(Math.abs(p2.x - p1.x)));
    rect.setAttribute('height', String(Math.abs(p2.y - p1.y)));
    rect.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('class', 'rectangle-preview');

    this.container.appendChild(rect);
  }

  /**
   * 设置容器
   */
  setContainer(svg: SVGSVGElement): void {
    this.container = svg.querySelector('.layer-overlay') as SVGGElement;
    if (!this.container) {
      this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.container.setAttribute('class', 'layer-overlay');
      svg.appendChild(this.container);
    }
    this.useNonScalingStroke = false;
  }

  /**
   * 设置容器（新API）
   */
  setContainerElement(container: SVGGElement | null): void {
    this.container = container;
  }

  /**
   * 渲染顶点标记
   * @param point 顶点位置
   * @param color 颜色
   * @param radius 半径
   */
  renderVertex(point: Point, color: string = '#3b82f6', radius: number = 4): void {
    if (!this.container) return;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '1');
    circle.setAttribute('class', 'vertex-marker');

    this.setNonScalingStroke(circle);
    this.container.appendChild(circle);
  }
}

/**
 * 创建叠加层渲染器
 */
export function createOverlayRenderer(svg: SVGSVGElement | null): OverlayRenderer {
  return new OverlayRenderer(svg);
}
