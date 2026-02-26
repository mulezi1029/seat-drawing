/**
 * Hooks 模块 - 极简版本
 *
 * 仅保留核心 hooks
 */

// 简单查看器 hook
export { useSimpleViewer } from './useSimpleViewer';
export type {
  UseSimpleViewerReturn,
  SimpleViewerState,
  SimpleViewerActions,
} from './useSimpleViewer';

// 区域编辑 hook
export { useSectionEdit } from './useSectionEdit';
export type { UseSectionEditParams, UseSectionEditReturn } from './useSectionEdit';
