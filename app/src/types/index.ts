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
 * 座位接口
 * 表示场馆中的单个座位，包含位置、标识符和状态信息
 * 所有坐标统一使用 World 坐标系统存储
 * @interface Seat
 * @property {string} id - 座位的唯一标识符 (UUID)
 * @property {number} x - 座位的 X 坐标位置（World 坐标）
 * @property {number} y - 座位的 Y 坐标位置（World 坐标）
 * @property {string} row - 座位所在的行号 (如 'A', 'B', 'C' 等)
 * @property {number} number - 座位号 (行内的座位编号)
 * @property {string} status - 座位状态：可用、占用、预订、禁用
 * @property {string} color - 座位显示颜色 (可选，hex 格式)
 * @property {string} sectionId - 座位所属区域的 ID
 * @property {string} groupId - 座位所属座位组的 ID (可选)
 * @property {string} [categoryId] - 座位关联的类别 ID (可选)
 */
export interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: number;
  status: 'available' | 'occupied' | 'reserved' | 'disabled';
  color?: string;
  sectionId: string;
  groupId?: string;
  categoryId?: string;
}

/**
 * 座位组接口
 * 表示通过同一工具 (行工具或线工具) 创建的一组座位
 * 用于管理座位间距和其他属性
 * @interface SeatGroup
 * @property {string} id - 座位组的唯一标识符
 * @property {string} sectionId - 座位组所属的区域 ID
 * @property {string} tool - 创建该组的工具类型 ('row' 为行工具, 'line' 为线工具)
 * @property {number} spacing - 组内座位间距 (像素)
 * @property {string[]} seatIds - 该组包含的所有座位 ID 数组
 * @property {number} createdAt - 座位组创建的时间戳
 */
export interface SeatGroup {
  id: string;
  sectionId: string;
  tool: 'row' | 'line';
  spacing: number;
  seatIds: string[];
  createdAt: number;
}

/**
 * 区域接口
 * 表示场馆中的一个独立区域 (如 VIP 区、前排等)
 * 每个区域由多个顶点组成的多边形表示，顶点使用 World 坐标
 * @interface Section
 * @property {string} id - 区域的唯一标识符
 * @property {string} name - 区域的显示名称 (如 '区域 A', 'VIP 区' 等)
 * @property {Point[]} points - 构成区域边界的多边形顶点坐标数组（World 坐标）
 * @property {string} color - 区域在画布上显示的颜色 (hex 格式)
 * @property {Seat[]} seats - 该区域内包含的所有座位数组
 * @property {number} opacity - 区域的透明度 (0-1)
 */
export interface Section {
  id: string;
  name: string;
  points: Point[];
  color: string;
  seats: Seat[];
  opacity: number;
}

/**
 * 场馆地图接口
 * 表示整个场馆的数据模型，包含所有区域、座位和配置信息
 * @interface VenueMap
 * @property {string} id - 场馆地图的唯一标识符
 * @property {string} name - 场馆名称 (如 '剧院 A' 等)
 * @property {string | null} svgUrl - SVG 底图的 URL (用于渲染背景)
 * @property {string | null} svgContent - SVG 原始内容的字符串表示
 * @property {Section[]} sections - 场馆内所有区域的数组
 * @property {SeatGroup[]} seatGroups - 所有座位组的数组
 * @property {number} width - 场馆地图的画布宽度 (像素)
 * @property {number} height - 场馆地图的画布高度 (像素)
 */
export interface VenueMap {
  id: string;
  name: string;
  svgUrl: string | null;
  svgContent: string | null;
  sections: Section[];
  seatGroups: SeatGroup[];
  width: number;
  height: number;
}

/**
 * 编辑器模式枚举
 * 定义编辑器支持的所有操作模式
 * @type {EditorMode}
 * - 'view': 查看模式 - 用于查看整个场馆和区域
 * - 'draw-section': 绘制区域模式 - 用户通过点击添加多边形顶点来绘制新区域
 * - 'edit-section': 编辑区域模式 - 用于编辑已有区域的属性
 * - 'draw-seat': 绘制座位模式 - 在选定区域内添加座位
 */
export type EditorMode = 'view' | 'draw-section' | 'edit-section' | 'draw-seat';

/**
 * 区域绘制模式枚举
 * 定义绘制区域时的绘制方式
 * @type {SectionDrawMode}
 * - 'polygon': 多边形模式 - 逐点点击创建任意形状
 * - 'rectangle': 矩形模式 - 拖拽绘制标准矩形
 */
export type SectionDrawMode = 'polygon' | 'rectangle';

/**
 * 座位工具枚举
 * 在绘制座位模式下可用的工具类型
 * @type {SeatTool}
 * - 'select': 选择工具 - 可以选择和移动已有座位、框选多个座位
 * - 'single': 单个座位工具 - 逐个点击添加座位
 * - 'row': 行工具 - 从起点拖拽到终点创建一行座位
 * - 'line': 线工具 - 点击多个点创建沿线的座位
 */
export type SeatTool = 'select' | 'single' | 'row' | 'line';

