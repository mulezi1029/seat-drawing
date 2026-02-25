/**
 * ToolManager 工具管理器
 *
 * 负责管理所有工具的注册、切换和事件分发。
 * 是编辑器与工具系统之间的桥梁。
 */

import type {
  Tool,
  ToolEvent,
  ToolRegistryEntry,
  IToolManager,
  ToolContext,
} from './types';

export class ToolManager implements IToolManager {
  /** 工具注册表 */
  private tools: Map<string, ToolRegistryEntry> = new Map();

  /** 当前激活的工具 */
  private currentTool: Tool | null = null;

  /** 工具上下文 */
  private context: ToolContext;

  /** 是否正在拖拽 (用于区分点击和拖拽) */
  private isDragging = false;

  /** 拖拽起始点 */
  private dragStartPoint: { x: number; y: number } | null = null;

  /** 拖拽阈值 (超过此距离视为拖拽) */
  private readonly DRAG_THRESHOLD = 3;

  constructor(context: ToolContext) {
    this.context = context;
  }

  /**
   * 注册工具
   * @param tool 工具实例
   * @param group 工具分组
   * @param shortcut 快捷键 (可选)
   */
  registerTool(tool: Tool, group: string, shortcut?: string): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool with id "${tool.id}" is already registered. Overwriting.`);
    }

    this.tools.set(tool.id, {
      tool,
      group,
      shortcut,
    });
  }

  /**
   * 设置当前工具
   * @param toolId 工具ID
   */
  setTool(toolId: string): void {
    const entry = this.tools.get(toolId);
    if (!entry) {
      console.error(`Tool with id "${toolId}" not found.`);
      return;
    }

    // 停用当前工具
    if (this.currentTool) {
      this.currentTool.onDeactivate();
    }

    // 激活新工具
    this.currentTool = entry.tool;
    this.currentTool.onActivate();

    // 重置拖拽状态
    this.isDragging = false;
    this.dragStartPoint = null;
  }

  /**
   * 获取当前工具
   */
  getCurrentTool(): Tool | null {
    return this.currentTool;
  }

  /**
   * 获取所有工具
   */
  getAllTools(): ToolRegistryEntry[] {
    return Array.from(this.tools.values());
  }

  /**
   * 按分组获取工具
   */
  getToolsByGroup(group: string): ToolRegistryEntry[] {
    return Array.from(this.tools.values()).filter((entry) => entry.group === group);
  }

  /**
   * 根据工具ID获取工具
   */
  getTool(toolId: string): Tool | null {
    return this.tools.get(toolId)?.tool ?? null;
  }

  /**
   * 设置新的上下文（用于上下文更新时）
   */
  setContext(context: ToolContext): void {
    this.context = context;
    // 更新所有工具的上下文
    for (const entry of this.tools.values()) {
      entry.tool.setContext(context);
    }
  }

  /**
   * 销毁工具管理器
   */
  destroy(): void {
    // 停用当前工具
    if (this.currentTool) {
      this.currentTool.onDeactivate();
      this.currentTool = null;
    }
    // 清空工具注册表
    this.tools.clear();
  }

  /**
   * 处理鼠标按下事件
   * 将浏览器事件转换为 ToolEvent 并分发给当前工具
   */
  handleMouseDown(e: MouseEvent, container: HTMLElement): void {
    if (!this.currentTool) return;

    // 记录拖拽起始点
    this.dragStartPoint = { x: e.clientX, y: e.clientY };
    this.isDragging = false;

    const toolEvent = this.createToolEvent(e, container);
    this.currentTool.onMouseDown(toolEvent);
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(e: MouseEvent, container: HTMLElement): void {
    if (!this.currentTool) return;

    // 检测是否开始拖拽
    if (this.dragStartPoint && !this.isDragging) {
      const dx = e.clientX - this.dragStartPoint.x;
      const dy = e.clientY - this.dragStartPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }
    }

    const toolEvent = this.createToolEvent(e, container);
    this.currentTool.onMouseMove(toolEvent);
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(e: MouseEvent, container: HTMLElement): void {
    if (!this.currentTool) return;

    const toolEvent = this.createToolEvent(e, container);
    this.currentTool.onMouseUp(toolEvent);

    // 重置拖拽状态
    this.isDragging = false;
    this.dragStartPoint = null;
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(e: KeyboardEvent): void {
    if (!this.currentTool?.onKeyDown) return;
    this.currentTool.onKeyDown(e);
  }

  /**
   * 处理键盘释放事件
   */
  handleKeyUp(e: KeyboardEvent): void {
    if (!this.currentTool?.onKeyUp) return;
    this.currentTool.onKeyUp(e);
  }

  /**
   * 处理滚轮事件
   */
  handleWheel(e: WheelEvent): void {
    if (!this.currentTool?.onWheel) return;
    this.currentTool.onWheel(e);
  }

  /**
   * 处理双击事件
   */
  handleDoubleClick(e: MouseEvent, container: HTMLElement): void {
    if (!this.currentTool?.onDoubleClick) return;
    const toolEvent = this.createToolEvent(e, container);
    this.currentTool.onDoubleClick(toolEvent);
  }

  /**
   * 处理窗口失焦事件
   */
  handleBlur(): void {
    if (!this.currentTool?.onBlur) return;
    this.currentTool.onBlur();
  }

  /**
   * 检查是否正在拖拽
   */
  isDraggingActive(): boolean {
    return this.isDragging;
  }

  /**
   * 将浏览器事件转换为 ToolEvent
   */
  private createToolEvent(e: MouseEvent, container: HTMLElement): ToolEvent {
    // 计算视口坐标
    const rect = container.getBoundingClientRect();
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;

    // 计算世界坐标
    const { viewport } = this.context;
    const worldX = (viewportX - viewport.offsetX) / viewport.scale;
    const worldY = (viewportY - viewport.offsetY) / viewport.scale;

    return {
      worldPoint: { x: worldX, y: worldY },
      screenPoint: { x: e.clientX, y: e.clientY },
      viewportPoint: { x: viewportX, y: viewportY },
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      button: e.button,
    };
  }
}
