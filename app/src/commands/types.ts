/**
 * Command Pattern 命令模式类型定义
 *
 * 基于完整设计方案中的命令模式设计，实现可撤销/重做的操作。
 * 每个命令封装一个操作及其逆操作，支持撤销重做功能。
 */

import type { VenueMap, EditorState } from '@/types';

/**
 * 命令上下文
 * 提供给命令访问编辑器状态和操作的能力
 */
export interface CommandContext {
  /** 场地地图数据 */
  venueMap: VenueMap;
  /** 编辑器状态 */
  editorState: EditorState;
  /** 设置场地地图 */
  setVenueMap: (map: VenueMap) => void;
  /** 设置编辑器状态 */
  setEditorState: (state: EditorState) => void;
  /** 设置选中区域 */
  setSelectedSectionId: (id: string | null) => void;
  /** 设置选中座位 */
  setSelectedSeatIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  /** 获取区域 */
  getSection: (id: string) => import('@/types').Section | undefined;
  /** 获取座位 */
  getSeat: (sectionId: string, seatId: string) => import('@/types').Seat | undefined;
}

/**
 * 命令接口
 * 所有命令必须实现此接口
 */
export interface Command {
  /** 命令唯一标识 */
  id: string;
  /** 命令描述 (用于 UI 显示) */
  description: string;
  /** 命令执行时间戳 */
  timestamp: number;

  /**
   * 执行命令
   * @param context 命令上下文
   */
  execute(context: CommandContext): void;

  /**
   * 撤销命令
   * @param context 命令上下文
   */
  undo(context: CommandContext): void;

  /**
   * 重做命令 (默认调用 execute)
   * @param context 命令上下文
   */
  redo?(context: CommandContext): void;
}

/**
 * 命令历史记录条目
 */
export interface CommandHistoryEntry {
  /** 命令实例 */
  command: Command;
  /** 是否在撤销栈中 */
  isUndone: boolean;
}

/**
 * 命令管理器接口
 */
export interface ICommandManager {
  /** 执行命令 */
  execute(command: Command): void;
  /** 撤销上一步操作 */
  undo(): void;
  /** 重做下一步操作 */
  redo(): void;
  /** 是否可以撤销 */
  canUndo(): boolean;
  /** 是否可以重做 */
  canRedo(): boolean;
  /** 清空历史 */
  clear(): void;
  /** 获取历史记录 (用于 UI 显示) */
  getHistory(): CommandHistoryEntry[];
  /** 获取当前索引 */
  getCurrentIndex(): number;
}

/**
 * 批量命令
 * 将多个命令组合为一个原子操作
 */
export class BatchCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private commands: Command[];

  constructor(id: string, description: string, commands: Command[]) {
    this.id = id;
    this.description = description;
    this.timestamp = Date.now();
    this.commands = [...commands];
  }

  execute(context: CommandContext): void {
    for (const command of this.commands) {
      command.execute(context);
    }
  }

  undo(context: CommandContext): void {
    // 逆序撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo(context);
    }
  }

  redo(context: CommandContext): void {
    this.execute(context);
  }

  /**
   * 添加命令到批次
   */
  addCommand(command: Command): void {
    this.commands.push(command);
  }

  /**
   * 获取命令数量
   */
  getCommandCount(): number {
    return this.commands.length;
  }
}
