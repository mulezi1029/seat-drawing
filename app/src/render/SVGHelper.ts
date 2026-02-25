/**
 * SVG 辅助工具类
 * 
 * 提供高性能的 SVG 元素创建和批量操作方法
 * 参考 seats.io 的渲染优化策略
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 创建 SVG 元素
 */
export function createSVGElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tagName);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
  }
  
  return element;
}

/**
 * 批量创建并插入 SVG 元素
 * 使用 DocumentFragment 提高性能
 */
export function batchAppend(
  parent: SVGElement,
  elements: SVGElement[]
): void {
  const fragment = document.createDocumentFragment();
  elements.forEach(element => fragment.appendChild(element));
  parent.appendChild(fragment);
}

/**
 * 创建圆形
 */
export function createCircle(
  cx: number,
  cy: number,
  r: number,
  attributes?: Record<string, string | number>
): SVGCircleElement {
  return createSVGElement('circle', {
    cx,
    cy,
    r,
    ...attributes,
  });
}

/**
 * 创建文本
 */
export function createText(
  x: number,
  y: number,
  content: string,
  attributes?: Record<string, string | number>
): SVGTextElement {
  const text = createSVGElement('text', {
    x,
    y,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    ...attributes,
  });
  text.textContent = content;
  return text;
}

/**
 * 创建矩形
 */
export function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
  attributes?: Record<string, string | number>
): SVGRectElement {
  return createSVGElement('rect', {
    x,
    y,
    width,
    height,
    ...attributes,
  });
}

/**
 * 创建路径
 */
export function createPath(
  d: string,
  attributes?: Record<string, string | number>
): SVGPathElement {
  return createSVGElement('path', {
    d,
    ...attributes,
  });
}

/**
 * 创建多边形
 */
export function createPolygon(
  points: Array<{ x: number; y: number }>,
  attributes?: Record<string, string | number>
): SVGPolygonElement {
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  return createSVGElement('polygon', {
    points: pointsStr,
    ...attributes,
  });
}

/**
 * 创建线段
 */
export function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  attributes?: Record<string, string | number>
): SVGLineElement {
  return createSVGElement('line', {
    x1,
    y1,
    x2,
    y2,
    ...attributes,
  });
}

/**
 * 创建分组
 */
export function createGroup(
  attributes?: Record<string, string | number>
): SVGGElement {
  return createSVGElement('g', attributes);
}

/**
 * 创建透明交互层 (参考 seats.io)
 * 
 * 用于扩大点击区域，不影响视觉效果
 */
export function createHitArea(
  cx: number,
  cy: number,
  r: number,
  cursor: string = 'pointer'
): SVGCircleElement {
  return createCircle(cx, cy, r, {
    fill: 'black',
    opacity: '0',
    cursor,
    'pointer-events': 'auto',
  });
}

/**
 * 创建矩形透明交互层
 */
export function createRectHitArea(
  x: number,
  y: number,
  width: number,
  height: number,
  cursor: string = 'pointer'
): SVGRectElement {
  return createRect(x, y, width, height, {
    fill: 'black',
    opacity: '0',
    cursor,
    'pointer-events': 'auto',
  });
}

/**
 * 设置 non-scaling-stroke
 * 
 * 使元素的 stroke 不受 transform scale 影响
 */
export function setNonScalingStroke(element: SVGElement): void {
  element.setAttribute('vector-effect', 'non-scaling-stroke');
}

/**
 * 批量设置 non-scaling-stroke
 */
export function setNonScalingStrokeBatch(elements: SVGElement[]): void {
  elements.forEach(element => setNonScalingStroke(element));
}

/**
 * 切换元素显示状态
 */
export function toggleDisplay(element: SVGElement, visible: boolean): void {
  element.style.display = visible ? 'block' : 'none';
}

/**
 * 批量切换元素显示状态
 */
export function toggleDisplayBatch(
  elements: SVGElement[],
  visible: boolean
): void {
  elements.forEach(element => toggleDisplay(element, visible));
}

/**
 * 清空元素内容
 */
export function clearElement(element: SVGElement): void {
  element.innerHTML = '';
}

/**
 * 更新 transform (使用 matrix 格式，参考 seats.io)
 * 
 * matrix(a, b, c, d, e, f) 对应:
 * - a: x 方向缩放
 * - b: y 方向倾斜
 * - c: x 方向倾斜
 * - d: y 方向缩放
 * - e: x 方向平移
 * - f: y 方向平移
 * 
 * translate(offsetX, offsetY) scale(scale) 等价于:
 * matrix(scale, 0, 0, scale, offsetX, offsetY)
 */
export function updateTransform(
  element: SVGElement,
  offsetX: number,
  offsetY: number,
  scale: number
): void {
  element.setAttribute(
    'transform',
    `matrix(${scale},0,0,${scale},${offsetX},${offsetY})`
  );
}

/**
 * 更新 transform (使用 translate + scale 格式)
 * 
 * 某些情况下可能需要使用这种格式（如调试）
 */
export function updateTransformLegacy(
  element: SVGElement,
  offsetX: number,
  offsetY: number,
  scale: number
): void {
  element.setAttribute(
    'transform',
    `translate(${offsetX}, ${offsetY}) scale(${scale})`
  );
}

/**
 * 计算两点之间的距离
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 判断点是否在圆形内
 */
export function isPointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  return distance(px, py, cx, cy) <= r;
}

/**
 * 判断点是否在矩形内
 */
export function isPointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

/**
 * 创建座位元素 (参考 seats.io 的多层结构)
 */
export interface SeatRenderOptions {
  x: number;
  y: number;
  radius: number;
  hitRadius: number;
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

export function createSeatElement(options: SeatRenderOptions): SVGGElement {
  const {
    x,
    y,
    radius,
    hitRadius,
    label,
    fill,
    stroke,
    strokeWidth,
    isSelected = false,
    isHovered = false,
  } = options;

  const group = createGroup({ class: 'seat' });

  // 1. 选中高亮 (粗边框)
  if (isSelected) {
    const highlight = createCircle(x, y, radius + 2, {
      fill: 'none',
      stroke: '#2563eb',
      'stroke-width': '4',
    });
    group.appendChild(highlight);
  }

  // 2. 座位主体
  const circle = createCircle(x, y, radius, {
    fill,
    stroke,
    'stroke-width': strokeWidth,
  });
  group.appendChild(circle);

  // 3. 标签
  const text = createText(x, y, label, {
    fill: 'white',
    'font-size': '7.5',
    'pointer-events': 'none',
  });
  group.appendChild(text);

  // 4. 透明交互层
  const hitArea = createHitArea(x, y, hitRadius);
  group.appendChild(hitArea);

  // 5. hover 状态层 (默认隐藏)
  const hoverLayer = createCircle(x, y, radius + 1, {
    fill: 'none',
    stroke: '#60a5fa',
    'stroke-width': '2',
  });
  hoverLayer.style.display = isHovered ? 'block' : 'none';
  group.appendChild(hoverLayer);

  return group;
}
