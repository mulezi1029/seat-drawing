/**
 * CommandManager 命令管理器
 *
 * 负责管理命令的执行、撤销、重做和历史记录。
 * 是编辑器 Undo/Redo 功能的核心。
 */

import type {
  Command,
  CommandContext,
  CommandHistoryEntry,
  ICommandManager,
} from './types';

export class CommandManager implements ICommandManager {
  /** 命令历史栈 */
  private history: CommandHistoryEntry[] = [];

  /** 当前命令索引 */
  private currentIndex = -1;

  /** 最大历史记录数 */
  private maxHistory: number;

  /** 命令上下文 */
  private context: CommandContext;

  constructor(context: CommandContext, maxHistory: number = 50) {
    this.context = context;
    this.maxHistory = maxHistory;
  }

  /**
   * 执行命令
   * @param command 要执行的命令
   */
  execute(command: Command): void {
    // 如果有命令被撤销过，删除这些命令
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 设置时间戳
    if (!command.timestamp) {
      command.timestamp = Date.now();
    }

    // 执行命令
    command.execute(this.context);

    // 添加到历史
    this.history.push({
      command,
      isUndone: false,
    });

    this.currentIndex++;

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }

    // 触发变更通知
    this.notifyChange();
  }

  /**
   * 撤销上一步操作
   */
  undo(): void {
    if (!this.canUndo()) {
      console.warn('CommandManager: Cannot undo, no commands to undo');
      return;
    }

    const entry = this.history[this.currentIndex];
    if (entry && !entry.isUndone) {
      entry.command.undo(this.context);
      entry.isUndone = true;
      this.currentIndex--;
      this.notifyChange();
    }
  }

  /**
   * 重做下一步操作
   */
  redo(): void {
    if (!this.canRedo()) {
      console.warn('CommandManager: Cannot redo, no commands to redo');
      return;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    if (entry && entry.isUndone) {
      // 如果有自定义 redo 方法，使用它；否则使用 execute
      if (entry.command.redo) {
        entry.command.redo(this.context);
      } else {
        entry.command.execute(this.context);
      }
      entry.isUndone = false;
      this.notifyChange();
    }
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyChange();
  }

  /**
   * 获取历史记录
   */
  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 获取最近执行的命令描述 (用于 UI 显示)
   */
  getLastCommandDescription(): string | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex].command.description;
    }
    return null;
  }

  /**
   * 获取下一步可重做的命令描述
   */
  getNextCommandDescription(): string | null {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < this.history.length) {
      return this.history[nextIndex].command.description;
    }
    return null;
  }

  /**
   * 批量执行命令 (原子操作)
   * @param commands 要批量执行的命令数组
   * @param description 批量命令的描述
   */
  executeBatch(commands: Command[], description: string): void {
    const batchId = `batch-${Date.now()}`;

    // 如果有命令被撤销过，删除这些命令
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 按顺序执行所有命令
    for (const command of commands) {
      command.execute(this.context);
    }

    // 将批量命令作为单个条目添加到历史
    this.history.push({
      command: {
        id: batchId,
        description,
        timestamp: Date.now(),
        execute: () => {
          // 重新执行所有命令
          for (const command of commands) {
            command.execute(this.context);
          }
        },
        undo: () => {
          // 逆序撤销所有命令
          for (let i = commands.length - 1; i >= 0; i--) {
            commands[i].undo(this.context);
          }
        },
        redo: () => {
          // 重新执行所有命令
          for (const command of commands) {
            command.execute(this.context);
          }
        },
      },
      isUndone: false,
    });

    this.currentIndex++;

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }

    this.notifyChange();
  }

  /**
   * 注册变更监听器
   */
  onChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  /** 变更监听器集合 */
  private changeListeners: Set<() => void> = new Set();

  /**
   * 通知所有监听器
   */
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }
}
