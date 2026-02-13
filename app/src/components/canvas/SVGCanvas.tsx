import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Point, Section, EditorMode, SeatTool, CanvasTool, ViewConfig, SeatGroup } from '@/types';
import { Save, X } from 'lucide-react';

interface SVGCanvasProps {
  // Venue data
  svgUrl: string | null;
  sections: Section[];
  seatGroups?: SeatGroup[];
  width: number;
  height: number;

  // Editor state
  mode: EditorMode;
  selectedSectionId: string | null;
  selectedSeatIds: string[];
  seatTool: SeatTool;
  canvasTool: CanvasTool;
  zoom: number;
  pan: Point;
  drawingPoints: Point[];
  viewConfig: ViewConfig;

  // Config
  seatRadius: number;
  seatSpacing: number;

  // Actions
  onAddSectionPoint: (point: Point) => void;
  onCompleteSection: () => void;
  onCancelDrawing: () => void;
  onEnterSection: (sectionId: string) => void;
  onAddSeat: (sectionId: string, point: Point) => void;
  onAddSeatsInRow: (sectionId: string, start: Point, end: Point, spacing?: number) => void;
  onAddSeatsAlongLine: (sectionId: string, points: Point[], spacing?: number) => void;
  onSelectSeat: (seatId: string, multi: boolean) => void;
  onSelectSeatsInArea: (sectionId: string, start: Point, end: Point) => void;
  onMoveSeats: (sectionId: string, seatIds: string[], delta: Point) => void;
  onNudgeSeats: (sectionId: string, seatIds: string[], direction: 'up' | 'down' | 'left' | 'right') => void;
  onDeleteSeat: (sectionId: string, seatId: string) => void;
  onPan: (delta: Point) => void;
  onZoom: (delta: number, center: Point) => void;
  onUpdateSeatGroupSpacing?: (sectionId: string, groupId: string, newSpacing: number) => void;
}

