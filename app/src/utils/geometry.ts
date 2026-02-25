/**
 * Geometry - 几何计算工具库
 *
 * 提供常用的几何计算函数，用于：
 * - 点、线、多边形相关的计算
 * - 碰撞检测（hit testing）
 * - 网格吸附
 * - 边界框计算
 */

import type { Point, BoundingBox } from '@/types';

/**
 * 几何工具命名空间
 */
export const Geometry = {
  /**
   * 计算两点之间的距离
   * @param p1 第一个点
   * @param p2 第二个点
   * @returns 距离
   */
  distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * 计算两点之间的平方距离（避免开方，性能更好）
   * @param p1 第一个点
   * @param p2 第二个点
   * @returns 平方距离
   */
  distanceSquared(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  },

  /**
   * 计算点到线段的最短距离
   * @param point 点
   * @param lineStart 线段起点
   * @param lineEnd 线段终点
   * @returns 最短距离
   */
  pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * 计算点在线段上的投影点
   * @param point 点
   * @param lineStart 线段起点
   * @param lineEnd 线段终点
   * @returns 投影点坐标
   */
  projectPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return { ...lineStart };
    }

    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));

    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };
  },

  /**
   * 判断点是否在多边形内（射线法）
   * @param point 点
   * @param polygon 多边形顶点数组
   * @returns 是否在多边形内
   */
  pointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    let j = polygon.length - 1;

    for (let i = 0; i < polygon.length; i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
      j = i;
    }

    return inside;
  },

  /**
   * 判断点是否在三角形内（重心坐标法）
   * @param point 点
   * @param a 三角形顶点A
   * @param b 三角形顶点B
   * @param c 三角形顶点C
   * @returns 是否在三角形内
   */
  pointInTriangle(point: Point, a: Point, b: Point, c: Point): boolean {
    const denom = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);

    if (Math.abs(denom) < 1e-10) return false;

    const w1 = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denom;
    const w2 = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denom;
    const w3 = 1 - w1 - w2;

    return w1 >= 0 && w2 >= 0 && w3 >= 0;
  },

  /**
   * 判断点是否在线段上
   * @param point 点
   * @param lineStart 线段起点
   * @param lineEnd 线段终点
   * @param threshold 阈值（像素）
   * @returns 是否在线段上
   */
  pointOnLineSegment(point: Point, lineStart: Point, lineEnd: Point, threshold: number = 1): boolean {
    const dist = this.pointToLineDistance(point, lineStart, lineEnd);
    return dist <= threshold;
  },

  /**
   * 吸附点到网格
   * @param point 原始点
   * @param gridSize 网格大小
   * @returns 吸附后的点
   */
  snapToGrid(point: Point, gridSize: number): Point {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  },

  /**
   * 计算点集的边界框
   * @param points 点数组
   * @returns 边界框
   */
  getBoundingBox(points: Point[]): BoundingBox {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY };
  },

  /**
   * 计算边界框的中心点
   * @param box 边界框
   * @returns 中心点
   */
  getBoundingBoxCenter(box: BoundingBox): Point {
    return {
      x: (box.minX + box.maxX) / 2,
      y: (box.minY + box.maxY) / 2,
    };
  },

  /**
   * 计算边界框的尺寸
   * @param box 边界框
   * @returns 宽度和高度
   */
  getBoundingBoxSize(box: BoundingBox): { width: number; height: number } {
    return {
      width: box.maxX - box.minX,
      height: box.maxY - box.minY,
    };
  },

  /**
   * 扩展边界框
   * @param box 原始边界框
   * @param padding 扩展量
   * @returns 扩展后的边界框
   */
  expandBoundingBox(box: BoundingBox, padding: number): BoundingBox {
    return {
      minX: box.minX - padding,
      minY: box.minY - padding,
      maxX: box.maxX + padding,
      maxY: box.maxY + padding,
    };
  },

  /**
   * 检查两个边界框是否相交
   * @param a 边界框A
   * @param b 边界框B
   * @returns 是否相交
   */
  boundingBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  },

  /**
   * 检查点是否在边界框内
   * @param point 点
   * @param box 边界框
   * @returns 是否在边界框内
   */
  pointInBoundingBox(point: Point, box: BoundingBox): boolean {
    return point.x >= box.minX && point.x <= box.maxX &&
           point.y >= box.minY && point.y <= box.maxY;
  },

  /**
   * 计算两个点的中点
   * @param p1 第一个点
   * @param p2 第二个点
   * @returns 中点
   */
  midpoint(p1: Point, p2: Point): Point {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  },

  /**
   * 计算多边形面积（鞋带公式）
   * @param polygon 多边形顶点
   * @returns 面积（正值表示顺时针，负值表示逆时针）
   */
  polygonArea(polygon: Point[]): number {
    if (polygon.length < 3) return 0;

    let area = 0;
    let j = polygon.length - 1;

    for (let i = 0; i < polygon.length; i++) {
      area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y);
      j = i;
    }

    return area / 2;
  },

  /**
   * 检查多边形是否顺时针排列
   * @param polygon 多边形顶点
   * @returns 是否顺时针
   */
  isClockwise(polygon: Point[]): boolean {
    return this.polygonArea(polygon) > 0;
  },

  /**
   * 计算点到最近点的距离
   * @param point 参考点
   * @param candidates 候选点数组
   * @returns 最近点和距离
   */
  findNearestPoint(point: Point, candidates: Point[]): { point: Point; distance: number; index: number } | null {
    if (candidates.length === 0) return null;

    let nearest = candidates[0];
    let minDist = this.distance(point, nearest);
    let index = 0;

    for (let i = 1; i < candidates.length; i++) {
      const dist = this.distance(point, candidates[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = candidates[i];
        index = i;
      }
    }

    return { point: nearest, distance: minDist, index };
  },

  /**
   * 检查点集是否共线
   * @param points 点数组
   * @param tolerance 容差
   * @returns 是否共线
   */
  arePointsCollinear(points: Point[], tolerance: number = 1e-10): boolean {
    if (points.length < 3) return true;

    const p1 = points[0];
    const p2 = points[1];

    for (let i = 2; i < points.length; i++) {
      const p3 = points[i];
      const crossProduct = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
      if (Math.abs(crossProduct) > tolerance) {
        return false;
      }
    }

    return true;
  },

  /**
   * 计算三个点的夹角（弧度）
   * @param a 顶点
   * @param b 边点1
   * @param c 边点2
   * @returns 夹角（0到π）
   */
  angle(a: Point, b: Point, c: Point): number {
    const ba = { x: b.x - a.x, y: b.y - a.y };
    const ca = { x: c.x - a.x, y: c.y - a.y };

    const dot = ba.x * ca.x + ba.y * ca.y;
    const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const magCA = Math.sqrt(ca.x * ca.x + ca.y * ca.y);

    if (magBA === 0 || magCA === 0) return 0;

    return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magCA))));
  },

  /**
   * 角度转弧度
   * @param degrees 角度
   * @returns 弧度
   */
  toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  },

  /**
   * 弧度转角度
   * @param radians 弧度
   * @returns 角度
   */
  toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  },

  /**
   * 旋转点
   * @param point 原始点
   * @param center 旋转中心
   * @param angle 旋转角度（弧度）
   * @returns 旋转后的点
   */
  rotatePoint(point: Point, center: Point, angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  },

  /**
   * 缩放点
   * @param point 原始点
   * @param center 缩放中心
   * @param scale 缩放比例
   * @returns 缩放后的点
   */
  scalePoint(point: Point, center: Point, scale: number): Point {
    return {
      x: center.x + (point.x - center.x) * scale,
      y: center.y + (point.y - center.y) * scale,
    };
  },

  /**
   * 平移点
   * @param point 原始点
   * @param deltaX X方向偏移
   * @param deltaY Y方向偏移
   * @returns 平移后的点
   */
  translatePoint(point: Point, deltaX: number, deltaY: number): Point {
    return {
      x: point.x + deltaX,
      y: point.y + deltaY,
    };
  },

  /**
   * 计算两点之间的线性插值
   * @param p1 起点
   * @param p2 终点
   * @param t 插值因子 (0-1)
   * @returns 插值点
   */
  lerp(p1: Point, p2: Point, t: number): Point {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };
  },

  /**
   * 检测座位是否与现有座位重叠
   * @param newPoint 新座位位置
   * @param existingPoints 现有座位位置数组（包含ID）
   * @param minDistance 最小间距（默认座位直径）
   * @returns 重叠检测结果
   */
  checkSeatOverlap(
    newPoint: Point,
    existingPoints: Array<{ id: string; x: number; y: number }>,
    minDistance: number = 20
  ): {
    hasOverlap: boolean;
    overlappingSeatIds: string[];
    closestDistance: number;
  } {
    const overlappingSeatIds: string[] = [];
    let closestDistance = Infinity;

    for (const existing of existingPoints) {
      const distance = this.distance(newPoint, existing);

      if (distance < closestDistance) {
        closestDistance = distance;
      }

      if (distance < minDistance) {
        overlappingSeatIds.push(existing.id);
      }
    }

    return {
      hasOverlap: overlappingSeatIds.length > 0,
      overlappingSeatIds,
      closestDistance,
    };
  },

  /**
   * 批量检测多个座位位置是否有重叠
   * @param newPoints 新座位位置数组（包含临时ID）
   * @param existingPoints 现有座位位置数组
   * @param minDistance 最小间距
   * @returns 有重叠的新座位临时ID列表
   */
  checkBatchSeatOverlap(
    newPoints: Array<{ tempId: string; x: number; y: number }>,
    existingPoints: Array<{ id: string; x: number; y: number }>,
    minDistance: number = 20
  ): string[] {
    const overlappingIds: string[] = [];

    for (const newPoint of newPoints) {
      // 检查与现有座位的重叠
      for (const existing of existingPoints) {
        if (this.distance(newPoint, existing) < minDistance) {
          overlappingIds.push(newPoint.tempId);
          break;
        }
      }

      // 检查新座位之间的重叠
      if (!overlappingIds.includes(newPoint.tempId)) {
        for (const otherPoint of newPoints) {
          if (otherPoint.tempId !== newPoint.tempId && this.distance(newPoint, otherPoint) < minDistance) {
            overlappingIds.push(newPoint.tempId);
            break;
          }
        }
      }
    }

    return overlappingIds;
  },

  /**
   * 查找在指定半径内的所有座位
   * @param center 中心点
   * @param radius 搜索半径
   * @param seats 座位数组
   * @returns 在半径内的座位ID列表
   */
  findSeatsInRadius(
    center: Point,
    radius: number,
    seats: Array<{ id: string; x: number; y: number }>
  ): string[] {
    return seats
      .filter(seat => this.distance(center, seat) <= radius)
      .map(seat => seat.id);
  },
};

/**
 * 默认导出
 */
export default Geometry;
