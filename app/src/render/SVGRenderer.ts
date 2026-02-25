/**
 * SVGRenderer - seats.io 风格扁平 SVG 架构
 *
 * 架构:
 * <svg>
 *   <g id="viewport" transform="matrix(...)">  <!-- 唯一 transform -->
 *     <!-- 背景图片 -->
 *     <image class="bg-image" ...>
 *     <!-- Section 多边形 -->
 *     <polygon class="section" data-id="..." ...>
 *     <!-- Seat 组 (不使用 transform) -->
 *     <g class="seat" data-id="...">
 *       <circle ...>  <!-- 座位主体 -->
 *       <text ...>    <!-- 标签 -->
 *       <circle class="hit-area" ...>  <!-- 透明交互层 -->
 *     </g>
 *     <!-- Overlay 元素 (使用 vector-effect="non-scaling-stroke") -->
 *     <polygon class="overlay" vector-effect="non-scaling-stroke" ...>
 *   </g>
 * </svg>
 *
 * 核心原则 (seats.io 风格):
 * - 只有一个 viewport g，做唯一 transform
 * - 没有嵌套的分组 layer，所有元素扁平化
 * - section/seat 不使用 transform，直接用 world 坐标
 * - overlay 使用 vector-effect="non-scaling-stroke" 保持线宽
 * - 使用 data-id 属性标识元素，而不是嵌套分组
 */

import type { Renderer, RenderOptions } from './Renderer';
import type { SceneGraph } from '@/scene/SceneGraph';
import type { ViewportState, Point, ViewConfig, Category, Seat, SectionCanvas } from '@/types';
import { CANVAS_CONFIG } from '@/types';
import { OverlayRenderer } from './OverlayRenderer';
import {
  createSVGElement,
  createCircle,
  createText,
  createPolygon,
  createGroup,
  createHitArea,
  createLine,
  clearElement,
  updateTransform,
  batchAppend,
} from './SVGHelper';

/**
 * 渲染上下文 - 包含交互状态用于绘制 overlay
 */
export interface RenderContext {
  selectedSeatIds: string[];
  selectedSectionId: string | null;
  drawingPoints: Point[];
  mousePos: Point;
  mode: string;
  seatTool: string;
  isAltPressed: boolean;
  dragStart: Point | null;
  dragCurrent: Point | null;
  rowStartPoint: Point | null;
  linePoints?: Point[];
  hoveredDrawingPointIndex: number | null;
  seatRadius: number;
  seatSpacing: number;
  viewConfig?: ViewConfig;
  categories?: Category[];
  sectionCanvas?: SectionCanvas | null;
}

/**
 * SVG 渲染器配置
 */
export interface SVGRendererConfig {
  /** SVG 元素 (已存在的 JSX SVG) */
  svg: SVGSVGElement;
  /** 渲染选项 */
  options: RenderOptions;
  /** 背景图片 URL */
  backgroundImageUrl?: string;
}

/**
 * SVG 渲染器 - seats.io 风格扁平结构
 */
export class SVGRenderer implements Renderer {
  private svg: SVGSVGElement;
  private options: RenderOptions;
  private backgroundImageUrl: string | null = null;

  // 只有一个 viewport 组
  private viewport: SVGGElement | null = null;

  // 缓存场景数据用于 overlay 渲染
  private currentScene: SceneGraph | null = null;

  // 叠加层渲染器
  private overlayRenderer: OverlayRenderer | null = null;

  constructor(config: SVGRendererConfig) {
    this.svg = config.svg;
    this.options = config.options;
    this.backgroundImageUrl = config.backgroundImageUrl ?? null;
    this.initViewport();
  }

  /**
   * 初始化 viewport - seats.io 风格：只有一个 transform 根节点
   */
  private initViewport(): void {
    clearElement(this.svg);

    // 创建 viewport 组 - 唯一有 transform 的元素
    this.viewport = createGroup({ id: 'viewport' });
    this.svg.appendChild(this.viewport);

    // 创建 overlay 容器（在 viewport 内部，跟随变换）
    const overlayContainer = createGroup({ class: 'overlay-container' });
    overlayContainer.style.pointerEvents = 'none';
    this.viewport.appendChild(overlayContainer);

    // 初始化叠加层渲染器（使用 viewport 内的容器）
    this.overlayRenderer = new OverlayRenderer({
      container: overlayContainer,
      useNonScalingStroke: true,
    });
  }

