/**
 * useCommands Hook
 *
 * 命令系统集成 Hook，负责管理命令的执行、撤销、重做。
 * 使用 CommandManager 实现，替代原有的 useUndoRedo。
 *
 * 功能：
 * - 执行命令
 * - 撤销/重做
 * - 管理命令历史
 * - 批量命令执行
 */

import { useState, useCallback, useRef } from 'react';
import { CommandManager } from '@/commands';
import type { Command, CommandContext } from '@/commands';

export interface UseCommandsReturn {
  // 命令执行
  execute: (command: Command) => void;
  executeBatch: (commands: Command[], description: string) => void;

  // 撤销/重做
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // 历史记录
  history: string[];
  currentIndex: number;

  // 配置 CommandManager
  setupContext: (context: CommandContext) => void;
}

export function useCommands(): UseCommandsReturn {
  // 命令管理器实例
  const commandManagerRef = useRef<CommandManager | null>(null);

  // 状态更新触发器
  const [, forceUpdate] = useState({});

  // 设置命令上下文
  const setupContext = useCallback((context: CommandContext) => {
    commandManagerRef.current = new CommandManager(context, 50);

    // 监听变更
    commandManagerRef.current.onChange(() => {
      forceUpdate({});
    });
  }, []);

  // 执行命令
  const execute = useCallback((command: Command) => {
    if (!commandManagerRef.current) {
      console.warn('CommandManager not initialized. Call setupContext first.');
      return;
    }
    commandManagerRef.current.execute(command);
  }, []);

  // 批量执行命令
  const executeBatch = useCallback((commands: Command[], description: string) => {
    if (!commandManagerRef.current) {
      console.warn('CommandManager not initialized. Call setupContext first.');
      return;
    }
    commandManagerRef.current.executeBatch(commands, description);
  }, []);

  // 撤销
  const undo = useCallback(() => {
    if (!commandManagerRef.current) return;
    commandManagerRef.current.undo();
  }, []);

  // 重做
  const redo = useCallback(() => {
    if (!commandManagerRef.current) return;
    commandManagerRef.current.redo();
  }, []);

  // 获取当前状态
  const canUndo = commandManagerRef.current?.canUndo() ?? false;
  const canRedo = commandManagerRef.current?.canRedo() ?? false;
  const history = commandManagerRef.current?.getHistory().map(h => h.command.description) ?? [];
  const currentIndex = commandManagerRef.current?.getCurrentIndex() ?? -1;

  return {
    execute,
    executeBatch,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    currentIndex,
    setupContext,
  };
}
