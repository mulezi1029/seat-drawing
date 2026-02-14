/**
 * 场馆座位绘制功能 - 主应用组件
 *
 * 这是整个应用的根组件，负责：
 * - 组织所有子组件的布局
 * - 管理全局状态（通过 useVenueDesigner hook）
 * - 处理键盘快捷键（撤销/重做）
 * - 协调各个功能模块的交互
 *
 * 布局结构：
 * - 顶部：应用头部 (header)
 * - 中间：工具栏 (Toolbar)
 * - 主内容区：
 *   - 左侧：区域面板 (SectionPanel)
 *   - 中央：SVG 绘制画布 (SVGCanvas)
 *   - 右侧：座位信息面板 (SeatPanel)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useVenueDesigner } from '@/hooks/useVenueDesigner';
import { SVGCanvas } from '@/components/canvas/SVGCanvas';
import { Toolbar } from '@/components/Toolbar';
import { SectionPanel } from '@/components/SectionPanel';
import { SeatPanel } from '@/components/SeatPanel';
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
  ChevronLeft
} from 'lucide-react';
import type { Point } from '@/types';

/**
 * 主应用组件
 */
function App() {
  /**
   * 从 useVenueDesigner hook 获取所有需要的状态和操作函数
   * 这个 hook 包含了应用的核心业务逻辑
   */
  const {
    venueMap,
    editorState,
    drawConfig,
    viewConfig,
    fileInputRef,
    currentSection,
    canUndo,
    canRedo,
    handleSvgUpload,
    triggerFileUpload,
    setMode,
    setSeatTool,
    setCanvasTool,
    undo,
    redo,
    startSectionDrawing,
    addSectionPoint,
    completeSectionDrawing,
    cancelDrawing,
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
  } = useVenueDesigner();

  /**
   * 本地组件状态管理
   * 这些状态只控制 UI 对话框和面板的可见性
   * 不需要保存到撤销/重做历史中
   */
  const [showSectionDialog, setShowSectionDialog] = useState(false);    // 区域名称对话框
  const [showDataDialog, setShowDataDialog] = useState(false);          // 数据导入/导出对话框
  const [showConfigDialog, setShowConfigDialog] = useState(false);      // 配置对话框
  const [showHelp, setShowHelp] = useState(false);                      // 帮助对话框
  const [showLeftPanel, setShowLeftPanel] = useState(true);             // 左侧面板可见性
  const [showRightPanel, setShowRightPanel] = useState(true);           // 右侧面板可见性

  /**
   * 键盘快捷键处理
   * 支持：
   * - Ctrl+Z / Cmd+Z：撤销
   * - Ctrl+Y / Cmd+Shift+Z：重做
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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
    console.log('handleModeChange', mode, editorState.mode);
    // 当前模式与新模式相同，则直接返回
    if (mode === editorState.mode) {
      return;
    }
    // 如果新模式是绘制 section，则直接开始绘制 section
    if (mode === 'draw-section') {
      startSectionDrawing();
    } else {
      setMode(mode);
    }
  }, [startSectionDrawing, setMode, editorState]);

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
    // 每次放大 10%，以底图中心为基准
    setZoom(editorState.zoom * 1.1, undefined);
  }, [editorState.zoom, setZoom]);

  /**
   * 缩小画布
   * 每次缩小 10%，以场馆底图中心为基准
   */
  const handleZoomOut = useCallback(() => {
    // 每次缩小 10%，以底图中心为基准
    setZoom(editorState.zoom / 1.1, undefined);
  }, [editorState.zoom, setZoom]);

  /**
   * 改变缩放级别
   * 直接设置到指定的缩放值
   */
  const handleZoomChange = useCallback((zoom: number) => {
    setZoom(zoom, undefined);
  }, [setZoom]);

  /**
   * 处理鼠标滚轮缩放
   * 以鼠标位置为中心进行缩放
   */
  const handleZoom = useCallback((delta: number, center: Point) => {
    const newZoom = Math.max(1, Math.min(10, editorState.zoom * delta));
    setZoom(newZoom, center);
  }, [editorState.zoom, setZoom]);

  /**
   * 处理画布平移
   */
  const handlePan = useCallback((delta: Point) => {
    setPan(delta);
  }, [setPan]);

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
  const handleSelectSeat = useCallback((seatId: string, multi: boolean) => {
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

  /**
   * ================== 渲染 JSX ==================
   * 布局：
   * [header]
   * [toolbar]
   * [left-panel] [canvas] [right-panel]
   */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* 界面上不可见的文件输入元素，用于触发系统文件选择对话框，注册 onChange 事件，调用 onInputFileChange 处理文件选择 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={onInputFileChange}
        className="hidden"
      />

      {/* 应用头部：显示标题、场馆名称和帮助按钮 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Venue Seat Designer</h1>
            <p className="text-xs text-slate-500">
              {/* 显示场馆名称和区域数量 */}
              {venueMap.name} • {venueMap.sections.length} sections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* 工具栏：包含文件操作、编辑工具、视图控制等 */}
      <Toolbar
        mode={editorState.mode}
        seatTool={editorState.seatTool}
        canvasTool={editorState.canvasTool}
        hasSvg={!!venueMap.svgUrl}
        isInSection={editorState.mode === 'draw-seat'}
        zoom={editorState.zoom}
        viewConfig={viewConfig}
        canUndo={canUndo}
        canRedo={canRedo}
        onUploadClick={triggerFileUpload}
        onModeChange={handleModeChange}
        onSeatToolChange={setSeatTool}
        onCanvasToolChange={setCanvasTool}
        onExitSection={exitSection}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomChange={handleZoomChange}
        onResetView={resetView}
        onFitToView={fitToView}
        onExport={() => setShowDataDialog(true)}
        onImport={() => setShowDataDialog(true)}
        onUndo={undo}
        onRedo={redo}
        onShowConfig={() => setShowConfigDialog(true)}
        onToggleGrid={() => updateViewConfig({ showGrid: !viewConfig.showGrid })}
        onToggleSnap={() => updateViewConfig({ snapToGrid: !viewConfig.snapToGrid })}
      />

      {/* 主内容区域：三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板：显示所有区域的信息 */}
        {showLeftPanel && (
          <div className="h-full overflow-hidden">
            <SectionPanel
              sections={venueMap.sections}
              selectedSectionId={editorState.selectedSectionId}
              onEnterSection={enterSection}
              onDeleteSection={deleteSection}
              onUpdateSection={updateSection}
            />
          </div>
        )}

        {/* 左侧面板的切换按钮 */}
        <button
          className="w-6 bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-x flex-shrink-0"
          onClick={() => setShowLeftPanel(!showLeftPanel)}
        >
          {showLeftPanel ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* 中央：SVG 绘制画布 */}
        <div className="flex-1 relative overflow-hidden">
          <SVGCanvas
            svgUrl={venueMap.svgUrl}
            sections={venueMap.sections}
            width={venueMap.width}
            height={venueMap.height}
            mode={editorState.mode}
            selectedSectionId={editorState.selectedSectionId}
            selectedSeatIds={editorState.selectedSeatIds}
            seatTool={editorState.seatTool}
            canvasTool={editorState.canvasTool}
            zoom={editorState.zoom}
            pan={editorState.pan}
            drawingPoints={editorState.drawingPoints}
            viewConfig={viewConfig}
            seatRadius={drawConfig.seatRadius}
            seatSpacing={drawConfig.seatSpacing}
            onAddSectionPoint={addSectionPoint}
            onCompleteSection={() => setShowSectionDialog(true)}
            onCancelDrawing={cancelDrawing}
            onEnterSection={enterSection}
            onAddSeat={handleAddSeat}
            onAddSeatsInRow={handleAddSeatsInRow}
            onAddSeatsAlongLine={handleAddSeatsAlongLine}
            onSelectSeat={handleSelectSeat}
            onSelectSeatsInArea={selectSeatsInArea}
            onMoveSeats={moveSeats}
            onNudgeSeats={nudgeSeats}
            onDeleteSeat={deleteSeat}
            onPan={handlePan}
            onZoom={handleZoom}
          />

          {/* 模式指示器：显示当前模式和绘制点的数量 */}
          <div className="absolute top-4 left-4 pointer-events-none">
            {editorState.mode === 'draw-section' && (
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" />
                <span className="font-medium">Drawing Section</span>
                <span className="text-blue-200 text-sm">
                  ({editorState.drawingPoints.length} points)
                </span>
              </div>
            )}
            {editorState.mode === 'draw-seat' && (
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">
                  Editing: {currentSection?.name}
                </span>
                <span className="text-green-200 text-sm capitalize">
                  ({editorState.seatTool} tool)
                </span>
              </div>
            )}
          </div>

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
        </div>

        {/* 右侧面板的切换按钮 */}
        <button
          className="w-6 bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-x flex-shrink-0"
          onClick={() => setShowRightPanel(!showRightPanel)}
        >
          {showRightPanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* 右侧面板：显示座位信息 */}
        {showRightPanel && (
          <div className="h-full overflow-hidden">
            <SeatPanel
              section={currentSection}
              selectedSeatIds={editorState.selectedSeatIds}
              onUpdateSeat={updateSeat}
              onDeleteSeat={deleteSeat}
              onClearSelection={clearSeatSelection}
              onAlignSeats={alignSeats}
            />
          </div>
        )}
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
        onImport={importData}
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