  /**
   * 更新视口变换（高频调用，只更新 overlay）
   * Overflow Scroll 架构：缩放和平移通过 CSS transform 和 scroll 实现
   * 这里只更新 overlay 渲染
   */
  updateViewport(_viewport: ViewportState, context?: RenderContext): void {
    // 更新 overlay（需要随鼠标移动实时更新）
    if (context && this.currentScene) {
      this.renderOverlayOnly(context, _viewport);
    }
  }

  /**
   * 渲染网格 - Overflow Scroll 架构
   */
  private renderGrid(viewConfig: ViewConfig | undefined, viewport: ViewportState): SVGGElement | null {
    if (!viewConfig?.showGrid || !this.viewport) return null;

    const gridSize = viewConfig.gridSize;
    const gridColor = viewConfig.gridColor || '#e2e8f0';
    const WORLD_SIZE = CANVAS_CONFIG.WORLD_SIZE;
    const WORLD_CENTER = WORLD_SIZE / 2;

    // 在 overflow scroll 架构下，计算可见区域的世界坐标
    // scrollLeft/scrollTop 是当前滚动位置
    const scrollLeft = viewport.offsetX;
    const scrollTop = viewport.offsetY;
    const { scale } = viewport;

    // 获取容器尺寸
    const containerRect = this.svg.getBoundingClientRect();
    const containerWidth = containerRect.width / scale; // 考虑缩放后的实际可见宽度
    const containerHeight = containerRect.height / scale;

    // 计算可见区域的世界坐标范围（考虑缩放）
    const visibleMinX = (scrollLeft - WORLD_CENTER) / scale;
    const visibleMinY = (scrollTop - WORLD_CENTER) / scale;
    const visibleMaxX = visibleMinX + containerWidth;
    const visibleMaxY = visibleMinY + containerHeight;

    // 扩展一些边距
    const margin = gridSize * 2;
    const startX = Math.floor((visibleMinX - margin) / gridSize) * gridSize;
    const startY = Math.floor((visibleMinY - margin) / gridSize) * gridSize;
    const endX = Math.ceil((visibleMaxX + margin) / gridSize) * gridSize;
    const endY = Math.ceil((visibleMaxY + margin) / gridSize) * gridSize;

    const gridGroup = createGroup({ class: 'grid-layer' });
    gridGroup.style.pointerEvents = 'none';

    // 创建垂直线
    for (let x = startX; x <= endX; x += gridSize) {
      const line = createLine(x, startY, x, endY, {
        stroke: gridColor,
        'stroke-width': String(1 / scale), // 线宽随缩放调整，保持视觉一致
        opacity: '0.5',
      });
      gridGroup.appendChild(line);
    }

    // 创建水平线
    for (let y = startY; y <= endY; y += gridSize) {
      const line = createLine(startX, y, endX, y, {
        stroke: gridColor,
        'stroke-width': String(1 / scale),
        opacity: '0.5',
      });
      gridGroup.appendChild(line);
    }

    return gridGroup;
  }

