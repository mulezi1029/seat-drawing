/**
 * 选择工具相关工具函数
 *
 * 包含点包含检测、框选检测等核心算法
 */

import type { Point, BoundingBox, Section } from '@/types';

/**
 * 射线法判断点是否在多边形内
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 计算多边形的边界框
 */
export function getBoundingBox(points: Point[]): BoundingBox {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * 判断两个边界框是否相交（用于框选）
 */
export function doBoundingBoxesIntersect(
  box1: BoundingBox,
  box2: BoundingBox
): boolean {
  return !(box1.maxX < box2.minX ||
           box1.minX > box2.maxX ||
           box1.maxY < box2.minY ||
           box1.minY > box2.maxY);
}

/**
 * 判断边界框是否完全包含在选择框内（严格框选模式）
 */
export function isBoundingBoxContained(
  box: BoundingBox,
  selectionBox: BoundingBox
): boolean {
  return box.minX >= selectionBox.minX &&
         box.maxX <= selectionBox.maxX &&
         box.minY >= selectionBox.minY &&
         box.maxY <= selectionBox.maxY;
}

/**
 * 从两个点创建选择框
 */
export function createSelectionBox(start: Point, end: Point): BoundingBox {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxY: Math.max(start.y, end.y),
  };
}

/**
 * 查找指定位置的元素（点选）
 * 返回元素 ID 或 null
 */
export function findElementAtPoint(point: Point, sections: Section[]): string | null {
  // 倒序遍历，优先选中上层的元素
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    if (isPointInPolygon(point, section.points)) {
      return section.id;
    }
  }
  return null;
}

/**
 * 判断点是否在边界框内
 */
export function isPointInBox(point: Point, box: BoundingBox): boolean {
  return (
    point.x >= box.minX &&
    point.x <= box.maxX &&
    point.y >= box.minY &&
    point.y <= box.maxY
  );
}

/**
 * 计算叉积 (p2 - p1) × (p3 - p1)
 */
function crossProduct(p1: Point, p2: Point, p3: Point): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

/**
 * 判断点是否在线段上
 */
export function isPointOnSegment(p: Point, s1: Point, s2: Point): boolean {
  return (
    p.x >= Math.min(s1.x, s2.x) &&
    p.x <= Math.max(s1.x, s2.x) &&
    p.y >= Math.min(s1.y, s2.y) &&
    p.y <= Math.max(s1.y, s2.y) &&
    crossProduct(s1, s2, p) === 0
  );
}

/**
 * 判断两条线段是否相交
 */
export function doLineSegmentsIntersect(
  a1: Point, a2: Point,
  b1: Point, b2: Point
): boolean {
  const d1 = crossProduct(b1, b2, a1);
  const d2 = crossProduct(b1, b2, a2);
  const d3 = crossProduct(a1, a2, b1);
  const d4 = crossProduct(a1, a2, b2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && isPointOnSegment(a1, b1, b2)) return true;
  if (d2 === 0 && isPointOnSegment(a2, b1, b2)) return true;
  if (d3 === 0 && isPointOnSegment(b1, a1, a2)) return true;
  if (d4 === 0 && isPointOnSegment(b2, a1, a2)) return true;

  return false;
}

/**
 * 判断多边形是否与边界框相交（精确检测）
 * 用于框选时的精确多边形检测
 */
export function doesPolygonIntersectBox(polygon: Point[], box: BoundingBox): boolean {
  // 1. 快速排除：如果多边形边界框与选择框不相交，直接返回 false
  const polyBox = getBoundingBox(polygon);
  if (!doBoundingBoxesIntersect(polyBox, box)) {
    return false;
  }

  // 2. 检查多边形是否有顶点在选择框内
  for (const point of polygon) {
    if (isPointInBox(point, box)) {
      return true;
    }
  }

  // 3. 检查选择框的顶点是否在多边形内
  const boxCorners: Point[] = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
  ];
  for (const corner of boxCorners) {
    if (isPointInPolygon(corner, polygon)) {
      return true;
    }
  }

  // 4. 检查多边形的边是否与选择框的边相交
  const boxEdges: Array<[Point, Point]> = [
    [{ x: box.minX, y: box.minY }, { x: box.maxX, y: box.minY }],
    [{ x: box.maxX, y: box.minY }, { x: box.maxX, y: box.maxY }],
    [{ x: box.maxX, y: box.maxY }, { x: box.minX, y: box.maxY }],
    [{ x: box.minX, y: box.maxY }, { x: box.minX, y: box.minY }],
  ];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    for (const [b1, b2] of boxEdges) {
      if (doLineSegmentsIntersect(p1, p2, b1, b2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 查找选择框内的所有元素
 * @param selectionBox 选择框
 * @param sections 所有区域
 * @param intersectMode 是否使用相交模式（false 表示完全包含模式）
 */
export function findElementsInBox(
  selectionBox: BoundingBox,
  sections: Section[],
  intersectMode: boolean = true
): string[] {
  const selectedIds: string[] = [];

  for (const section of sections) {
    if (intersectMode) {
      // 相交模式：使用精确多边形检测
      if (doesPolygonIntersectBox(section.points, selectionBox)) {
        selectedIds.push(section.id);
      }
    } else {
      // 完全包含模式：需要整个元素在选择框内
      // 检查多边形所有顶点是否都在选择框内
      const allPointsInBox = section.points.every(point =>
        isPointInBox(point, selectionBox)
      );
      if (allPointsInBox) {
        selectedIds.push(section.id);
      }
    }
  }

  return selectedIds;
}
