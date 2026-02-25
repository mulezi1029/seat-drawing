/**
 * Tool System 工具系统
 *
 * 基于完整设计方案中的交互模型设计，实现工具驱动的编辑器架构。
 * 每个工具负责处理特定的用户交互，通过统一的接口与编辑器核心通信。
 */

// Types
export type {
  Tool,
  ToolEvent,
  ToolContext,
  Command,
  ToolRegistryEntry,
  IToolManager,
} from './types';

export { BaseTool } from './types';

// Tool Manager
export { ToolManager } from './ToolManager';

// Tools
export { ViewTool } from './ViewTool';
export { SelectTool } from './SelectTool';
export { DrawSectionTool } from './DrawSectionTool';
export type { DrawSectionCommand } from './DrawSectionTool';
export { DrawSeatTool } from './DrawSeatTool';
export type { DrawSeatCommand } from './DrawSeatTool';
export { MoveTool } from './MoveTool';
export type { MoveCommand } from './MoveTool';
