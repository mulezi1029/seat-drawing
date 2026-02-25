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
    const sectionBox = getBoundingBox(section.points);

    if (intersectMode) {
      // 相交模式：只要边界框相交就选中
      if (doBoundingBoxesIntersect(sectionBox, selectionBox)) {
        selectedIds.push(section.id);
      }
    } else {
      // 完全包含模式：需要整个元素在选择框内
      if (isBoundingBoxContained(sectionBox, selectionBox)) {
        selectedIds.push(section.id);
      }
    }
  }

  return selectedIds;
}
