/**
 * 场馆座位绘制功能 - 主应用组件
 *
 * 这是整个应用的根组件，负责：
 * - 组织所有子组件的布局
 * - 管理全局状态（通过 useVenueDesignerNew hook）
 * - 处理键盘快捷键（撤销/重做）
 * - 协调各个功能模块的交互
 *
 * 布局结构（参照 seats.io）：
 * - 顶部：应用头部 (header) - 文件操作、编辑操作
 * - 主内容区：
 *   - 左侧：工具栏 (Toolbar) - 绘制工具
 *   - 中央：SVG 绘制画布 (SVGCanvas)
 *   - 右侧：属性面板 (PropertiesPanel) - 区域列表或座位编辑
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useVenueDesignerNew } from '@/hooks/useVenueDesignerNew';
import { Canvas } from '@/components/canvas';
import { Toolbar } from '@/components/Toolbar';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { CategoryPanel } from '@/components/CategoryPanel';
import { BottomStatusBar } from '@/components/BottomStatusBar';
import { SectionNameDialog } from '@/components/SectionNameDialog';
import { DataDialog } from '@/components/DataDialog';
import { ConfigDialog } from '@/components/ConfigDialog';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  MousePointer2,
  Info,
  Keyboard,
  ChevronRight,
  ChevronLeft,
  Upload,
  Download,
  FolderOpen,
  Undo2,
  Redo2
} from 'lucide-react';

import type { Point, Seat } from '@/types';

import './App.css';
/**
 * 主应用组件
 */
