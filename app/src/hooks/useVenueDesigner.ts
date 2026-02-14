import { useState, useCallback, useRef, useEffect } from 'react';
import { useUndoRedo } from './useUndoRedo';
import type { 
  VenueMap, 
  Section, 
  Seat, 
  Point, 
  EditorState, 
  EditorMode, 
  SeatTool,
  CanvasTool,
  DrawConfig,
  ViewConfig,
  AlignType
} from '@/types';

const generateId = () => crypto.randomUUID();

// Check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calculate distance from point to line segment
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len2 = dx * dx + dy * dy;
  
  if (len2 === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

// Snap value to grid
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

const defaultDrawConfig: DrawConfig = {
  seatRadius: 8,
  seatSpacing: 20,
  rowSpacing: 25,
  defaultColor: '#3b82f6',
  sectionOpacity: 0.8,
};

const defaultViewConfig: ViewConfig = {
  showGrid: true,
  gridSize: 20,
  gridColor: '#e2e8f0',
  backgroundColor: '#f8fafc',
  snapToGrid: false,
};

const defaultEditorState: EditorState = {
  mode: 'view',
  selectedSectionId: null,
  selectedSeatIds: [],
  seatTool: 'select',
  canvasTool: 'auto',
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDrawing: false,
  drawingPoints: [],
  tempLine: null,
};

const initialVenueMap: VenueMap = {
  id: generateId(),
  name: 'New Venue',
  svgUrl: null,
  svgContent: null,
  sections: [],
  width: 800,
  height: 600,
};

export function useVenueDesigner() {
  const { 
    state: venueMap, 
    setState: setVenueMap, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoRedo(initialVenueMap);

  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);
  const [drawConfig, setDrawConfig] = useState<DrawConfig>(defaultDrawConfig);
  const [viewConfig, setViewConfig] = useState<ViewConfig>(defaultViewConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for accessing latest config values in callbacks
  const drawConfigRef = useRef(drawConfig);
  const viewConfigRef = useRef(viewConfig);
  
  useEffect(() => {
    drawConfigRef.current = drawConfig;
  }, [drawConfig]);
  
  useEffect(() => {
    viewConfigRef.current = viewConfig;
  }, [viewConfig]);

  // SVG Upload
  const handleSvgUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const blob = new Blob([content], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Parse SVG to get dimensions
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      const width = parseInt(svg?.getAttribute('width') || '800');
      const height = parseInt(svg?.getAttribute('height') || '600');
      
      setVenueMap(prev => ({
        ...prev,
        svgUrl: url,
        svgContent: content,
        width,
        height,
      }));
    };
    reader.readAsText(file);
  }, [setVenueMap]);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Mode Management
  const setMode = useCallback((mode: EditorMode) => {
    setEditorState(prev => ({
      ...prev,
      mode,
      isDrawing: false,
      drawingPoints: [],
      tempLine: null,
    }));
  }, []);

  const setSeatTool = useCallback((tool: SeatTool) => {
    setEditorState(prev => ({
      ...prev,
      seatTool: tool,
      isDrawing: false,
      drawingPoints: [],
      tempLine: null,
    }));
  }, []);

  const setCanvasTool = useCallback((tool: CanvasTool) => {
    setEditorState(prev => ({
      ...prev,
      canvasTool: tool,
    }));
  }, []);

  // Section Management
  // 开始绘制 section
  const startSectionDrawing = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      mode: 'draw-section',
      isDrawing: true,
      drawingPoints: [],  // 记录绘制点的数组
    }));
  }, []);

  // 添加 section 点
  const addSectionPoint = useCallback((point: Point) => {
    // Get current config values (not from closure)
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;
    
    // Snap to grid if enabled
    const finalPoint = snapEnabled 
      ? { x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) }
      : point;
    
    setEditorState(prev => ({
      ...prev,
      drawingPoints: [...prev.drawingPoints, finalPoint],
    }));
  }, []);

  const completeSectionDrawing = useCallback((name: string) => {
    if (editorState.drawingPoints.length < 3) return;

    const newSection: Section = {
      id: generateId(),
      name,
      points: editorState.drawingPoints,
      color: drawConfig.defaultColor,
      seats: [],
      opacity: drawConfig.sectionOpacity,
    };

    setVenueMap(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setEditorState(prev => ({
      ...prev,
      mode: 'view',
      isDrawing: false,
      drawingPoints: [],
    }));
  }, [editorState.drawingPoints, drawConfig, setVenueMap]);

  const cancelDrawing = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      isDrawing: false,
      drawingPoints: [],
      tempLine: null,
    }));
  }, []);

  const enterSection = useCallback((sectionId: string) => {
    setEditorState(prev => ({
      ...prev,
      mode: 'draw-seat',
      selectedSectionId: sectionId,
      seatTool: 'select',
    }));
  }, []);

  const exitSection = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      mode: 'view',
      selectedSectionId: null,
      selectedSeatIds: [],
    }));
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    }));
    if (editorState.selectedSectionId === sectionId) {
      exitSection();
    }
  }, [editorState.selectedSectionId, exitSection, setVenueMap]);

  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  }, [setVenueMap]);

  // Seat Management
  const addSeat = useCallback((sectionId: string, point: Point, row: string, number: number) => {
    // Check if point is inside the section
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section || !isPointInPolygon(point, section.points)) {
      return null;
    }

    // Get current config values (not from closure)
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    // Snap to grid if enabled
    const finalPoint = snapEnabled 
      ? { x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) }
      : point;

    const newSeat: Seat = {
      id: generateId(),
      x: finalPoint.x,
      y: finalPoint.y,
      row,
      number,
      status: 'available',
      sectionId,
    };

    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, seats: [...s.seats, newSeat] }
          : s
      ),
    }));

    return newSeat.id;
  }, [venueMap.sections, setVenueMap]);

  const addSeatsInRow = useCallback((sectionId: string, startPoint: Point, endPoint: Point, row: string, startNumber: number) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    // Get current config values (not from closure)
    const currentSpacing = drawConfigRef.current.seatSpacing;
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const seatCount = Math.floor(distance / currentSpacing) + 1;
    
    const newSeats: Seat[] = [];
    let seatNumber = startNumber;
    
    for (let i = 0; i < seatCount; i++) {
      const t = i / Math.max(seatCount - 1, 1);
      let x = startPoint.x + dx * t;
      let y = startPoint.y + dy * t;
      
      // Snap to grid if enabled
      if (snapEnabled) {
        x = snapToGrid(x, gridSize);
        y = snapToGrid(y, gridSize);
      }
      
      const point = { x, y };
      
      // Only add seat if it's inside the section
      if (isPointInPolygon(point, section.points)) {
        newSeats.push({
          id: generateId(),
          x,
          y,
          row,
          number: seatNumber++,
          status: 'available',
          sectionId,
        });
      }
    }

    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, seats: [...s.seats, ...newSeats] }
          : s
      ),
    }));

    return newSeats.map(s => s.id);
  }, [venueMap.sections, setVenueMap]);

  const addSeatsAlongLine = useCallback((sectionId: string, points: Point[], rowPrefix: string, startNumber: number) => {
    if (points.length < 2) return [];

    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    // Get current config values (not from closure)
    const currentSpacing = drawConfigRef.current.seatSpacing;
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    const newSeats: Seat[] = [];
    let currentNumber = startNumber;
    let rowIndex = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const seatCount = Math.floor(distance / currentSpacing) + 1;

      for (let j = 0; j < seatCount; j++) {
        const t = j / Math.max(seatCount - 1, 1);
        let x = start.x + dx * t;
        let y = start.y + dy * t;
        
        // Snap to grid if enabled
        if (snapEnabled) {
          x = snapToGrid(x, gridSize);
          y = snapToGrid(y, gridSize);
        }
        
        const point = { x, y };
        
        // Only add seat if it's inside the section
        if (isPointInPolygon(point, section.points)) {
          newSeats.push({
            id: generateId(),
            x,
            y,
            row: `${rowPrefix}${rowIndex + 1}`,
            number: currentNumber++,
            status: 'available',
            sectionId,
          });
        }
      }
      rowIndex++;
    }

    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, seats: [...s.seats, ...newSeats] }
          : s
      ),
    }));

    return newSeats.map(s => s.id);
  }, [venueMap.sections, setVenueMap]);

  const deleteSeat = useCallback((sectionId: string, seatId: string) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, seats: s.seats.filter(seat => seat.id !== seatId) }
          : s
      ),
    }));
  }, [setVenueMap]);

  const updateSeat = useCallback((sectionId: string, seatId: string, updates: Partial<Seat>) => {
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              seats: s.seats.map(seat => 
                seat.id === seatId ? { ...seat, ...updates } : seat
              )
            }
          : s
      ),
    }));
  }, [setVenueMap]);

  // Move seats (drag functionality)
  const moveSeats = useCallback((sectionId: string, seatIds: string[], delta: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Get current config values (not from closure)
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              seats: s.seats.map(seat => {
                if (!seatIds.includes(seat.id)) return seat;
                let newX = seat.x + delta.x;
                let newY = seat.y + delta.y;
                
                // Snap to grid if enabled
                if (snapEnabled) {
                  newX = snapToGrid(newX, gridSize);
                  newY = snapToGrid(newY, gridSize);
                }
                
                // Only move if still inside section
                if (isPointInPolygon({ x: newX, y: newY }, section.points)) {
                  return { ...seat, x: newX, y: newY };
                }
                return seat;
              })
            }
          : s
      ),
    }));
  }, [venueMap.sections, setVenueMap]);

  // Nudge seats with arrow keys
  const nudgeSeats = useCallback((sectionId: string, seatIds: string[], direction: 'up' | 'down' | 'left' | 'right') => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section || seatIds.length === 0) return;

    // Use grid size as step if snap is enabled, otherwise use 1px
    const step = viewConfigRef.current.snapToGrid ? viewConfigRef.current.gridSize : 1;

    const delta = {
      up: { x: 0, y: -step },
      down: { x: 0, y: step },
      left: { x: -step, y: 0 },
      right: { x: step, y: 0 },
    }[direction];

    moveSeats(sectionId, seatIds, delta);
  }, [venueMap.sections, moveSeats]);

  // Align seats
  const alignSeats = useCallback((sectionId: string, seatIds: string[], alignType: AlignType) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section || seatIds.length === 0) return;

    const selectedSeats = section.seats.filter(s => seatIds.includes(s.id));
    if (selectedSeats.length === 0) return;

    // Get current config values (not from closure)
    const snapEnabled = viewConfigRef.current.snapToGrid;
    const gridSize = viewConfigRef.current.gridSize;

    let updates: { id: string; x?: number; y?: number }[] = [];

    switch (alignType) {
      case 'left': {
        const minX = Math.min(...selectedSeats.map(s => s.x));
        updates = selectedSeats.map(s => ({ id: s.id, x: snapEnabled ? snapToGrid(minX, gridSize) : minX }));
        break;
      }
      case 'center': {
        const minX = Math.min(...selectedSeats.map(s => s.x));
        const maxX = Math.max(...selectedSeats.map(s => s.x));
        const centerX = (minX + maxX) / 2;
        updates = selectedSeats.map(s => ({ id: s.id, x: snapEnabled ? snapToGrid(centerX, gridSize) : centerX }));
        break;
      }
      case 'right': {
        const maxX = Math.max(...selectedSeats.map(s => s.x));
        updates = selectedSeats.map(s => ({ id: s.id, x: snapEnabled ? snapToGrid(maxX, gridSize) : maxX }));
        break;
      }
      case 'top': {
        const minY = Math.min(...selectedSeats.map(s => s.y));
        updates = selectedSeats.map(s => ({ id: s.id, y: snapEnabled ? snapToGrid(minY, gridSize) : minY }));
        break;
      }
      case 'middle': {
        const minY = Math.min(...selectedSeats.map(s => s.y));
        const maxY = Math.max(...selectedSeats.map(s => s.y));
        const centerY = (minY + maxY) / 2;
        updates = selectedSeats.map(s => ({ id: s.id, y: snapEnabled ? snapToGrid(centerY, gridSize) : centerY }));
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...selectedSeats.map(s => s.y));
        updates = selectedSeats.map(s => ({ id: s.id, y: snapEnabled ? snapToGrid(maxY, gridSize) : maxY }));
        break;
      }
      case 'distribute-h': {
        const sorted = [...selectedSeats].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x;
        const step = (maxX - minX) / (sorted.length - 1);
        updates = sorted.map((s, i) => ({ 
          id: s.id, 
          x: snapEnabled ? snapToGrid(minX + step * i, gridSize) : minX + step * i 
        }));
        break;
      }
      case 'distribute-v': {
        const sorted = [...selectedSeats].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y;
        const step = (maxY - minY) / (sorted.length - 1);
        updates = sorted.map((s, i) => ({ 
          id: s.id, 
          y: snapEnabled ? snapToGrid(minY + step * i, gridSize) : minY + step * i 
        }));
        break;
      }
    }

    // Apply updates
    setVenueMap(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              seats: s.seats.map(seat => {
                const update = updates.find(u => u.id === seat.id);
                if (update) {
                  const newX = update.x ?? seat.x;
                  const newY = update.y ?? seat.y;
                  // Only update if still inside section
                  if (isPointInPolygon({ x: newX, y: newY }, section.points)) {
                    return { ...seat, x: newX, y: newY };
                  }
                }
                return seat;
              })
            }
          : s
      ),
    }));
  }, [venueMap.sections, setVenueMap]);

  // Select seats by area (for row selection)
  const selectSeatsInArea = useCallback((sectionId: string, startPoint: Point, endPoint: Point) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);

    const selectedIds = section.seats
      .filter(seat => seat.x >= minX && seat.x <= maxX && seat.y >= minY && seat.y <= maxY)
      .map(seat => seat.id);

    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: selectedIds,
    }));

    return selectedIds;
  }, [venueMap.sections]);

  // Select seats by proximity to a line (for selecting a row)
  const selectSeatsAlongLine = useCallback((sectionId: string, lineStart: Point, lineEnd: Point, maxDistance: number = 15) => {
    const section = venueMap.sections.find(s => s.id === sectionId);
    if (!section) return [];

    const selectedIds = section.seats
      .filter(seat => pointToLineDistance({ x: seat.x, y: seat.y }, lineStart, lineEnd) <= maxDistance)
      .map(seat => seat.id);

    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: selectedIds,
    }));

    return selectedIds;
  }, [venueMap.sections]);

  const selectSeats = useCallback((seatIds: string[]) => {
    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: seatIds,
    }));
  }, []);

  const clearSeatSelection = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      selectedSeatIds: [],
    }));
  }, []);

  // Zoom and Pan: zoom toward a center point (mouse or floor center); adjust pan so center stays fixed on screen
  const setZoom = useCallback((newZoom: number, center?: Point) => {
    setEditorState(prev => {
      const z1 = Math.max(1, Math.min(10, newZoom));
      const z0 = prev.zoom;
      const cx = center?.x ?? (venueMap.width > 0 ? venueMap.width / 2 : 0);
      const cy = center?.y ?? (venueMap.height > 0 ? venueMap.height / 2 : 0);
      const panNewX = cx - ((cx - prev.pan.x) * z0) / z1;
      const panNewY = cy - ((cy - prev.pan.y) * z0) / z1;
      return {
        ...prev,
        zoom: z1,
        pan: { x: panNewX, y: panNewY },
      };
    });
  }, [venueMap.width, venueMap.height]);

  const setPan = useCallback((pan: Point) => {
    setEditorState(prev => ({
      ...prev,
      pan,
    }));
  }, []);

  const resetView = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 },
    }));
  }, []);

  // Fit to view
  const fitToView = useCallback(() => {
    if (!venueMap.svgUrl && venueMap.sections.length === 0) return;
    
    // Calculate bounding box of all content
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (venueMap.svgUrl) {
      minX = 0; minY = 0;
      maxX = venueMap.width; maxY = venueMap.height;
    }
    
    venueMap.sections.forEach(section => {
      section.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
    
    if (minX === Infinity) return;
    
    const padding = 50;
    
    // This would need container dimensions to calculate properly
    // For now, just center the content
    setEditorState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: minX - padding, y: minY - padding },
    }));
  }, [venueMap]);

  // Update draw config
  const updateDrawConfig = useCallback((updates: Partial<DrawConfig>) => {
    setDrawConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Update view config
  const updateViewConfig = useCallback((updates: Partial<ViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Data Export/Import
  const exportData = useCallback(() => {
    return JSON.stringify(venueMap, null, 2);
  }, [venueMap]);

  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json) as VenueMap;
      setVenueMap(data);
      return true;
    } catch {
      return false;
    }
  }, [setVenueMap]);

  const getCurrentSection = useCallback(() => {
    return venueMap.sections.find(s => s.id === editorState.selectedSectionId) || null;
  }, [venueMap.sections, editorState.selectedSectionId]);

  return {
    // State
    venueMap,
    editorState,
    drawConfig,
    viewConfig,
    fileInputRef,
    currentSection: getCurrentSection(),
    canUndo,
    canRedo,
    
    // Actions
    handleSvgUpload,
    triggerFileUpload,
    setMode,
    setSeatTool,
    setCanvasTool,
    
    // Undo/Redo
    undo,
    redo,
    
    // Section
    startSectionDrawing,
    addSectionPoint,
    completeSectionDrawing,
    cancelDrawing,
    enterSection,
    exitSection,
    deleteSection,
    updateSection,
    
    // Seat
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
    selectSeatsAlongLine,
    clearSeatSelection,
    
    // Config
    updateDrawConfig,
    updateViewConfig,
    
    // View
    setZoom,
    setPan,
    resetView,
    fitToView,
    
    // Data
    exportData,
    importData,
  };
}
