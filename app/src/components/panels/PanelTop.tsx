/**
 * 顶部工具栏 - 占位组件
 *
 * 包含：文档操作、设计工具、上下文操作、帮助
 */

import React from 'react';
import { Undo2, Redo2, Grid3X3, Eye, Type, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PanelTop: React.FC = () => {
  return (
    <header className="h-12 bg-white border-b flex items-center px-4 justify-between flex-shrink-0">
      {/* 文档操作组 */}
      <div className="flex items-center gap-2">
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" onMouseDown={(e) => e.preventDefault()}>
          <span className="text-lg">×</span>
        </Button>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Untitled chart</span>
          <span className="text-xs text-green-600">Saved</span>
        </div>
      </div>

      {/* 设计工具组 */}
      <div className="flex items-center gap-1">
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Undo (⌘Z)" onMouseDown={(e) => e.preventDefault()}>
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Redo (⌘⇧Z)" disabled onMouseDown={(e) => e.preventDefault()}>
          <Redo2 className="w-4 h-4 opacity-50" />
        </Button>
        <div className="w-px h-4 bg-gray-200 mx-2" />
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Snap to grid" onMouseDown={(e) => e.preventDefault()}>
          <Grid3X3 className="w-4 h-4" />
        </Button>
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Show section contents" onMouseDown={(e) => e.preventDefault()}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Always show labels" onMouseDown={(e) => e.preventDefault()}>
          <Type className="w-4 h-4" />
        </Button>
      </div>

      {/* 帮助按钮 */}
      <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" onMouseDown={(e) => e.preventDefault()}>
        <HelpCircle className="w-4 h-4" />
      </Button>
    </header>
  );
};
