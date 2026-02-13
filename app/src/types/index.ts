// Venue Seat Designer Types

export interface Point {
  x: number;
  y: number;
}

export interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: number;
  status: 'available' | 'occupied' | 'reserved' | 'disabled';
  color?: string;
  sectionId: string;
  groupId?: string;
}

export interface SeatGroup {
  id: string;
  sectionId: string;
  tool: 'row' | 'line';
  spacing: number;
  seatIds: string[];
  createdAt: number;
}

export interface Section {
  id: string;
  name: string;
  points: Point[];
  color: string;
  seats: Seat[];
  opacity: number;
}

export interface VenueMap {
  id: string;
  name: string;
  svgUrl: string | null;
  svgContent: string | null;
  sections: Section[];
  seatGroups: SeatGroup[];
  width: number;
  height: number;
}

export type EditorMode = 'view' | 'draw-section' | 'edit-section' | 'draw-seat';

export type SeatTool = 'select' | 'single' | 'row' | 'line';

export type CanvasTool = 'auto' | 'pan' | 'select';

export interface EditorState {
  mode: EditorMode;
  selectedSectionId: string | null;
  selectedSeatIds: string[];
  seatTool: SeatTool;
  canvasTool: CanvasTool;
  zoom: number;
  pan: Point;
  isDrawing: boolean;
  drawingPoints: Point[];
  tempLine: Point[] | null;
}

export interface DrawConfig {
  seatRadius: number;
  seatSpacing: number;
  rowSpacing: number;
  defaultColor: string;
  sectionOpacity: number;
}

export interface ViewConfig {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
  snapToGrid: boolean;
}

export type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v';
