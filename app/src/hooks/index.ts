/**
 * Hooks 模块
 *
 * 提供可复用的 React Hooks，遵循单一职责原则。
 */

// 基础 hooks
export { useToast } from './use-toast';

// 核心 hooks (Phase 3 重构)
export { useViewport } from './useViewport';
export type { UseViewportReturn } from './useViewport';

export { useSelection } from './useSelection';
export type { UseSelectionReturn } from './useSelection';

export { useEditorState } from './useEditorState';
export type { UseEditorStateReturn } from './useEditorState';

export { useDrawing } from './useDrawing';
export type { UseDrawingReturn, AddPointResult } from './useDrawing';

export { useCommands } from './useCommands';
export type { UseCommandsReturn } from './useCommands';

// 主 hook (重构后版本)
export { useVenueDesignerNew } from './useVenueDesignerNew';
export type { UseVenueDesignerNewReturn } from './useVenueDesignerNew';

// 类别管理 hook
export { useCategories } from './useCategories';
export type { UseCategoriesReturn } from './useCategories';

// 剪贴板 hook
export { useClipboard } from './useClipboard';
export type { UseClipboardReturn, ClipboardData } from './useClipboard';
