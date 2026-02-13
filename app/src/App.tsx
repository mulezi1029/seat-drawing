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

function App() {
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

  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Handlers
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'image/svg+xml') {
      handleSvgUpload(file);
    }
  }, [handleSvgUpload]);

  const handleModeChange = useCallback((mode: typeof editorState.mode) => {
    if (mode === 'draw-section') {
      startSectionDrawing();
    } else {
      setMode(mode);
    }
  }, [startSectionDrawing, setMode]);

  const handleCompleteSection = useCallback((name: string) => {
    completeSectionDrawing(name);
    setShowSectionDialog(false);
  }, [completeSectionDrawing]);

  const handleZoomIn = useCallback(() => {
    // 每次方法 10%
    setZoom(editorState.zoom * 1.1);
  }, [editorState.zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(editorState.zoom / 1.1);
  }, [editorState.zoom, setZoom]);

  const handleZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, [setZoom]);

  const handleZoom = useCallback((delta: number, _center: Point) => {
    const newZoom = Math.max(0.1, Math.min(5, editorState.zoom * delta));
    setZoom(newZoom);
  }, [editorState.zoom, setZoom]);

  const handlePan = useCallback((delta: Point) => {
    setPan(delta);
  }, [setPan]);

  const handleAddSeat = useCallback((sectionId: string, point: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const seatCount = section.seats.length;
    const row = String.fromCharCode(65 + Math.floor(seatCount / 20));
    const number = (seatCount % 20) + 1;
    
    addSeat(sectionId, point, row, number);
  }, [venueMap.sections, addSeat]);

  const handleAddSeatsInRow = useCallback((sectionId: string, start: Point, end: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const seatCount = section.seats.length;
    const row = String.fromCharCode(65 + Math.floor(seatCount / 20));
    const startNumber = (seatCount % 20) + 1;
    
    addSeatsInRow(sectionId, start, end, row, startNumber);
  }, [venueMap.sections, addSeatsInRow]);

  const handleAddSeatsAlongLine = useCallback((sectionId: string, points: Point[]) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const seatCount = section.seats.length;
    const rowPrefix = String.fromCharCode(65 + Math.floor(seatCount / 20));
    const startNumber = (seatCount % 20) + 1;
    
    addSeatsAlongLine(sectionId, points, rowPrefix, startNumber);
  }, [venueMap.sections, addSeatsAlongLine]);

  const handleSelectSeat = useCallback((seatId: string, multi: boolean) => {
    if (multi) {
      const newSelection = editorState.selectedSeatIds.includes(seatId)
        ? editorState.selectedSeatIds.filter(id => id !== seatId)
        : [...editorState.selectedSeatIds, seatId];
      selectSeats(newSelection);
    } else {
      selectSeats([seatId]);
    }
  }, [editorState.selectedSeatIds, selectSeats]);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Venue Seat Designer</h1>
            <p className="text-xs text-slate-500">
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

      {/* Toolbar */}
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sections */}
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
        
        {/* Toggle Left Panel */}
        <button
          className="w-6 bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-x flex-shrink-0"
          onClick={() => setShowLeftPanel(!showLeftPanel)}
        >
          {showLeftPanel ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Canvas */}
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

          {/* Mode Indicator */}
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

          {/* Instructions */}
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

        {/* Toggle Right Panel */}
        <button
          className="w-6 bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-x flex-shrink-0"
          onClick={() => setShowRightPanel(!showRightPanel)}
        >
          {showRightPanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Right Panel - Seats */}
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

      {/* Dialogs */}
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

      {/* Help Dialog */}
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
