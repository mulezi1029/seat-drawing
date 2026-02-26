/**
 * 坐标工具函数
 *
 * 提供画布交互所需的几何计算能力：
 *
 * 1. 坐标转换：Screen ↔ World 双向转换，处理缩放和平移变换
 * 2. 几何计算：距离、角度、中心点、矩形顶点创建
 * 3. 吸附系统：网格吸附、顶点吸附、角度约束（支持缩放自适应容差）
 * 4. 对齐检测：水平/垂直对齐检测与坐标吸附
 * 5. 旋转变换：点和多边形的围绕中心旋转
 *
 * 坐标系统：
 * - Screen：屏幕坐标（像素），相对于视口
 * - World：世界坐标，无限画布中的逻辑坐标
 * - 转换核心：以画布中心为原点的缩放变换
 *
 * 缩放自适应：
 * 所有像素级容差（如吸附距离）都通过 `/scale` 转换为世界坐标，
 * 确保在任意缩放级别下，用户在屏幕上的感知距离保持一致。
 */

import { CANVAS_CONFIG, type Point, type SnapResult, type AlignmentResult } from '@/types';

const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;

/**
 * 将屏幕坐标转换为世界坐标
 *
 * @param clientX - 鼠标在屏幕上的 X 坐标
 * @param clientY - 鼠标在屏幕上的 Y 坐标
 * @param containerRect - Canvas 容器相对于视口的位置
 * @param offsetX - 当前水平滚动位置（scrollLeft）
 * @param offsetY - 当前垂直滚动位置（scrollTop）
 * @param scale - 当前缩放比例
 * @returns 世界坐标点
 */
export function screenToWorld(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  offsetX: number,
  offsetY: number,
  scale: number
): Point {
  // 1. 计算鼠标相对于 Canvas 容器的位置
  const relativeX = clientX - containerRect.left + offsetX;
  const relativeY = clientY - containerRect.top + offsetY;

  // 2. 考虑缩放变换（以画布中心为原点）
  // 变换公式：world = (screen - center) / scale + center
  const worldX = (relativeX - WORLD_CENTER) / scale + WORLD_CENTER;
  const worldY = (relativeY - WORLD_CENTER) / scale + WORLD_CENTER;

  return { x: worldX, y: worldY };
}

/**
 * 将世界坐标转换为屏幕坐标
 *
 * @param worldX - 世界坐标 X
 * @param worldY - 世界坐标 Y
 * @param offsetX - 当前水平滚动位置
 * @param offsetY - 当前垂直滚动位置
 * @param scale - 当前缩放比例
 * @returns 屏幕坐标点（相对于视口）
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  offsetX: number,
  offsetY: number,
  scale: number
): Point {
  // 逆向变换
  const screenX = (worldX - WORLD_CENTER) * scale + WORLD_CENTER - offsetX;
  const screenY = (worldY - WORLD_CENTER) * scale + WORLD_CENTER - offsetY;

  return { x: screenX, y: screenY };
}

/**
 * 创建矩形区域的四个顶点
 *
 * @param start - 起点（对角线的一个端点）
 * @param end - 终点（对角线的另一个端点）
 * @returns 按顺时针顺序排列的四个顶点
 */
export function createRectanglePoints(start: Point, end: Point): Point[] {
  return [
    { x: start.x, y: start.y },     // 左上
    { x: end.x, y: start.y },       // 右上
    { x: end.x, y: end.y },         // 右下
    { x: start.x, y: end.y },       // 左下
  ];
}

/**
 * 计算多边形的中心点（顶点平均值）
 *
 * @param points - 多边形顶点数组
 * @returns 中心点坐标
 */
export function getPolygonCenter(points: Point[]): Point {
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  return { x: sumX / points.length, y: sumY / points.length };
}

/**
 * 计算两点之间的距离
 *
 * @param p1 - 第一个点
 * @param p2 - 第二个点
 * @returns 距离
 */
export function getDistance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * 网格吸附
 *
 * @param point - 原始坐标点
 * @param gridSize - 网格大小
 * @returns 吸附到网格后的坐标点
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * 检测点是否与已有顶点水平或垂直对齐，并返回吸附后的点
 *
 * @param point - 当前点
 * @param vertices - 所有已有顶点
 * @param tolerance - 对齐容差（像素）
 * @returns 对齐结果，包含吸附后的点
 */
