/**
 * Tool System 类型定义
 *
 * 基于完整设计方案中的交互模型设计，实现工具驱动的编辑器架构。
 * 每个工具负责处理特定的用户交互，通过统一的接口与编辑器核心通信。
 */

import type { LucideIcon } from 'lucide-react';
import type { Point, ViewportState, Section, Seat } from '@/types';

/**
 * 工具事件对象
 * 包含所有坐标系下的点位置和修饰键状态
 */
export interface ToolEvent {
  /** 世界坐标 (数据存储和几何计算使用) */
  worldPoint: Point;
  /** 屏幕坐标 (浏览器事件) */
  screenPoint: Point;
  /** 视口坐标 (画布容器内) */
  viewportPoint: Point;
  /** Shift 键状态 */
  shiftKey: boolean;
  /** Alt 键状态 */
  altKey: boolean;
  /** Ctrl/Cmd 键状态 */
  ctrlKey: boolean;
  /** 鼠标按钮 (0=左键, 1=中键, 2=右键) */
  button: number;
}

/**
 * 工具上下文
 * 提供给工具访问编辑器状态和操作的能力
 */
export interface ToolContext {
  // Viewport
  viewport: ViewportState;
  setViewport: (viewport: ViewportState) => void;
  screenToWorld: (screenX: number, screenY: number) => Point;
  worldToScreen: (worldX: number, worldY: number) => Point;

  // Venue data
  venueMap: import('@/types').VenueMap;
  setVenueMap: (map: import('@/types').VenueMap) => void;

  // Editor state
  editorState: import('@/types').EditorState;
  setEditorState: (state: import('@/types').EditorState) => void;
  mode: import('@/types').EditorMode;
  setMode: (mode: import('@/types').EditorMode) => void;
  seatTool: import('@/types').SeatTool;
  setSeatTool: (tool: import('@/types').SeatTool) => void;

  // Selection
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  enterSection: (id: string) => void;
  selectedSeatIds: Set<string>;
  selectSeat: (id: string, multi?: boolean) => void;
  selectSeats: (ids: string[]) => void;
  clearSeatSelection: () => void;
  isSeatSelected: (id: string) => boolean;

  // Drawing
  startSectionDrawing: () => void;
  addSectionPoint: (point: Point, snapToGrid?: boolean, gridSize?: number) => void;
  removeLastSectionPoint: () => void;
  completeSectionDrawing: (name?: string, defaultColor?: string, sectionOpacity?: number) => Section | null;
  cancelSectionDrawing: () => void;
  updateRectanglePreview: (endPoint: Point) => void;
  getRectanglePoints: () => Point[];
  sectionPoints: Point[];

  // Seat operations
  addSeat: (sectionId: string, point: Point) => void;
  addSeatsInRow: (sectionId: string, start: Point, end: Point, spacing?: number) => void;
  addSeatsAlongLine: (sectionId: string, points: Point[]) => void;

  // Commands
  execute: (command: import('@/commands').Command) => void;

  // Overlay callback
  setToolOverlay: (overlay: React.ReactNode) => void;
  setCursor: (cursor: string) => void;

  // Hit testing
  getSectionAtPoint: (point: Point) => Section | null;
  getSeatAtPoint: (point: Point, section: Section | null) => { seat: Seat; section: Section } | null;

  // View config
  viewConfig: import('@/types').ViewConfig;

  // Container ref
  containerRef: React.RefObject<HTMLElement | null>;

  // Space key state
  isSpacePressed(): boolean;
}

/**
 * 命令接口 (简化版，完整定义在 commands/types.ts)
 */
export interface Command {
  id: string;
  description: string;
  execute(): void;
  undo(): void;
}

/**
 * 工具接口
 * 所有工具必须实现此接口
 */
export interface Tool {
  /** 工具唯一标识 */
  id: string;
  /** 工具显示名称 */
  name: string;
  /** 工具图标 */
  icon: LucideIcon;
  /** 鼠标光标样式 */
  cursor: string;
  /** 工具是否支持撤销 (绘制类工具通常不支持) */
  supportsUndo?: boolean;

  /**
   * 设置工具上下文
   * 当编辑器状态更新时调用
   */
  setContext(context: ToolContext): void;

  /**
   * 工具激活时调用
   * 用于初始化工具状态
   */
  onActivate(): void;

  /**
   * 工具停用时调用
   * 用于清理工具状态
   */
  onDeactivate(): void;

  /**
   * 鼠标按下事件
   */
  onMouseDown(e: ToolEvent): void;

  /**
   * 鼠标移动事件
   */
  onMouseMove(e: ToolEvent): void;

  /**
   * 鼠标释放事件
   */
  onMouseUp(e: ToolEvent): void;

  /**
   * 键盘按下事件
   */
  onKeyDown?(e: KeyboardEvent): void;

  /**
   * 键盘释放事件
   */
  onKeyUp?(e: KeyboardEvent): void;

  /**
   * 滚轮事件
   */
  onWheel?(e: WheelEvent): void;

  /**
   * 双击事件
   */
  onDoubleClick?(e: ToolEvent): void;

  /**
   * 窗口失焦事件
   */
  onBlur?(): void;

  /**
   * 渲染工具相关的预览/辅助图形
   * 返回 SVG 元素或 null
   */
  renderOverlay?(): React.ReactNode;
}

/**
 * 工具基类
 * 提供默认实现，具体工具可继承此类
 */
export abstract class BaseTool implements Tool {
  abstract id: string;
  abstract name: string;
  abstract icon: LucideIcon;
  abstract cursor: string;
  supportsUndo = true;

  protected context!: ToolContext;

  constructor(context?: ToolContext) {
    if (context) {
      this.context = context;
    }
  }

  setContext(context: ToolContext): void {
    this.context = context;
  }

  onActivate(): void {
    // 默认空实现
  }

  onDeactivate(): void {
    // 默认空实现
  }

  onMouseDown(_e: ToolEvent): void {
    // 默认空实现
  }

  onMouseMove(_e: ToolEvent): void {
    // 默认空实现
  }

  onMouseUp(_e: ToolEvent): void {
    // 默认空实现
  }

  onBlur(): void {
    // 默认空实现
  }
}

/**
 * 工具注册表项
 */
export interface ToolRegistryEntry {
  tool: Tool;
  /** 工具分组 (用于UI组织) */
  group: string;
  /** 快捷键 */
  shortcut?: string;
}

/**
 * 工具管理器接口
 */
export interface IToolManager {
  /** 注册工具 */
  registerTool(tool: Tool, group: string, shortcut?: string): void;
  /** 设置当前工具 */
  setTool(toolId: string): void;
  /** 获取当前工具 */
  getCurrentTool(): Tool | null;
  /** 获取所有工具 */
  getAllTools(): ToolRegistryEntry[];
  /** 按分组获取工具 */
  getToolsByGroup(group: string): ToolRegistryEntry[];
}
