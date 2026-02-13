import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Point, Section, EditorMode, SeatTool, CanvasTool, ViewConfig } from '@/types';

interface SVGCanvasProps {
  // Venue data
  svgUrl: string | null;
  sections: Section[];
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
  onAddSeatsInRow: (sectionId: string, start: Point, end: Point) => void;
  onAddSeatsAlongLine: (sectionId: string, points: Point[]) => void;
  onSelectSeat: (seatId: string, multi: boolean) => void;
  onSelectSeatsInArea: (sectionId: string, start: Point, end: Point) => void;
  onMoveSeats: (sectionId: string, seatIds: string[], delta: Point) => void;
  onNudgeSeats: (sectionId: string, seatIds: string[], direction: 'up' | 'down' | 'left' | 'right') => void;
  onDeleteSeat: (sectionId: string, seatId: string) => void;
  onPan: (delta: Point) => void;
  onZoom: (delta: number, center: Point) => void;
}

export const SVGCanvas: React.FC<SVGCanvasProps> = ({
  svgUrl,
  sections,
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
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

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
           (isSpacePressed && e.button === 0); // Space + left click
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
  const getSeatAtPoint = useCallback((point: Point, section: Section | null): { seat: any, section: Section } | null => {
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
          if (!selectedSeatIds.includes(seat.id)) {
            onSelectSeat(seat.id, e.shiftKey);
          }
          if (!e.shiftKey && !isAltPressed) {
            setIsDraggingSeats(true);
            setSeatDragStart(pos);
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
    } else if (isDraggingSeats && seatDragStart && selectedSectionId) {
      const dx = pos.x - seatDragStart.x;
      const dy = pos.y - seatDragStart.y;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        onMoveSeats(selectedSectionId, selectedSeatIds, { x: dx, y: dy });
        setSeatDragStart(pos);
      }
    } else if (dragStart && seatTool === 'select') {
      setDragCurrent(pos);
    }
  }, [isPanning, isDraggingSeats, panStart, seatDragStart, dragStart, seatTool, zoom, pan, mode, selectedSectionId, sections, selectedSeatIds, getMousePos, onPan, onMoveSeats, getSectionAtPoint, getSeatAtPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDraggingSeats) {
      setIsDraggingSeats(false);
      setSeatDragStart(null);
      return;
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
        onAddSeatsInRow(selectedSectionId, rowStartPoint, pos);
      }
      setRowStartPoint(null);
    }
  }, [isPanning, isDraggingSeats, seatTool, dragStart, dragCurrent, mode, selectedSectionId, rowStartPoint, seatSpacing, getMousePos, onSelectSeatsInArea, onAddSeatsInRow]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    if (mode === 'draw-section' && drawingPoints.length >= 3) {
      onCompleteSection();
    } else if (mode === 'draw-seat' && seatTool === 'line' && tempPoints.length >= 2) {
      onAddSeatsAlongLine(selectedSectionId!, tempPoints);
      setTempPoints([]);
    } else if (mode === 'view') {
      // Double-click on section to enter it
      const section = getSectionAtPoint(pos);
      if (section) {
        onEnterSection(section.id);
      }
    }
  }, [mode, drawingPoints.length, tempPoints.length, selectedSectionId, seatTool, getMousePos, onCompleteSection, onAddSeatsAlongLine, onEnterSection, getSectionAtPoint]);

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
          onAddSeatsAlongLine(selectedSectionId!, tempPoints);
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
        setIsSpacePressed(false);
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, drawingPoints.length, tempPoints.length, selectedSeatIds, selectedSectionId, seatTool, onCancelDrawing, onCompleteSection, onAddSeatsAlongLine, onDeleteSeat, onNudgeSeats]);

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
      
      return (
        <g key={seat.id}>
          {/* Selection aura */}
          {isSelected && (
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
            fill={isSelected ? '#f59e0b' : seat.color || '#3b82f6'}
            stroke={isSelected ? '#d97706' : isHovered ? '#1e40af' : '#1e40af'}
            strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
            style={{ 
              cursor: seatTool === 'select' ? 'move' : 'pointer',
              transition: 'all 0.1s ease',
              filter: isHovered ? 'brightness(1.1)' : 'none'
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
          >
            {seat.number}
          </text>
          {/* Tooltip on hover */}
          {isHovered && (
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
                const seatCount = Math.floor(distance / seatSpacing) + 1;
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