export function findAlignment(
  point: Point,
  vertices: Point[],
  tolerance: number = 5
): AlignmentResult {
  let horizontalSource: Point | undefined;
  let verticalSource: Point | undefined;

  for (const vertex of vertices) {
    // 检查水平对齐（Y 坐标相近）
    if (Math.abs(point.y - vertex.y) < tolerance && !horizontalSource) {
      horizontalSource = vertex;
    }
    // 检查垂直对齐（X 坐标相近）
    if (Math.abs(point.x - vertex.x) < tolerance && !verticalSource) {
      verticalSource = vertex;
    }
  }

  // 计算吸附后的点
  // 水平对齐时吸附 Y 坐标，垂直对齐时吸附 X 坐标
  const snappedPoint: Point = {
    x: verticalSource ? verticalSource.x : point.x,
    y: horizontalSource ? horizontalSource.y : point.y,
  };

  return {
    isHorizontalAligned: !!horizontalSource,
    isVerticalAligned: !!verticalSource,
    horizontalSource,
    verticalSource,
    snappedPoint,
  };
}

/**
 * 寻找吸附点
 * 支持网格吸附、顶点吸附和角度吸附
 *
 * @param point - 原始点
 * @param options - 吸附选项
 * @param options.scale - 当前缩放比例（用于将屏幕像素容差转换为世界坐标容差）
 * @returns 吸附结果
 */
export function findSnapPoint(
  point: Point,
  options: {
    gridSize?: number;
    vertices?: Point[];
    angles?: number[];
    angleBase?: Point;
    scale?: number;
  }
): SnapResult {
  const { gridSize, vertices, angles, angleBase, scale = 1 } = options;

  // 将屏幕像素容差转换为世界坐标容差
  // 屏幕像素 / scale = 世界坐标距离
  const gridTolerance = 10 / scale;     // 网格吸附容差：10屏幕像素
  const vertexTolerance = 15 / scale;   // 顶点吸附容差：15屏幕像素

  // 1. 检查网格吸附
  if (gridSize && gridSize > 0) {
    const snapped = snapToGrid(point, gridSize);
    const distance = getDistance(point, snapped);
    if (distance < gridTolerance) {
      return { point: snapped, type: 'grid' };
    }
  }

  // 2. 检查顶点吸附
  if (vertices && vertices.length > 0) {
    for (const vertex of vertices) {
      const distance = getDistance(point, vertex);
      if (distance < vertexTolerance) {
        return { point: vertex, type: 'vertex', source: vertex };
      }
    }
  }

  // 3. 检查角度吸附
  if (angles && angleBase && angles.length > 0) {
    const dx = point.x - angleBase.x;
    const dy = point.y - angleBase.y;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    const distance = Math.hypot(dx, dy);

    for (const angle of angles) {
      const angleDiff = Math.abs(currentAngle - angle);
      if (angleDiff < 5 || angleDiff > 355) {
        // 5° 容差
        const rad = angle * (Math.PI / 180);
        return {
          point: {
            x: angleBase.x + Math.cos(rad) * distance,
            y: angleBase.y + Math.sin(rad) * distance,
          },
          type: 'angle',
          source: angleBase,
          angle,
        };
      }
    }
  }

  return { point, type: 'none' };
}

/**
 * 计算两点之间的角度（度数）
 *
 * @param center - 中心点
 * @param point - 目标点
 * @returns 角度（0-360度）
 */
export function getAngle(center: Point, point: Point): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

/**
 * 旋转点围绕中心点
 *
 * @param point - 要旋转的点
 * @param center - 旋转中心
 * @param angle - 旋转角度（度数）
 * @returns 旋转后的点
 */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const rad = angle * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * 旋转多边形的所有顶点
 *
 * @param points - 多边形顶点数组
 * @param center - 旋转中心
 * @param angle - 旋转角度（度数）
 * @returns 旋转后的顶点数组
 */
export function rotatePolygon(points: Point[], center: Point, angle: number): Point[] {
  return points.map(p => rotatePoint(p, center, angle));
}