function App() {
  /**
   * 从 useVenueDesignerNew hook 获取所有需要的状态和操作函数
   * 这个 hook 包含了应用的核心业务逻辑
   */
  const {
    venueMap,
    editorState,
    drawConfig,
    viewConfig,
    categories,
    sectionCanvas,
    fileInputRef,
    currentSection,
    canUndo,
    canRedo,
    handleSvgUpload,
    triggerFileUpload,
    setMode,
    setSeatTool,
    undo,
    redo,
    addSectionPoint,
    removeLastSectionPoint,
    completeSectionDrawing,
    cancelDrawing,
    setSelectedSectionId,
    enterSection,
    exitSection,
    deleteSection,
    updateSection,
    addSeat,
    addSeatsInRow,
    addSeatsAlongLine,
    deleteSeat,
    updateSeat,
    moveSeats,
    nudgeSeats,
    alignSeats,
    selectSeats,
    selectSeatsInArea,
    clearSeatSelection,
    updateDrawConfig,
    updateViewConfig,
    setZoom,
    setPan,
    resetView,
    fitToView,
    exportData,
    importData,
    addCategory,
    updateCategory,
    deleteCategory,
    applyCategoryToSeats,
    applyCategoryToSection,
    canPaste,
    copySelectedSeats,
    cutSelectedSeats,
    pasteSeats,
    executeCommand,
    contentTransform,
    contentSize,
  } = useVenueDesignerNew();

  /**
   * 本地组件状态管理
   * 这些状态只控制 UI 对话框和面板的可见性
   * 不需要保存到撤销/重做历史中
   */
  const [showSectionDialog, setShowSectionDialog] = useState(false);    // 区域名称对话框
  const [showDataDialog, setShowDataDialog] = useState(false);          // 数据导入/导出对话框
  const [showConfigDialog, setShowConfigDialog] = useState(false);      // 配置对话框
  const [showHelp, setShowHelp] = useState(false);                      // 帮助对话框
  const [showRightPanel, setShowRightPanel] = useState(true);           // 右侧面板可见性

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setCanvasSize({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * 键盘快捷键处理
   * 支持：
   * - Ctrl+Z / Cmd+Z：撤销
   * - Ctrl+Y / Cmd+Shift+Z：重做
   * - Ctrl+C / Cmd+C：复制选中座位
   * - Ctrl+X / Cmd+X：剪切选中座位
   * - Ctrl+V / Cmd+V：粘贴座位
   * - Delete / Backspace：删除选中的座位或区域
   * - Escape：取消/清除选择
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查 Ctrl+Z (Windows/Linux) 或 Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        // 如果同时按下 Shift，执行重做；否则执行撤销
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // 检查 Ctrl+Y / Cmd+Y：重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // 检查 Ctrl+C / Cmd+C：复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedSeats();
      }
      // 检查 Ctrl+X / Cmd+X：剪切
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        cutSelectedSeats();
      }
      // 检查 Ctrl+V / Cmd+V：粘贴
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (canPaste) {
          pasteSeats();
        }
      }

      // 检查 Delete 键：删除选中的元素
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 如果正在编辑输入框，不删除
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();

        // 优先删除选中的座位
        if (editorState.selectedSeatIds.length > 0) {
          // 删除所有选中的座位
          editorState.selectedSeatIds.forEach(seatId => {
            deleteSeat(seatId);
          });
          clearSeatSelection();
        }
        // 否则删除选中的区域
        else if (editorState.selectedSectionId) {
          deleteSection(editorState.selectedSectionId);
        }
      }

      // 检查 Escape 键：取消/清除选择
      if (e.key === 'Escape') {
        e.preventDefault();

        // 如果在绘制区域模式，取消绘制
        if (editorState.mode === 'draw-section') {
          cancelDrawing();
        }
        // 如果有选中的座位，清空座位选择
        else if (editorState.selectedSeatIds.length > 0) {
          clearSeatSelection();
        }
        // 如果有选中的区域，清空区域选择
        else if (editorState.selectedSectionId) {
          setSelectedSectionId(null);
        }
        // 如果在编辑区域模式，退出编辑模式
        else if (currentSection) {
          exitSection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copySelectedSeats, cutSelectedSeats, pasteSeats, canPaste, editorState.selectedSeatIds, editorState.selectedSectionId, editorState.mode, deleteSeat, deleteSection, clearSeatSelection, cancelDrawing, setSelectedSectionId, currentSection, exitSection]);

  /**
   * 区域绘制事件监听
   * 处理自动闭合和最大顶点数限制事件
   */
  useEffect(() => {
    const handleAutoClose = () => {
      // 自动闭合时触发显示区域命名对话框
      setShowSectionDialog(true);
    };

    const handleMaxVertices = () => {
      // 达到最大顶点数时显示提示并触发完成对话框
      setShowSectionDialog(true);
    };

    window.addEventListener('section:autoclose', handleAutoClose as EventListener);
    window.addEventListener('section:maxvertices', handleMaxVertices as EventListener);

    return () => {
      window.removeEventListener('section:autoclose', handleAutoClose as EventListener);
      window.removeEventListener('section:maxvertices', handleMaxVertices as EventListener);
    };
  }, []);

  /**
   * ================== 事件处理函数 ==================
   */

  /**
   * 处理 SVG 文件选择
   * 验证选择的文件确实是 SVG 格式
   */
  const onInputFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'image/svg+xml') {
      handleSvgUpload(file);
    }
  }, [handleSvgUpload]);

  /**
   * 处理编辑模式切换
   * 特殊处理：如果选择的是 'draw-section' 模式，
   * 则直接开始绘制而不是仅仅改变模式
   */
  const handleModeChange = useCallback((mode: typeof editorState.mode) => {
    // 当前模式与新模式相同，则直接返回
    if (mode === editorState.mode) {
      return;
    }
    // 使用 setMode 处理模式切换（它会处理 draw-section 的特殊逻辑）
    setMode(mode);
  }, [setMode, editorState]);

  /**
   * 完成区域绘制并保存
   * 获取用户输入的区域名称，调用 completeSectionDrawing 并关闭对话框
   */
  const handleCompleteSection = useCallback((name: string) => {
    completeSectionDrawing(name);
    setShowSectionDialog(false);
  }, [completeSectionDrawing]);

  /**
   * 放大画布
   * 每次放大 10%，以场馆底图中心为基准
   */
  const handleZoomIn = useCallback(() => {
    setZoom(editorState.viewport.scale * 1.1, canvasSize.width / 2, canvasSize.height / 2);
  }, [editorState.viewport.scale, setZoom, canvasSize.width, canvasSize.height]);

  const handleZoomOut = useCallback(() => {
    setZoom(editorState.viewport.scale / 1.1, canvasSize.width / 2, canvasSize.height / 2);
  }, [editorState.viewport.scale, setZoom, canvasSize.width, canvasSize.height]);

  const handleZoomChange = useCallback((zoom: number) => {
    setZoom(zoom, canvasSize.width / 2, canvasSize.height / 2);
  }, [setZoom, canvasSize.width, canvasSize.height]);

  const handleFitToView = useCallback(() => {
    fitToView(canvasSize.width, canvasSize.height);
  }, [fitToView, canvasSize.width, canvasSize.height]);

  /**
   * 处理添加单个座位
   * 自动生成座位的行号和座位号
   */
  const handleAddSeat = useCallback((sectionId: string, point: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;

    // 根据已有座位数量自动生成行号和座位号
    const seatCount = section.seats.length;
    const row = String.fromCharCode(65 + Math.floor(seatCount / 20));  // A, B, C, ...
    const number = (seatCount % 20) + 1;                               // 1-20

    addSeat(sectionId, point, row, number);
  }, [venueMap.sections, addSeat]);

  /**
   * 处理添加一行座位
   */
  const handleAddSeatsInRow = useCallback((sectionId: string, start: Point, end: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;

    const seatCount = section.seats.length;
    const row = String.fromCharCode(65 + Math.floor(seatCount / 20));
    const startNumber = (seatCount % 20) + 1;

    addSeatsInRow(sectionId, start, end, row, startNumber);
  }, [venueMap.sections, addSeatsInRow]);

  /**
   * 处理沿线添加座位
   */
  const handleAddSeatsAlongLine = useCallback((sectionId: string, points: Point[]) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;

    const seatCount = section.seats.length;
    const rowPrefix = String.fromCharCode(65 + Math.floor(seatCount / 20));
    const startNumber = (seatCount % 20) + 1;

    addSeatsAlongLine(sectionId, points, rowPrefix, startNumber);
  }, [venueMap.sections, addSeatsAlongLine]);

  /**
   * 处理座位选择
   * 支持单选和多选（按住 Shift）
   */
  const handleSelectSeat = useCallback((seatId: string, multi?: boolean) => {
    if (multi) {
      // 多选模式：如果已选中则取消，未选中则添加
      const newSelection = editorState.selectedSeatIds.includes(seatId)
        ? editorState.selectedSeatIds.filter(id => id !== seatId)
        : [...editorState.selectedSeatIds, seatId];
      selectSeats(newSelection);
    } else {
      // 单选模式：直接选中该座位
      selectSeats([seatId]);
    }
  }, [editorState.selectedSeatIds, selectSeats]);

  // ========== API 适配器函数 (新旧 Hook API 兼容层) ==========

  /**
   * 适配器：区域框选
   * SVGCanvas 期望: (sectionId, start, end) => void
   * 新 Hook 提供: (area) => void
   */
  const handleSelectSeatsInArea = useCallback((_sectionId: string, start: Point, end: Point) => {
    // 计算区域边界框
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    selectSeatsInArea({ minX, minY, maxX, maxY });
  }, [selectSeatsInArea]);

  /**
   * 适配器：移动座位
   * SVGCanvas 期望: (sectionId, seatIds, delta) => void
   * 新 Hook 提供: (seatIds, deltaX, deltaY) => void
   */
  const handleMoveSeats = useCallback((_sectionId: string, seatIds: string[], delta: Point) => {
    moveSeats(seatIds, delta.x, delta.y);
  }, [moveSeats]);

  /**
   * 适配器：微调座位位置
   * SVGCanvas 期望: (sectionId, seatIds, direction) => void
   * 新 Hook 提供: (seatIds, dx, dy) => void
   */
  const handleNudgeSeats = useCallback((_sectionId: string, seatIds: string[], direction: 'left' | 'right' | 'up' | 'down') => {
    const nudgeAmount = 1;
    let dx = 0, dy = 0;
    switch (direction) {
      case 'left': dx = -nudgeAmount; break;
      case 'right': dx = nudgeAmount; break;
      case 'up': dy = -nudgeAmount; break;
      case 'down': dy = nudgeAmount; break;
    }
    nudgeSeats(seatIds, dx, dy);
  }, [nudgeSeats]);

  /**
   * 适配器：画布平移
   * SVGCanvas 期望: (deltaX, deltaY) => void
   * 新 Hook 提供: ({ x, y }) => void
   */
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    const newOffsetX = editorState.viewport.offsetX - deltaX;
    const newOffsetY = editorState.viewport.offsetY - deltaY;
    setPan({ x: newOffsetX, y: newOffsetY });
  }, [editorState.viewport.offsetX, editorState.viewport.offsetY, setPan]);

  /**
   * 适配器：更新座位属性
   * SVGCanvas 期望: (sectionId, seatId, updates) => void
   * 新 Hook 提供: (seatId, updates) => void
   */
  const handleUpdateSeat = useCallback((_sectionId: string, seatId: string, updates: Partial<Seat>) => {
    updateSeat(seatId, updates);
  }, [updateSeat]);

  /**
   * 适配器：对齐座位
   * SVGCanvas 期望: (sectionId, seatIds, alignType) => void
   * 新 Hook 提供: (seatIds, alignType) => void
   */
  const handleAlignSeats = useCallback((_sectionId: string, seatIds: string[], alignType: string) => {
    alignSeats(seatIds, alignType);
  }, [alignSeats]);

  /**
   * 适配器：导入数据
   * SVGCanvas 期望: (data) => boolean
   * 新 Hook 提供: (data) => void
   */
  const handleImport = useCallback((data: string): boolean => {
    try {
      importData(data);
      return true;
    } catch {
      return false;
    }
  }, [importData]);

  /**
   * ================== 渲染 JSX ==================
   * 布局（参照 seats.io designer）：
   * [header]
   * [toolbar] [canvas] [properties-panel]
   * [status-bar]
   *
   * 修改说明：
   * - 工具栏移到左侧垂直位置
   * - 属性面板在右侧，根据选中目标显示区域列表或座位编辑
   * - 底部添加状态栏
   * - 顶部 Header 包含文件和编辑操作
   */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-white-50 overflow-hidden">
        {/* 界面上不可见的文件输入元素，用于触发系统文件选择对话框 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          onChange={onInputFileChange}
          className="hidden"
        />

        {/* 应用头部：简化为仅显示标题和基本信息 */}
        <header className="bg-white border-b px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base">Venue Designer</h1>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{venueMap.name}</span>
            </div>
          </div>

          {/* 文件操作区 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerFileUpload}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload SVG
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDataDialog(true)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDataDialog(true)}
              className="gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Import
            </Button>

            <div className="w-px h-4 bg-slate-200 mx-2" />

            {/* 编辑操作区 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="gap-2"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="gap-2"
            >
              <Redo2 className="w-4 h-4" />
              Redo
            </Button>

            <div className="w-px h-4 bg-slate-200 mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="gap-2"
            >
              <Info className="w-4 h-4" />
              Help
            </Button>
          </div>
        </header>

        {/* 主内容区域：参照 seats.io 的三栏布局 */}
        <div className="flex-1 flex overflow-hidden">
          <div className="left-panel">
            {/* 左侧工具栏：垂直排列，参照 seats.io */}
            <Toolbar
              mode={editorState.mode}
              seatTool={editorState.seatTool}
              hasSvg={!!venueMap.svgUrl}
              isInSection={editorState.mode === 'draw-seat'}
              onModeChange={handleModeChange}
              onSeatToolChange={setSeatTool}
              onExitSection={exitSection}
              onShowConfig={() => setShowConfigDialog(true)}
            />
          </div>


          {/* 中央画布区域：包含 SVG 画布和状态指示器（overflow scroll 架构） */}
          <div ref={canvasContainerRef} className="flex-1 relative overflow-auto">
            <Canvas
              venueMap={venueMap}
              width={canvasSize.width}
              height={canvasSize.height}
              mode={editorState.mode}
              seatTool={editorState.seatTool}
              viewport={editorState.viewport}
              drawingPoints={editorState.drawingPoints}
              viewConfig={viewConfig}
              selectedSectionId={editorState.selectedSectionId}
              selectedSeatIds={editorState.selectedSeatIds}
              seatRadius={drawConfig.seatRadius}
              seatSpacing={drawConfig.seatSpacing}
              categories={categories}
              sectionCanvas={sectionCanvas}
              contentTransform={contentTransform}
              contentSize={contentSize}
              onAddSectionPoint={addSectionPoint}
              onRemoveLastSectionPoint={removeLastSectionPoint}
              onCompleteSection={() => setShowSectionDialog(true)}
              onCancelDrawing={cancelDrawing}
              onEnterSection={enterSection}
              onSetSelectedSectionId={setSelectedSectionId}
              onAddSeat={handleAddSeat}
              onAddSeatsInRow={handleAddSeatsInRow}
              onAddSeatsAlongLine={handleAddSeatsAlongLine}
              onSelectSeat={handleSelectSeat}
              onSelectSeatsInArea={handleSelectSeatsInArea}
              onMoveSeats={handleMoveSeats}
              onNudgeSeats={handleNudgeSeats}
              onDeleteSeat={deleteSeat}
              onDeleteSection={deleteSection}
              onPan={handlePan}
              onZoom={setZoom}
              onSetMode={setMode}
              onSetPan={setPan}
              onExecuteCommand={executeCommand}
            />

            {/* 模式指示器 - 绝对定位在画布上方 */}
            {editorState.mode === 'draw-section' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" />
                <span className="font-medium">Drawing Section</span>
                <span className="text-blue-200 text-sm">
                  ({editorState.drawingPoints.length} points)
                </span>
              </div>
            )}
            {editorState.mode === 'draw-seat' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">
                  Editing: {currentSection?.name}
                </span>
                <span className="text-green-200 text-sm capitalize">
                  ({editorState.seatTool} tool)
                </span>
              </div>
            )}

            {/* 未上传 SVG 文件时的提示：上传 SVG 文件 */}
            {!venueMap.svgUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-8 py-6 rounded-2xl shadow-xl text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Welcome to Venue Seat Designer</h2>
                  <p className="text-slate-500 mb-4 max-w-md">
                    Upload an SVG floor plan of your venue to get started.
                    Then you can draw sections and add seats.
                  </p>
                  <Button onClick={triggerFileUpload} size="lg" className="pointer-events-auto">
                    <MapPin className="w-4 h-4 mr-2" />
                    Upload Venue SVG
                  </Button>
                </div>
              </div>
            )}

            {/* 底部状态栏：参照 seats.io 布局，固定在底部 */}
            <div className="absolute bottom-0 left-0 right-0">
              <BottomStatusBar
                zoom={editorState.viewport.scale}
                mode={editorState.mode}
                selectedSeatCount={editorState.selectedSeatIds.length}
                totalSeatCount={venueMap.sections.reduce((sum, s) => sum + s.seats.length, 0)}
                sectionCount={venueMap.sections.length}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomChange={handleZoomChange}
                onFitToView={handleFitToView}
                onResetView={resetView}
              />
            </div>
          </div>

          <div className="right-panel">
            {/* 右侧面板的切换按钮 */}
            <button
              className="w-6 bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-x flex-shrink-0"
              onClick={() => setShowRightPanel(!showRightPanel)}
            >
              {showRightPanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* 右侧面板：根据选中目标显示不同内容 */}
            {showRightPanel && (
              <div className="h-full overflow-hidden flex flex-col w-80">
                {/* 属性面板 - 根据选中状态显示区域列表/区域属性/座位编辑 */}
                <div className="flex-1 overflow-hidden">
                  <PropertiesPanel
                    sections={venueMap.sections}
                    selectedSectionId={editorState.selectedSectionId}
                    currentSection={currentSection}
                    selectedSeatIds={editorState.selectedSeatIds}
                    categories={categories}
                    onEnterSection={enterSection}
                    onDeleteSection={deleteSection}
                    onUpdateSection={updateSection}
                    onUpdateSeat={handleUpdateSeat}
                    onDeleteSeat={deleteSeat}
                    onClearSelection={clearSeatSelection}
                    onAlignSeats={handleAlignSeats}
                    onApplyCategoryToSeats={applyCategoryToSeats}
                  />
                </div>
                {/* 类别管理面板 - 仅在进入区域编辑模式或选中区域时显示 */}
                {(currentSection || editorState.selectedSectionId) && (
                  <div className="h-auto max-h-1/2 overflow-hidden border-t">
                    <CategoryPanel
                      categories={categories}
                      currentSection={currentSection}
                      selectedSectionId={editorState.selectedSectionId}
                      selectedSeatIds={editorState.selectedSeatIds}
                      onAddCategory={addCategory}
                      onUpdateCategory={updateCategory}
                      onDeleteCategory={deleteCategory}
                      onApplyToSeats={(categoryId) => applyCategoryToSeats(categoryId, editorState.selectedSeatIds)}
                      onApplyToSection={(categoryId, sectionId) => applyCategoryToSection(categoryId, sectionId)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 对话框：区域名称、数据导入/导出、配置 */}
        <SectionNameDialog
          isOpen={showSectionDialog}
          onClose={() => {
            setShowSectionDialog(false);
            cancelDrawing();
          }}
          onConfirm={handleCompleteSection}
          pointCount={editorState.drawingPoints.length}
        />

        <DataDialog
          isOpen={showDataDialog}
          onClose={() => setShowDataDialog(false)}
          exportData={exportData()}
          onImport={handleImport}
        />

        <ConfigDialog
          isOpen={showConfigDialog}
          onClose={() => setShowConfigDialog(false)}
          drawConfig={drawConfig}
          viewConfig={viewConfig}
          onUpdateDrawConfig={updateDrawConfig}
          onUpdateViewConfig={updateViewConfig}
        />

        {/* 帮助对话框 */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Shortcuts & Help
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>
                  ✕
                </Button>
              </div>
              <div className="p-6 space-y-6">
                <section>
                  <h3 className="font-semibold mb-3">Getting Started</h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600">
                    <li>Upload your venue SVG floor plan</li>
                    <li>Click "Draw Section" to create seating areas</li>
                    <li>Click on the canvas to draw polygon points</li>
                    <li>Double-click or press Enter to complete the section</li>
                    <li>Click "Enter" on a section to add seats</li>
                  </ol>
                </section>

                <section>
                  <h3 className="font-semibold mb-3">Canvas Navigation</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li><strong>Pan tool:</strong> Click "Pan" button or hold Space + drag</li>
                    <li><strong>Zoom:</strong> Use +/- buttons or mouse wheel</li>
                    <li><strong>Fit to view:</strong> Click view options menu</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold mb-3">Seat Tools (in Section)</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li><strong>Select (V):</strong> Click to select, drag to move, box select multiple</li>
                    <li><strong>Single (S):</strong> Click to place individual seats</li>
                    <li><strong>Row (R):</strong> Click and drag to create a row of seats</li>
                    <li><strong>Line (L):</strong> Click multiple points to create seats along a path</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Ctrl+Z</span>
                      <span className="text-slate-500">Undo</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Ctrl+Y / Ctrl+Shift+Z</span>
                      <span className="text-slate-500">Redo</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Space + Drag</span>
                      <span className="text-slate-500">Pan canvas</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Arrow Keys</span>
                      <span className="text-slate-500">Nudge selected seats</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Shift + Arrow</span>
                      <span className="text-slate-500">Nudge 10px</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Escape</span>
                      <span className="text-slate-500">Cancel / Clear selection</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Delete</span>
                      <span className="text-slate-500">Delete selected</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>V / S / R / L</span>
                      <span className="text-slate-500">Switch tools</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Ctrl+C</span>
                      <span className="text-slate-500">Copy selected seats</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Ctrl+X</span>
                      <span className="text-slate-500">Cut selected seats</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>Ctrl+V</span>
                      <span className="text-slate-500">Paste seats</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export default App;
