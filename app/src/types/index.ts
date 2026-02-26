/**
 * 场馆座位绘制功能 - 类型定义文件
 * 定义了整个应用所使用的所有数据类型和接口
 */

/**
 * 画布配置常量
 * 采用中心原点坐标系，虚拟画布 50000×50000，范围 (-25000,-25000)~(25000,25000)
 */
export const CANVAS_CONFIG = {
  WORLD_SIZE: 50000,
  WORLD_MIN: -25000,
  WORLD_MAX: 25000,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  DEFAULT_ZOOM: 1,
  PAN_BUFFER: 5000,
  IMAGE_WIDTH: 800,
  IMAGE_HEIGHT: 600,
};

/**
 * 视口状态接口
 * 用于 3 套坐标系统中的 Viewport 变换：Screen → Viewport → World
 * 所有数据（section、seat、selection）统一使用 World 坐标存储
 * @interface ViewportState
 * @property {number} scale - 缩放比例（1.0 为 100%）
 * @property {number} offsetX - X 轴偏移（World 原点在视口中的 X 位置）
 * @property {number} offsetY - Y 轴偏移（World 原点在视口中的 Y 位置）
 */
export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 点坐标接口
 * 用于表示二维平面上的任意点
 * @interface Point
 * @property {number} x - X 轴坐标值
 * @property {number} y - Y 轴坐标值
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 边界框接口
 * 用于表示二维空间中的矩形区域
 * @interface BoundingBox
 * @property {number} minX - 最小 X 坐标
 * @property {number} minY - 最小 Y 坐标
 * @property {number} maxX - 最大 X 坐标
 * @property {number} maxY - 最大 Y 坐标
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 座位类型
 */
export type SeatType = 'normal' | 'vip' | 'accessible' | 'empty';

/**
 * 座位接口
 * @interface Seat
 * @property {string} id - 唯一标识符
 * @property {number} x - 世界坐标 X
 * @property {number} y - 世界坐标 Y
 * @property {string} row - 行号（如 "A"）
 * @property {number} number - 座位号
 * @property {SeatType} type - 座位类型
 * @property {number} angle - 座位角度（0-360°）
 */
export interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: number;
  type: SeatType;
  angle: number;
}

/**
 * 座位视觉参数（单位：pt，与 seats.io 一致）
 * 座位为正方形，统一使用 size 描述边长
 * @interface SeatVisualParams
 */
export interface SeatVisualParams {
  /** 座位边长 (pt) */
  size: number;
  /** 横向间距 (pt) */
  gapX: number;
  /** 纵向间距 (pt) */
  gapY: number;
}

/**
 * 校准数据
 * @interface CalibrationData
 */
export interface CalibrationData {
  /** 画布缩放比例 */
  canvasScale: number;
  /** 锚点缩放（用于重置） */
  anchorScale: number;
  /** 座位视觉参数 */
  seatVisual: SeatVisualParams;
  /** 是否已完成校准 */
  isCalibrated: boolean;
}

/**
 * 区域（Section）接口
 * 表示场馆中的一个区域/区块
 * @interface Section
 * @property {string} id - 唯一标识符
 * @property {string} name - 区域名称（如 "区域 A"）
 * @property {Point[]} points - 多边形顶点数组（World 坐标）
 * @property {string} color - 显示颜色（hex）
 * @property {Seat[]} seats - 区域内座位数组
 * @property {number} opacity - 透明度 0-1
 * @property {CalibrationData} [calibrationData] - 校准设置持久化
 */
export interface Section {
  id: string;
  name: string;
  points: Point[];
  color: string;
  seats: Seat[];
  opacity: number;
  /** 校准设置持久化 */
  calibrationData?: CalibrationData;
}

/**
 * 区域编辑状态
 * @interface SectionEditState
 */
export interface SectionEditState {
  /** 是否处于区域编辑模式 */
  isActive: boolean;
  /** 正在编辑的区域 ID */
  sectionId: string | null;
  /** 当前阶段 */
  phase: 'calibrating' | 'editing';
  /** 校准数据 */
  calibration: CalibrationData;
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean;
}

/**
 * 编辑器模式
 */
export type EditorMode = 'view' | 'draw-section' | 'draw-polygon' | 'draw-seat' | 'select';

/**
 * 区域编辑工具模式
 */
export type SectionEditTool = 'select' | 'single-row' | 'matrix' | 'arc-row';

/**
 * 选择框状态
 */
export interface SelectionBox {
  start: Point;
  end: Point;
  isSelecting: boolean;
}

/**
 * 对齐检测结果
 * @interface AlignmentResult
 * @property {boolean} isHorizontalAligned - 是否与某点水平对齐
 * @property {boolean} isVerticalAligned - 是否与某点垂直对齐
 * @property {Point} [horizontalSource] - 水平对齐的源点
 * @property {Point} [verticalSource] - 垂直对齐的源点
 * @property {Point} [snappedPoint] - 对齐吸附后的点（X或Y坐标被吸附到对齐源点）
 */
export interface AlignmentResult {
  isHorizontalAligned: boolean;
  isVerticalAligned: boolean;
  horizontalSource?: Point;
  verticalSource?: Point;
  snappedPoint?: Point;
}

/**
 * 吸附结果接口
 * @interface SnapResult
 * @property {Point} point - 吸附后的点
 * @property {'none' | 'grid' | 'vertex' | 'angle'} type - 吸附类型
 * @property {Point} [source] - 吸附源点（用于辅助线）
 * @property {number} [angle] - 吸附角度
 * @property {AlignmentResult} [alignment] - 对齐信息
 */
export interface SnapResult {
  point: Point;
  type: 'none' | 'grid' | 'vertex' | 'angle';
  source?: Point;
  angle?: number;
  alignment?: AlignmentResult;
}

/**
 * 默认区域颜色列表
 */
export const DEFAULT_SECTION_COLORS = [
  '#fca700', // 橙色
  '#3b82f6', // 蓝色
  '#22c55e', // 绿色
  '#ef4444', // 红色
  '#a855f7', // 紫色
  '#ec4899', // 粉色
  '#14b8a6', // 青色
  '#f59e0b', // 琥珀色
];

// 导出校准相关类型
export * from './calibration';