  /**
   * 渲染场景（数据变化时调用，低频）
   * seats.io 风格：全量渲染，但只在数据变化时调用
   */
  render(scene: SceneGraph, viewport: ViewportState, context?: RenderContext): void {
    this.currentScene = scene;

    // 清空 viewport
    if (this.viewport) {
      clearElement(this.viewport);
    }

    // 重新创建 overlay 容器（因为 clearElement 删除了它）
    const overlayContainer = createGroup({ class: 'overlay-container' });
    overlayContainer.style.pointerEvents = 'none';
    this.viewport?.appendChild(overlayContainer);

    // 更新叠加层渲染器的容器引用
    this.overlayRenderer?.setContainerElement(overlayContainer);

    // 更新 overlay（在 overflow scroll 架构下，不更新 viewport transform）
    if (context) {
      this.renderOverlayOnly(context, viewport);
    }

    // 收集所有元素
    const elements: SVGElement[] = [];

    // 0. 背景图片 - 最先渲染，在最底层
    // 注意：背景图在 render 中创建，这样当 viewport 被 clear 时会被正确处理
    if (this.backgroundImageUrl) {
      const imageWidth = CANVAS_CONFIG.IMAGE_WIDTH;
      const imageHeight = CANVAS_CONFIG.IMAGE_HEIGHT ?? imageWidth;
      const image = createSVGElement('image', {
        class: 'bg-image',
        x: String(CANVAS_CONFIG.WORLD_SIZE/2),
        y: String(CANVAS_CONFIG.WORLD_SIZE/2),
        width: String(imageWidth),
        height: String(imageHeight),
        preserveAspectRatio: 'xMidYMid meet',
        opacity: '0.8',
        href: this.backgroundImageUrl,
      });
      image.style.pointerEvents = 'none';
      elements.push(image);
    }

    // 1. 网格层（在背景图之后）
    const gridLayer = this.renderGrid(context?.viewConfig, viewport);
    if (gridLayer) {
      elements.push(gridLayer);
    }

    // 2. Sections - 扁平化渲染，直接添加到 viewport
    const sections = scene.getAllSections();
    for (const section of sections) {
      const polygon = createPolygon(section.points, {
        class: 'section',
        'data-id': section.id,
        'data-type': 'section',
        fill: section.color,
        'fill-opacity': String(section.opacity),
        stroke: section.color,
        'stroke-width': '2',
        'stroke-linejoin': 'round',
      });
      elements.push(polygon);
    }

    // 3. Seats - 扁平化渲染，每个 seat 是一个 g，但直接放在 viewport 下
    // 只在 draw-seat 模式下显示当前选中 section 的座位
    const isDrawSeatMode = context?.mode === 'draw-seat';
    const selectedSectionId = context?.selectedSectionId;

    let seatsToRender: Seat[] = [];
    if (isDrawSeatMode && selectedSectionId) {
      // 只获取当前选中 section 的座位
      seatsToRender = scene.getSeatsInSection(selectedSectionId);
    }
    // 注意：在 view 模式下不显示任何座位

    const seatRadius = 10;
    const hitAreaRadius = 15;

    // Build category color map for quick lookup
    const categoryColorMap = new Map<string, string>();
    if (context?.categories) {
      for (const cat of context.categories) {
        categoryColorMap.set(cat.id, cat.color);
      }
    }

    for (const seat of seatsToRender) {
      // seat 组 - 包含 circle, text, hit-area
      // 使用反缩放保持座位大小不随缩放变化
      const seatGroup = createGroup({
        class: 'seat',
        'data-id': seat.id,
        'data-section-id': seat.sectionId,
        'data-type': 'seat',
        // 反缩放：座位大小保持固定，不随视口缩放变化
        transform: `translate(${seat.x}, ${seat.y}) scale(${1 / viewport.scale}) translate(${-seat.x}, ${-seat.y})`,
      });

      // Determine seat color: category color > seat color > default
      const seatColor = seat.categoryId && categoryColorMap.has(seat.categoryId)
        ? categoryColorMap.get(seat.categoryId)!
        : (seat.color || '#3b82f6');

      // 检查是否选中
      const isSelected = context?.selectedSeatIds.includes(seat.id);

      // 如果选中，添加高亮圆圈
      if (isSelected) {
        const highlightCircle = createCircle(seat.x, seat.y, seatRadius + 3, {
          class: 'seat-highlight',
          fill: 'none',
          stroke: '#f59e0b', // 橙色高亮
          'stroke-width': '3',
          'vector-effect': 'non-scaling-stroke',
        });
        seatGroup.appendChild(highlightCircle);
      }

      // 座位主体圆形
      const circle = createCircle(seat.x, seat.y, seatRadius, {
        class: 'seat-circle',
        fill: seatColor,
        stroke: isSelected ? '#f59e0b' : 'white', // 选中时边框也变橙色
        'stroke-width': isSelected ? '3' : '2',
        'vector-effect': 'non-scaling-stroke',
      });

      // 标签文本
      const text = createText(seat.x, seat.y, `${seat.row}${seat.number}`, {
        class: 'seat-label',
        fill: 'white',
        'font-size': '7.5',
        'pointer-events': 'none',
      });

      // 透明交互层
      const hitArea = createHitArea(seat.x, seat.y, hitAreaRadius);
      hitArea.setAttribute('class', 'seat-hit-area');

      seatGroup.appendChild(circle);
      seatGroup.appendChild(text);
      seatGroup.appendChild(hitArea);
      elements.push(seatGroup);
    }

    // 批量插入主要元素（在 overlay 容器之前）
    if (this.viewport) {
      // 找到 overlay 容器（如果存在）
      const overlayContainer = this.viewport.querySelector('.overlay-container');
      if (overlayContainer) {
        // 在 overlay 容器之前插入所有元素
        for (const el of elements) {
          this.viewport.insertBefore(el, overlayContainer);
        }
      } else {
        // 没有 overlay 容器，直接追加
        batchAppend(this.viewport, elements);
      }
    }

    // 渲染 overlay（使用 OverlayRenderer）
    if (context) {
      this.renderOverlayOnly(context, viewport);
    }
  }