/**
 * 画布工具枚举
 * 控制与 SVG 画布交互的方式
 * @type {CanvasTool}
 * - 'auto': 自动模式 - 正常操作，按住 Space 可临时平移
 * - 'pan': 平移工具 - 默认为平移模式，可拖拽移动画布
 * - 'select': 选择工具 - 专用于选择操作
 */
export type CanvasTool = 'auto' | 'pan' | 'select';


/**
 * 编辑器状态接口
 * 维护当前编辑器的完整运行状态
 * @interface EditorState
 * @property {EditorMode} mode - 当前操作模式
 * @property {string | null} selectedSectionId - 当前选中的区域 ID (null 表示无选中)
 * @property {string[]} selectedSeatIds - 当前选中的座位 ID 集合 (可能为空)
 * @property {SeatTool} seatTool - 绘制座位时选中的工具
 * @property {CanvasTool} canvasTool - 画布交互工具
 * @property {ViewportState} viewport - 视口状态（缩放与平移，替代原 zoom/pan）
 * @property {boolean} isDrawing - 是否正在绘制区域
 * @property {SectionDrawMode} sectionDrawMode - 区域绘制模式（多边形/矩形）
 * @property {Point[]} drawingPoints - 绘制区域时收集的顶点坐标数组（World 坐标）
 * @property {Point[] | null} tempLine - 临时线数据 (用于线工具预览)
 */
export interface EditorState {
  mode: EditorMode;
  selectedSectionId: string | null;
  selectedSeatIds: string[];
  seatTool: SeatTool;
  canvasTool: CanvasTool;
  viewport: ViewportState;
  isDrawing: boolean;
  sectionDrawMode: SectionDrawMode;
  drawingPoints: Point[];
  tempLine: Point[] | null;
}

/**
 * 绘制配置接口
 * 控制座位和区域在画布上的绘制外观
 * @interface DrawConfig
 * @property {number} seatRadius - 座位圆形的半径 (像素)
 * @property {number} seatSpacing - 单行或单条线上座位之间的间距 (像素)
 * @property {number} rowSpacing - 多行之间的行间距 (像素)
 * @property {string} defaultColor - 新创建区域的默认颜色 (hex 格式)
 * @property {number} sectionOpacity - 区域多边形的透明度 (0-1)
 */
export interface DrawConfig {
  seatRadius: number;
  seatSpacing: number;
  rowSpacing: number;
  defaultColor: string;
  sectionOpacity: number;
}

/**
 * 视图配置接口
 * 控制画布的显示选项和网格设置
 * @interface ViewConfig
 * @property {boolean} showGrid - 是否显示网格线
 * @property {number} gridSize - 网格间距 (像素)
 * @property {string} gridColor - 网格线的颜色 (hex 格式)
 * @property {string} backgroundColor - 画布背景颜色 (hex 格式)
 * @property {boolean} snapToGrid - 是否启用吸附到网格功能
 */
export interface ViewConfig {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
  snapToGrid: boolean;
}

/**
 * 对齐类型枚举
 * 用于对齐选中的多个座位
 * @type {AlignType}
 * - 'left': 左对齐 - 所有座位与最左边座位对齐
 * - 'center': 居中对齐 - 所有座位在中心线上对齐
 * - 'right': 右对齐 - 所有座位与最右边座位对齐
 * - 'top': 上对齐 - 所有座位与最上面座位对齐
 * - 'middle': 中间对齐 - 所有座位在中心线上对齐
 * - 'bottom': 下对齐 - 所有座位与最下面座位对齐
 * - 'distribute-h': 水平均匀分布 - 座位在水平方向均匀分布
 * - 'distribute-v': 竖直均匀分布 - 座位在竖直方向均匀分布
 */
export type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v';

/**
 * 座位类别接口
 * 表示一类座位的分类，如 VIP、普通、学生票等
 * @interface Category
 * @property {string} id - 类别的唯一标识符
 * @property {string} name - 类别名称 (如 'VIP区', '普通区')
 * @property {string} color - 类别颜色 (hex 格式)
 * @property {number} [price] - 类别价格 (可选)
 * @property {string} [icon] - 类别图标 (可选)
 */
export interface Category {
  id: string;
  name: string;
  color: string;
  price?: number;
  icon?: string;
}

/**
 * 剪贴板数据接口
 * 用于复制粘贴功能
 * @interface ClipboardData
 * @property {'seats' | 'sections'} type - 复制的数据类型
 * @property {string[]} ids - 复制的对象 ID 列表
 * @property {Point} [offset] - 粘贴时的偏移量
 */
export interface ClipboardData {
  type: 'seats' | 'sections';
  ids: string[];
  offset?: Point;
}

/**
 * Section 局部画布状态接口
 * 进入 section 编辑模式时，以 section 边界为新的画布坐标系
 * @interface SectionCanvas
 * @property {string} sectionId - 当前编辑的 section ID
 * @property {BoundingBox} bounds - section 的边界框（World 坐标）
 * @property {Point} origin - section 局部坐标系的原点（在 World 坐标中的位置）
 * @property {Point} backgroundOffset - 背景图偏移量（用于校准）
 */
export interface SectionCanvas {
  sectionId: string;
  bounds: BoundingBox;
  origin: Point;
  backgroundOffset: Point;
}
