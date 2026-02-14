// Venue Seat Designer Types

/**
 * 点坐标
 * @interface Point
 * @property {number} x - X 坐标
 * @property {number} y - Y 坐标
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 座位
 * @interface Seat
 * @property {string} id - 座位ID
 * @property {number} x - X 坐标
 * @property {number} y - Y 坐标
 * @property {string} row - 行号
 * @property {number} number - 座位号
 * @property {string} status - 座位状态
 * @property {string} color - 座位颜色
 * @property {string} sectionId - 所属区域ID
 * @property {string} groupId - 所属组ID
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
}

/**
 * 座位组
 * @interface SeatGroup
 * @property {string} id - 组ID
 * @property {string} sectionId - 所属区域ID
 * @property {string} tool - 组工具
 * @property {number} spacing - 组间距
 * @property {string[]} seatIds - 座位ID集合
 * @property {number} createdAt - 创建时间
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
 * 区域
 * @interface Section
 * @property {string} id - 区域ID
 * @property {string} name - 区域名称
 * @property {Point[]} points - 多边形顶点坐标
 * @property {string} color - 区域颜色
 * @property {Seat[]} seats - 座位列表
 * @property {number} opacity - 区域透明度
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
 * 场馆地图
 * @interface VenueMap
 * @property {string} id - 场馆ID
 * @property {string} name - 场馆名称
 * @property {string} svgUrl - SVG底图URL
 * @property {string} svgContent - SVG原始内容
 * @property {Section[]} sections - 区域列表
 * @property {SeatGroup[]} seatGroups - 座位组列表
 * @property {number} width - 画布宽度
 * @property {number} height - 画布高度
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
 * 编辑模式：视图模式、绘制区域模式、编辑区域模式、绘制座位模式
 * @type {EditorMode}
 */
export type EditorMode = 'view' | 'draw-section' | 'edit-section' | 'draw-seat';

/**
 * 绘制座位时当前选中的工具：选择工具、单个座位工具、行工具、线工具
 * @type {SeatTool}
 */
export type SeatTool = 'select' | 'single' | 'row' | 'line';

/**
 * 画布工具：自动工具、平移工具、选择工具
 * @type {CanvasTool}
 */
export type CanvasTool = 'auto' | 'pan' | 'select';

/**
 * 编辑器状态
 * @interface EditorState
 * @property {EditorMode} mode - 编辑模式
 * @property {string | null} selectedSectionId - 选中的区域ID
 * @property {string[]} selectedSeatIds - 选中的座位ID集合
 * @property {SeatTool} seatTool - 座位工具
 * @property {CanvasTool} canvasTool - 画布工具
 * @property {number} zoom - 缩放比例
 * @property {Point} pan - 平移位置
 * @property {boolean} isDrawing - 是否正在绘制
 * @property {Point[]} drawingPoints - 绘制点
 * @property {Point[] | null} tempLine - 临时线
 */
export interface EditorState {
  mode: EditorMode;   // 编辑模式
  selectedSectionId: string | null;   // 选中的区域ID
  selectedSeatIds: string[];   // 选中的座位ID集合
  seatTool: SeatTool;   // 座位工具
  canvasTool: CanvasTool;   // 画布工具
  zoom: number;   // 缩放比例
  pan: Point;   // 平移位置
  isDrawing: boolean;   // 是否正在绘制
  drawingPoints: Point[];   // 绘制点
  tempLine: Point[] | null;   // 临时线
}

/**
 * 绘制配置
 * @interface DrawConfig
 * @property {number} seatRadius - 座位半径
 * @property {number} seatSpacing - 座位间距
 * @property {number} rowSpacing - 行间距
 * @property {string} defaultColor - 默认颜色
 * @property {number} sectionOpacity - 区域透明度
 */
export interface DrawConfig {
  seatRadius: number;
  seatSpacing: number;
  rowSpacing: number;
  defaultColor: string;
  sectionOpacity: number;
}

export interface ViewConfig {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
  snapToGrid: boolean;
}

/**
 * 对齐类型：左对齐、居中对齐、右对齐、上对齐、下对齐、水平分布、垂直分布
 * @type {AlignType}
 */
export type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v';  