  /**
   * 仅渲染 overlay（高频更新）
   * 用于绘制预览、选中框等临时元素
   */
  private renderOverlayOnly(context: RenderContext, _viewport: ViewportState): void {
    if (!this.overlayRenderer) return;

    // 清空 overlay
    this.overlayRenderer.clear();

    // 绘制区域预览
    if (context.mode === 'draw-section' && context.drawingPoints.length > 0) {
      // 使用 OverlayRenderer 渲染绘制预览
      this.overlayRenderer.renderDrawingPreview(context.drawingPoints, context.mousePos);
    }

    // 渲染 Section 选中框 (在 view 模式下，当有选中的 section 时)
    if (context.mode === 'view' && context.selectedSectionId && this.currentScene) {
      const section = this.currentScene.getSection(context.selectedSectionId);
      if (section && section.points.length > 0) {
        // 计算 Section 的边界框
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const point of section.points) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
        // 添加一些内边距
        const padding = 10;
        this.overlayRenderer.renderSelectionBox(
          { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding },
          '#3b82f6', // 蓝色选中框
          false // 选中框：无填充，虚线，显示控制点
        );
      }
    }

    // 框选框
    if (context.seatTool === 'select' && context.dragStart && context.dragCurrent && context.mode === 'draw-seat') {
      const { dragStart, dragCurrent, isAltPressed } = context;
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);