export const SVGCanvas: React.FC<SVGCanvasProps> = ({
  svgUrl,
  sections,
  seatGroups,
  width,
  height,
  mode,
  selectedSectionId,
  selectedSeatIds,
  seatTool,
  canvasTool,
  zoom,
  pan,
  drawingPoints,
  viewConfig,
  seatRadius,
  seatSpacing,
  onAddSectionPoint,
  onCompleteSection,
  onCancelDrawing,
  onEnterSection,
  onAddSeat,
  onAddSeatsInRow,
  onAddSeatsAlongLine,
  onSelectSeat,
  onSelectSeatsInArea,
  onMoveSeats,
  onNudgeSeats,
  onDeleteSeat,
  onPan,
  onZoom,
  onUpdateSeatGroupSpacing,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSeats, setIsDraggingSeats] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const [rowStartPoint, setRowStartPoint] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [seatDragStart, setSeatDragStart] = useState<Point | null>(null);
  const [seatDragOrigin, setSeatDragOrigin] = useState<Point | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const spacePressedRef = useRef(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [currentGroupSpacing, setCurrentGroupSpacing] = useState<number | null>(null);
  const [showSpacingInput, setShowSpacingInput] = useState(false);
  const [pendingRowData, setPendingRowData] = useState<{ start: Point; end: Point } | null>(null);
  const [pendingLineData, setPendingLineData] = useState<Point[] | null>(null);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<{ group: SeatGroup; seatCount: number } | null>(null);
  const [editingGroupSpacing, setEditingGroupSpacing] = useState<number | null>(null);

  // Transform screen coordinates to SVG coordinates
  const screenToSVG = useCallback((screenX: number, screenY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // Get mouse position in SVG coordinates
  const getMousePos = useCallback((e: React.MouseEvent): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToSVG(e.clientX, e.clientY);
  }, [screenToSVG]);

  // Check if should pan
  const shouldPan = useCallback((e: React.MouseEvent) => {
    return e.button === 1 || // Middle mouse
           canvasTool === 'pan' || // Pan tool active
           ((isSpacePressed || spacePressedRef.current) && e.button === 0); // Space + left click
  }, [canvasTool, isSpacePressed]);

  // Check if clicking on a section
  const getSectionAtPoint = useCallback((point: Point): Section | null => {
    // Check in reverse order (top sections first)
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (isPointInPolygon(point, section.points)) {
        return section;
      }
    }
    return null;
  }, [sections]);

  // Check if clicking on a seat
  const getSeatAtPoint = useCallback((point: Point, section: Section | null) => {
    if (!section) return null;
    for (const seat of section.seats) {
      const dist = Math.sqrt((seat.x - point.x) ** 2 + (seat.y - point.y) ** 2);
      if (dist <= seatRadius + 2) {
        return { seat, section };
      }
    }
    return null;
  }, [seatRadius]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getMousePos(e);

    if (shouldPan(e)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return;

    if (mode === 'draw-section') {
      onAddSectionPoint(pos);
    } else if (mode === 'draw-seat' && selectedSectionId) {
      const section = sections.find(s => s.id === selectedSectionId);
      if (!section) return;

      if (seatTool === 'select') {
        const seatInfo = getSeatAtPoint(pos, section);

        if (seatInfo) {
          const { seat } = seatInfo;
          // If seat is not selected, select it first
          if (!selectedSeatIds.includes(seat.id)) {
            onSelectSeat(seat.id, e.shiftKey);
          }
          // Prepare for dragging if not using Shift or Alt
          if (!e.shiftKey && !isAltPressed) {
            setSeatDragStart(pos);
            setSeatDragOrigin(pos);
          }
        } else if (isAltPressed) {
          // Lasso select mode (Alt + drag)
          setDragStart(pos);
          setDragCurrent(pos);
        } else {
          // Box selection
          setDragStart(pos);
          setDragCurrent(pos);
          if (!e.shiftKey) {
            // Clear selection
            onSelectSeat('', false);
          }
        }
      } else if (seatTool === 'single') {
        onAddSeat(selectedSectionId, pos);
      } else if (seatTool === 'row') {
        setRowStartPoint(pos);
      } else if (seatTool === 'line') {
        setTempPoints(prev => [...prev, pos]);
      }
    } else if (mode === 'view') {
      // In view mode, clicking on section enters it
      const section = getSectionAtPoint(pos);
      if (section) {
        onEnterSection(section.id);
      }
    }
  }, [mode, selectedSectionId, seatTool, canvasTool, isSpacePressed, isAltPressed, sections, selectedSeatIds, getMousePos, shouldPan, onAddSectionPoint, onAddSeat, onSelectSeat, onEnterSection, getSectionAtPoint, getSeatAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);

    // Update hover states
    if (mode === 'view') {
      const section = getSectionAtPoint(pos);
      setHoveredSectionId(section?.id || null);
    } else if (mode === 'draw-seat' && selectedSectionId) {
      const section = sections.find(s => s.id === selectedSectionId);
      if (section) {
        const seatInfo = getSeatAtPoint(pos, section);
        setHoveredSeatId(seatInfo?.seat.id || null);
      }
    }

    if (isPanning && panStart) {
      const dx = (e.clientX - panStart.x) * 6;
      const dy = (e.clientY - panStart.y) * 6;
      onPan({ x: pan.x - dx / zoom, y: pan.y - dy / zoom });
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (seatDragStart && seatDragOrigin && selectedSectionId && !isDraggingSeats) {
      // Check if moved enough to start dragging
      const dx = pos.x - seatDragOrigin.x;
      const dy = pos.y - seatDragOrigin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Start dragging if moved more than 3 pixels
      if (distance > 3) {
        setIsDraggingSeats(true);
      }
    } else if (isDraggingSeats && seatDragStart && selectedSectionId) {
      // Calculate incremental movement
      const dx = pos.x - seatDragStart.x;
      const dy = pos.y - seatDragStart.y;

      // Only move if there's meaningful movement
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        onMoveSeats(selectedSectionId, selectedSeatIds, { x: dx, y: dy });
        setSeatDragStart(pos);
      }
    } else if (dragStart && seatTool === 'select') {
      setDragCurrent(pos);
    }
  }, [isPanning, isDraggingSeats, panStart, seatDragStart, seatDragOrigin, dragStart, seatTool, zoom, pan, mode, selectedSectionId, sections, selectedSeatIds, getMousePos, onPan, onMoveSeats, getSectionAtPoint, getSeatAtPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDraggingSeats) {
      setIsDraggingSeats(false);
      setSeatDragStart(null);
      setSeatDragOrigin(null);
      return;
    }

    // Clean up drag preparation state if no dragging happened
    if (seatDragStart && seatDragOrigin) {
      setSeatDragStart(null);
      setSeatDragOrigin(null);
    }

    const pos = getMousePos(e);

    if (seatTool === 'select' && dragStart && dragCurrent && selectedSectionId) {
      const boxWidth = Math.abs(dragCurrent.x - dragStart.x);
      const boxHeight = Math.abs(dragCurrent.y - dragStart.y);
      if (boxWidth > 5 || boxHeight > 5) {
        onSelectSeatsInArea(selectedSectionId, dragStart, dragCurrent);
      }
      setDragStart(null);
      setDragCurrent(null);
    } else if (mode === 'draw-seat' && selectedSectionId && seatTool === 'row' && rowStartPoint) {
      const distance = Math.sqrt(
        Math.pow(pos.x - rowStartPoint.x, 2) +
        Math.pow(pos.y - rowStartPoint.y, 2)
      );
      if (distance > seatSpacing / 2) {
        // Store pending data and show spacing input
        setPendingRowData({ start: rowStartPoint, end: pos });
        setShowSpacingInput(true);
      }
      setRowStartPoint(null);
    }
  }, [isPanning, isDraggingSeats, seatDragStart, seatDragOrigin, seatTool, dragStart, dragCurrent, mode, selectedSectionId, rowStartPoint, seatSpacing, getMousePos, onSelectSeatsInArea]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (mode === 'draw-section' && drawingPoints.length >= 3) {
      onCompleteSection();
    } else if (mode === 'draw-seat' && seatTool === 'line' && tempPoints.length >= 2) {
      // Store pending data and show spacing input
      setPendingLineData(tempPoints);
      setShowSpacingInput(true);
      setTempPoints([]);
    } else if (mode === 'view') {
      // Double-click on section to enter it
      const section = getSectionAtPoint(pos);
      if (section) {
        onEnterSection(section.id);
      }
    }
  }, [mode, drawingPoints.length, tempPoints, selectedSectionId, seatTool, getMousePos, onCompleteSection, onEnterSection, getSectionAtPoint]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const pos = getMousePos(e);
    onZoom(delta, pos);
  }, [getMousePos, onZoom]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        spacePressedRef.current = true;
        setIsSpacePressed(true);
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        setIsAltPressed(true);
      }

      if (selectedSectionId && selectedSeatIds.length > 0) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'down');
            break;
          case 'ArrowLeft':
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'left');
            break;
          case 'ArrowRight':
            e.preventDefault();
            onNudgeSeats(selectedSectionId, selectedSeatIds, 'right');
            break;
        }
      }

      if (e.key === 'Escape') {
        if (mode === 'draw-section') {
          onCancelDrawing();
        } else if (mode === 'draw-seat' && tempPoints.length > 0) {
          setTempPoints([]);
        }
      }
      if (e.key === 'Enter') {
        if (mode === 'draw-section' && drawingPoints.length >= 3) {
          onCompleteSection();
        } else if (mode === 'draw-seat' && seatTool === 'line' && tempPoints.length >= 2) {
          // Store pending data and show spacing input
          setPendingLineData(tempPoints);
          setShowSpacingInput(true);
          setTempPoints([]);
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSeatIds.length > 0 && selectedSectionId) {
          selectedSeatIds.forEach(seatId => {
            onDeleteSeat(selectedSectionId, seatId);
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        setIsAltPressed(false);
      }
    };

    const handleBlur = () => {
      spacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mode, drawingPoints.length, tempPoints.length, selectedSeatIds, selectedSectionId, seatTool, onCancelDrawing, onCompleteSection, onAddSeatsAlongLine, onDeleteSeat, onNudgeSeats]);

  // Monitor selected seats and check if they belong to a group
  useEffect(() => {
    if (selectedSeatIds.length === 0 || !seatGroups || seatGroups.length === 0) {
      setSelectedGroupInfo(null);
      setEditingGroupSpacing(null);
      return;
    }

    // Find groups that contain any of the selected seats
    const groupsForSelectedSeats = seatGroups.filter(group =>
      selectedSeatIds.some(seatId => group.seatIds.includes(seatId))
    );

    // If all selected seats belong to the same group, show group info
    if (groupsForSelectedSeats.length === 1) {
      const group = groupsForSelectedSeats[0];
      const seatCount = group.seatIds.length;
      setSelectedGroupInfo({ group, seatCount });
      setEditingGroupSpacing(group.spacing);
    } else if (groupsForSelectedSeats.length === 0) {
      setSelectedGroupInfo(null);
      setEditingGroupSpacing(null);
    } else {
      // Multiple different groups selected - show nothing for now
      setSelectedGroupInfo(null);
      setEditingGroupSpacing(null);
    }
  }, [selectedSeatIds, seatGroups]);

  // Render helpers
  const renderBackground = () => {
    if (svgUrl) {
      return (
        <image
          href={svgUrl}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          opacity={mode === 'draw-seat' ? 0.8 : 1}
        />
      );
    }
    return (
      <rect
        width={width}
        height={height}
        fill={viewConfig.backgroundColor}
        stroke="#e2e8f0"
        strokeWidth={2}
      />
    );
  };

  const renderGrid = () => {
    if (!viewConfig.showGrid) return null;
    
    return (
      <>
        <defs>
          <pattern 
            id="grid" 
            width={viewConfig.gridSize} 
            height={viewConfig.gridSize} 
            patternUnits="userSpaceOnUse"
          >
            <path 
              d={`M ${viewConfig.gridSize} 0 L 0 0 0 ${viewConfig.gridSize}`} 
              fill="none" 
              stroke={viewConfig.gridColor} 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
      </>
    );
  };

  const renderSections = () => {
    return sections.map(section => {
      const isSelected = section.id === selectedSectionId;
      const isHovered = section.id === hoveredSectionId;
      const pointsStr = section.points.map(p => `${p.x},${p.y}`).join(' ');
      
      return (
        <g key={section.id}>
          <polygon
            points={pointsStr}
            fill={section.color}
            fillOpacity={isSelected ? 0.15 : isHovered ? 0.25 : section.opacity}
            stroke={isSelected ? '#3b82f6' : section.color}
            strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
            strokeDasharray={isSelected ? 'none' : '5,5'}
            style={{ 
              cursor: mode === 'view' ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              if (mode === 'view') {
                onEnterSection(section.id);
              }
            }}
            onMouseEnter={() => setHoveredSectionId(section.id)}
            onMouseLeave={() => setHoveredSectionId(null)}
          />
          {/* Section label */}
          <text
            x={section.points.reduce((sum, p) => sum + p.x, 0) / section.points.length}
            y={section.points.reduce((sum, p) => sum + p.y, 0) / section.points.length}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={section.color}
            fontSize={14}
            fontWeight="bold"
            pointerEvents="none"
            style={{ 
              textShadow: '0 0 4px rgba(255,255,255,0.8)',
              opacity: isHovered || isSelected ? 1 : 0.8
            }}
          >
            {section.name}
          </text>
          {/* Seat count badge */}
          <g transform={`translate(${section.points.reduce((sum, p) => sum + p.x, 0) / section.points.length + 40}, ${section.points.reduce((sum, p) => sum + p.y, 0) / section.points.length})`}>
            <circle r={12} fill="white" stroke={section.color} strokeWidth={1.5} />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={section.color}
              fontSize={10}
              fontWeight="bold"
              pointerEvents="none"
            >
              {section.seats.length}
            </text>
          </g>
        </g>
      );
    });
  };

  const renderSeats = () => {
    if (!selectedSectionId) return null;

    const section = sections.find(s => s.id === selectedSectionId);
    if (!section) return null;

    return section.seats.map(seat => {
      const isSelected = selectedSeatIds.includes(seat.id);
      const isHovered = hoveredSeatId === seat.id;
      const isDragging = isDraggingSeats && isSelected;

      return (
        <g key={seat.id}>
          {/* Dragging indicator */}
          {isDragging && (
            <circle
              cx={seat.x}
              cy={seat.y}
              r={seatRadius + 6}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              opacity={0.7}
              pointerEvents="none"
              style={{
                animation: 'pulse 0.5s ease-in-out infinite'
              }}
            />
          )}

          {/* Selection aura */}
          {isSelected && !isDragging && (
            <circle
              cx={seat.x}
              cy={seat.y}
              r={seatRadius + 4}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="3,3"
              opacity={0.6}
              pointerEvents="none"
            />
          )}

          <circle
            cx={seat.x}
            cy={seat.y}
            r={seatRadius}
            fill={isDragging ? '#ef4444' : isSelected ? '#f59e0b' : seat.color || '#3b82f6'}
            stroke={isDragging ? '#991b1b' : isSelected ? '#d97706' : isHovered ? '#1e40af' : '#1e40af'}
            strokeWidth={isDragging ? 3 : isSelected ? 3 : isHovered ? 2 : 1}
            style={{
              cursor: seatTool === 'select' ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              transition: isDragging ? 'none' : 'all 0.1s ease',
              filter: isHovered || isDragging ? 'brightness(1.1)' : 'none',
              opacity: isDragging ? 0.9 : 1
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSeat(seat.id, e.shiftKey);
            }}
            onMouseEnter={() => setHoveredSeatId(seat.id)}
            onMouseLeave={() => setHoveredSeatId(null)}
          />

          <text
            x={seat.x}
            y={seat.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={seatRadius * 0.75}
            fontWeight={isSelected ? 'bold' : 'normal'}
            pointerEvents="none"
            style={{
              opacity: isDragging ? 0.7 : 1
            }}
          >
            {seat.number}
          </text>

          {/* Tooltip on hover */}
          {isHovered && !isDragging && (
            <g transform={`translate(${seat.x}, ${seat.y - seatRadius - 25})`}>
              <rect
                x={-35}
                y={-12}
                width={70}
                height={24}
                rx={4}
                fill="#1e293b"
                opacity={0.95}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={11}
              >
                {seat.row}-{seat.number}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  const renderDrawingPreview = () => {
    if (mode === 'draw-section' && drawingPoints.length > 0) {
      const pointsStr = drawingPoints.map(p => `${p.x},${p.y}`).join(' ');
      
      return (
        <g>
          <polygon
            points={pointsStr}
            fill="#3b82f6"
            fillOpacity={0.2}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          {drawingPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={5} fill="#3b82f6" stroke="white" strokeWidth={2} />
          ))}
          {drawingPoints.length > 0 && (
            <line
              x1={drawingPoints[drawingPoints.length - 1].x}
              y1={drawingPoints[drawingPoints.length - 1].y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          )}
          {drawingPoints.length > 1 && (
            <line
              x1={drawingPoints[0].x}
              y1={drawingPoints[0].y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.4}
            />
          )}
        </g>
      );
    }

    if (mode === 'draw-seat' && selectedSectionId) {
      const section = sections.find(s => s.id === selectedSectionId);
      if (!section) return null;

      return (
        <g>
          {/* Section highlight */}
          <polygon
            points={section.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth={4}
            strokeDasharray="8,4"
          />
          
          {/* Selection box / Lasso */}
          {seatTool === 'select' && dragStart && dragCurrent && (
            <>
              <rect
                x={Math.min(dragStart.x, dragCurrent.x)}
                y={Math.min(dragStart.y, dragCurrent.y)}
                width={Math.abs(dragCurrent.x - dragStart.x)}
                height={Math.abs(dragCurrent.y - dragStart.y)}
                fill={isAltPressed ? '#8b5cf6' : '#3b82f6'}
                fillOpacity={0.08}
                stroke={isAltPressed ? '#8b5cf6' : '#3b82f6'}
                strokeWidth={1.5}
                strokeDasharray={isAltPressed ? '4,4' : '3,3'}
                pointerEvents="none"
              />
              {/* Selection mode indicator */}
              <text
                x={Math.max(dragStart.x, dragCurrent.x) + 5}
                y={Math.min(dragStart.y, dragCurrent.y)}
                fill={isAltPressed ? '#8b5cf6' : '#3b82f6'}
                fontSize={10}
                fontWeight="bold"
                pointerEvents="none"
              >
                {isAltPressed ? 'Lasso Select' : 'Box Select'}
              </text>
            </>
          )}
          
          {/* Row preview */}
          {seatTool === 'row' && rowStartPoint && (
            <g>
              <line
                x1={rowStartPoint.x}
                y1={rowStartPoint.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              {(() => {
                const dx = mousePos.x - rowStartPoint.x;
                const dy = mousePos.y - rowStartPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const effectiveSpacing = currentGroupSpacing ?? seatSpacing;
                const seatCount = Math.floor(distance / effectiveSpacing) + 1;
                const seats = [];
                for (let i = 0; i < seatCount; i++) {
                  const t = i / Math.max(seatCount - 1, 1);
                  const x = rowStartPoint.x + dx * t;
                  const y = rowStartPoint.y + dy * t;
                  seats.push(
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={seatRadius}
                      fill="#10b981"
                      fillOpacity={0.5}
                      pointerEvents="none"
                    />
                  );
                }
                return seats;
              })()}
            </g>
          )}
          
          {/* Line tool preview */}
          {seatTool === 'line' && tempPoints.length > 0 && (
            <g>
              {tempPoints.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={5} fill="#10b981" stroke="white" strokeWidth={1.5} />
                  {i > 0 && (
                    <line
                      x1={tempPoints[i - 1].x}
                      y1={tempPoints[i - 1].y}
                      x2={p.x}
                      y2={p.y}
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  )}
                </g>
              ))}
              <line
                x1={tempPoints[tempPoints.length - 1].x}
                y1={tempPoints[tempPoints.length - 1].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            </g>
          )}
        </g>
      );
    }

    return null;
  };

  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (isDraggingSeats) return 'grabbing';
    if (seatDragStart) return 'grab';
    if (canvasTool === 'pan' || isSpacePressed) return 'grab';
    if (isAltPressed && mode === 'draw-seat' && seatTool === 'select') return 'crosshair';
    if (mode === 'draw-section') return 'crosshair';
    if (mode === 'draw-seat') {
      if (seatTool === 'select') return 'default';
      if (seatTool === 'single' || seatTool === 'row' || seatTool === 'line') return 'crosshair';
    }
    return 'default';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ 
        cursor: getCursorStyle(),
        backgroundColor: viewConfig.backgroundColor 
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${pan.x} ${pan.y} ${width / zoom} ${height / zoom}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        {renderGrid()}
        {renderBackground()}
        {renderSections()}
        {renderSeats()}
        {renderDrawingPreview()}
      </svg>
      
      {/* Status bar */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg text-sm text-slate-600 flex items-center gap-4">
        <span className="font-medium">Zoom: {Math.round(zoom * 100)}%</span>
        <span className="text-slate-300">|</span>
        <span>Pan: ({Math.round(pan.x)}, {Math.round(pan.y)})</span>
        {isSpacePressed && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Pan Mode
            </span>
          </>
        )}
        {isAltPressed && mode === 'draw-seat' && seatTool === 'select' && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-purple-600 font-medium">Lasso Select</span>
          </>
        )}
      </div>

      {/* Tool hint */}
      {mode === 'view' && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-slate-500">
          Double-click section to edit
        </div>
      )}
      {mode === 'draw-seat' && seatTool === 'select' && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-slate-500">
          Alt + Drag for lasso select
        </div>
      )}

      {/* Seat Group Info Panel */}
      {selectedGroupInfo && selectedSectionId && (
        <div className="absolute bottom-24 right-4 bg-white rounded-xl shadow-xl border border-slate-200 max-w-xs w-80 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                <span className="text-sm font-bold">{selectedGroupInfo.seatCount}</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Seat Group</h3>
                <p className="text-xs text-blue-100 capitalize">{selectedGroupInfo.group.tool} • {selectedGroupInfo.seatCount} seats</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedGroupInfo(null);
                setEditingGroupSpacing(null);
              }}
              className="hover:bg-white/20 p-1 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Current Spacing Display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Current Spacing</p>
              <p className="text-2xl font-bold text-slate-900">{selectedGroupInfo.group.spacing}px</p>
            </div>

            {/* Spacing Edit Form */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">New Spacing (pixels)</label>
              <input
                type="number"
                min="5"
                max="100"
                value={editingGroupSpacing ?? selectedGroupInfo.group.spacing}
                onChange={(e) => setEditingGroupSpacing(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                This will redistribute {selectedGroupInfo.seatCount} seats with the new spacing.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setSelectedGroupInfo(null);
                  setEditingGroupSpacing(null);
                }}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingGroupSpacing !== null && editingGroupSpacing !== selectedGroupInfo.group.spacing && onUpdateSeatGroupSpacing) {
                    onUpdateSeatGroupSpacing(selectedSectionId, selectedGroupInfo.group.id, editingGroupSpacing);
                    setSelectedGroupInfo(null);
                    setEditingGroupSpacing(null);
                  }
                }}
                disabled={editingGroupSpacing === null || editingGroupSpacing === selectedGroupInfo.group.spacing}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacing Input Dialog */}
      {showSpacingInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Set Seat Spacing</h3>
            <p className="text-sm text-slate-600 mb-4">
              Configure the spacing between seats for this group.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Spacing (pixels)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={currentGroupSpacing ?? seatSpacing}
                  onChange={(e) => setCurrentGroupSpacing(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {(pendingRowData || pendingLineData) && (
                <div className="p-3 bg-slate-100 rounded-lg text-sm">
                  <p className="text-slate-600">
                    {pendingRowData
                      ? `Preview: ~${Math.floor(
                          Math.sqrt(
                            Math.pow(pendingRowData.end.x - pendingRowData.start.x, 2) +
                            Math.pow(pendingRowData.end.y - pendingRowData.start.y, 2)
                          ) / (currentGroupSpacing ?? seatSpacing)
                        ) + 1} seats`
                      : pendingLineData
                      ? `Preview: ~${pendingLineData.reduce((total, _, i) => {
                          if (i === 0) return total;
                          const dx = pendingLineData[i].x - pendingLineData[i - 1].x;
                          const dy = pendingLineData[i].y - pendingLineData[i - 1].y;
                          return total + Math.floor(Math.sqrt(dx * dx + dy * dy) / (currentGroupSpacing ?? seatSpacing)) + 1;
                        }, 0)} seats`
                      : ''}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowSpacingInput(false);
                    setPendingRowData(null);
                    setPendingLineData(null);
                    setCurrentGroupSpacing(null);
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const spacing = currentGroupSpacing ?? seatSpacing;
                    if (pendingRowData && selectedSectionId) {
                      onAddSeatsInRow(selectedSectionId, pendingRowData.start, pendingRowData.end, spacing);
                    } else if (pendingLineData && selectedSectionId) {
                      onAddSeatsAlongLine(selectedSectionId, pendingLineData, spacing);
                    }
                    setShowSpacingInput(false);
                    setPendingRowData(null);
                    setPendingLineData(null);
                    setCurrentGroupSpacing(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Seats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Ray casting algorithm for point in polygon
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
