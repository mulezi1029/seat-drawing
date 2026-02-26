/**
 * 顶部工具栏
 *
 * 包含：文档操作、设计工具、导入导出、帮助
 */

import React, { useRef } from 'react';
import { Undo2, Redo2, Grid3X3, Eye, Type, HelpCircle, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PanelTopProps {
  /** 场馆名称 */
  venueName?: string;
  /** 是否已保存 */
  isSaved?: boolean;
  /** 导出数据回调 */
  onExport?: () => void;
  /** 导入数据回调 */
  onImport?: (file: File) => void;
}

export const PanelTop: React.FC<PanelTopProps> = ({
  venueName = 'Untitled chart',
  isSaved = true,
  onExport,
  onImport,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-12 bg-white border-b flex items-center px-4 justify-between flex-shrink-0">
      {/* 隐藏的文件输入 */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 文档操作组 */}
      <div className="flex items-center gap-2">
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
          <span className="text-lg">×</span>
        </Button>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{venueName}</span>
          <span className={`text-xs ${isSaved ? 'text-green-600' : 'text-orange-600'}`}>
            {isSaved ? 'Saved' : 'Unsaved changes'}
          </span>
        </div>
      </div>

      {/* 设计工具组 */}
      <div className="flex items-center gap-1">
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Undo (⌘Z)" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Redo (⌘⇧Z)" disabled onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
          <Redo2 className="w-4 h-4 opacity-50" />
        </Button>
        <div className="w-px h-4 bg-gray-200 mx-2" />
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Snap to grid" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
          <Grid3X3 className="w-4 h-4" />
        </Button>
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Show section contents" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" title="Always show labels" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
          <Type className="w-4 h-4" />
        </Button>
        <div className="w-px h-4 bg-gray-200 mx-2" />
        <Button 
          tabIndex={-1} 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" 
          title="导入数据 (Import)" 
          onClick={handleImportClick}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        >
          <Upload className="w-4 h-4" />
        </Button>
        <Button 
          tabIndex={-1} 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" 
          title="导出数据 (Export)" 
          onClick={onExport}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* 帮助按钮 */}
      <Button tabIndex={-1} variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
        <HelpCircle className="w-4 h-4" />
      </Button>
    </header>
  );
};