      this.overlayRenderer.renderSelectionBox(
        { minX: x, minY: y, maxX: x + width, maxY: y + height },
        isAltPressed ? '#8b5cf6' : '#3b82f6',
        true // 框选：有填充，实线，不显示控制点
      );
    }

    // 行工具预览
    if (context.mode === 'draw-seat' && context.seatTool === 'row' && context.rowStartPoint) {
      const rowStartPoint = context.rowStartPoint;
      const mousePos = context.mousePos;

      // 使用测量线渲染预览线
      this.overlayRenderer.renderMeasurementLine(rowStartPoint, mousePos);

      // 计算座位位置和数量
      const dx = mousePos.x - rowStartPoint.x;
      const dy = mousePos.y - rowStartPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const spacing = context.seatSpacing;

      if (distance > spacing / 2) {
        const numSeats = Math.floor(distance / spacing) + 1;
        const angle = Math.atan2(dy, dx);

        // 渲染预览座位位置
        for (let i = 0; i < numSeats; i++) {
          const x = rowStartPoint.x + Math.cos(angle) * spacing * i;
          const y = rowStartPoint.y + Math.sin(angle) * spacing * i;

          // 渲染预览圆圈
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(x));
          circle.setAttribute('cy', String(y));
          circle.setAttribute('r', String(context.seatRadius));
          circle.setAttribute('fill', 'rgba(59, 130, 246, 0.3)');
          circle.setAttribute('stroke', '#3b82f6');
          circle.setAttribute('stroke-width', '2');
          circle.setAttribute('class', 'row-seat-preview');
          circle.setAttribute('vector-effect', 'non-scaling-stroke');

          this.overlayRenderer.container?.appendChild(circle);
        }
      }
    }

    // 线工具预览
    if (context.mode === 'draw-seat' && context.seatTool === 'line' && context.linePoints && context.linePoints.length > 0) {
      const points = context.linePoints;
      const mousePos = context.mousePos;

      if (this.overlayRenderer) {
        // 绘制已有点之间的线
        for (let i = 0; i < points.length - 1; i++) {
          this.overlayRenderer.renderMeasurementLine(points[i], points[i + 1]);
        }

        // 绘制最后一个点到鼠标的预览线
        this.overlayRenderer.renderMeasurementLine(points[points.length - 1], mousePos);

        // 绘制已有点的标记
        points.forEach((point, index) => {
          const color = index === 0 ? '#10b981' : '#3b82f6'; // 第一个点绿色，其他蓝色
          this.overlayRenderer!.renderVertex(point, color, index === 0 ? 6 : 4);
        });

        // 计算并显示座位位置预览
        const spacing = context.seatSpacing;
        const previewPoints: Point[] = [];

        // 计算已有点之间的座位位置
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const segmentSeatCount = Math.max(1, Math.floor(distance / spacing));

          for (let j = 0; j < segmentSeatCount; j++) {
            const t = segmentSeatCount > 1 ? j / (segmentSeatCount - 1) : 0;
            previewPoints.push({
              x: start.x + dx * t,
              y: start.y + dy * t,
            });
          }
        }

        // 计算最后一个点到鼠标的座位位置预览
        const lastPoint = points[points.length - 1];
        const dx = mousePos.x - lastPoint.x;
        const dy = mousePos.y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const segmentSeatCount = Math.max(1, Math.floor(distance / spacing));

        for (let j = 0; j < segmentSeatCount; j++) {
          const t = segmentSeatCount > 1 ? j / (segmentSeatCount - 1) : 0;
          previewPoints.push({
            x: lastPoint.x + dx * t,
            y: lastPoint.y + dy * t,
          });
        }

        // 渲染预览座位
        previewPoints.forEach(pos => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(pos.x));
          circle.setAttribute('cy', String(pos.y));
          circle.setAttribute('r', String(context.seatRadius));
          circle.setAttribute('fill', 'rgba(59, 130, 246, 0.3)');
          circle.setAttribute('stroke', '#3b82f6');
          circle.setAttribute('stroke-width', '2');
          circle.setAttribute('class', 'line-seat-preview');
          circle.setAttribute('vector-effect', 'non-scaling-stroke');

          this.overlayRenderer!.container?.appendChild(circle);
        });
      }
    }
  }

  /**
   * 更新渲染选项
   */
  updateOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 设置背景图片 URL
   * 用于外部更新背景图地址，配合 render() 方法使用
   * @param url - 背景图片 URL
   */
  setBackgroundImageUrl(url: string | null): void {
    this.backgroundImageUrl = url;
  }

  /**
   * 更新背景图片
   * 直接操作 DOM，不触发完整重新渲染
   * @param url - 背景图片 URL
   * @param sectionCanvas - Section 画布状态，用于校准背景图位置
   */
  updateBackgroundImage(url: string | null, sectionCanvas?: SectionCanvas | null): void {
    this.backgroundImageUrl = url;

    if (!this.viewport) return;

    // 查找现有的背景图片元素
    const existingImage = this.viewport.querySelector('.bg-image') as SVGImageElement;

    if (url) {
      const imageWidth = CANVAS_CONFIG.IMAGE_WIDTH;
      const imageHeight = CANVAS_CONFIG.IMAGE_HEIGHT ?? imageWidth;

      // 计算背景图偏移量（根据 sectionCanvas 校准）
      const offsetX = sectionCanvas?.backgroundOffset.x ?? 0;
      const offsetY = sectionCanvas?.backgroundOffset.y ?? 0;

      if (existingImage) {
        // 更新现有图片的 href 和位置
        existingImage.setAttribute('href', url);
        existingImage.setAttribute('x', String(-imageWidth / 2 - offsetX));
        existingImage.setAttribute('y', String(-imageHeight / 2 - offsetY));
      } else {
        // 创建新图片元素并插入到 viewport 的第一个位置
        const image = createSVGElement('image', {
          class: 'bg-image',
          x: String(-imageWidth / 2 - offsetX),
          y: String(-imageHeight / 2 - offsetY),
          width: String(imageWidth),
          height: String(imageHeight),
          preserveAspectRatio: 'xMidYMid meet',
          opacity: '0.8',
          href: url,
        });
        image.style.pointerEvents = 'none';

        // 插入到 viewport 的第一个子元素（在所有内容之前）
        if (this.viewport.firstChild) {
          this.viewport.insertBefore(image, this.viewport.firstChild);
        } else {
          this.viewport.appendChild(image);
        }
      }
    } else {
      // 删除现有图片
      if (existingImage) {
        existingImage.remove();
      }
    }
  }

  /**
   * 设置渲染容器 (SVGRenderer 直接使用 SVG 元素，此方法为空实现)
   */
  setContainer(_container: HTMLElement): void {
    // SVGRenderer 通过构造函数接收 SVG 元素，此方法仅用于满足接口
  }

  /**
   * 调整渲染器大小 (SVG 自动适应容器，此方法为空实现)
   */
  resize(_width: number, _height: number): void {
    // SVG 使用 width="100%" height="100%" 自动适应，无需手动调整
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.viewport = null;
    this.currentScene = null;
  }
}
