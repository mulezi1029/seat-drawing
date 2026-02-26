/**
 * 场馆座位系统 - 布局结构版本
 *
 * 基于 seats.io 架构的完整布局：
 * - 顶部工具栏 (PanelTop)
 * - 左侧工具选择 (PanelLeft)
 * - 右侧属性面板 (PanelRight)
 * - 中央画布区域 (Canvas + SVGRenderer)
 * - 悬浮控件 (NavigationHUD, FloorPicker, StatusBar)
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useSimpleViewer } from '@/hooks/useSimpleViewer';
import { Canvas } from '@/components/canvas';
import { SVGRenderer } from '@/components/canvas/SVGRenderer';
import { PanelTop } from '@/components/panels/PanelTop';
import { PanelLeft } from '@/components/panels/PanelLeft';
import { PanelRight } from '@/components/panels/PanelRight';
import { FloatingControls } from '@/components/panels/FloatingControls';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { type Section, type Point, type SnapResult, DEFAULT_SECTION_COLORS } from '@/types';
import { rotatePolygon } from '@/utils/coordinate';

import './App.css';

/**
 * 主应用组件 - 极简版本
 */
function App() {
  const {
    svgUrl,
    scale,
    offsetX,
    offsetY,
    fileInputRef,
    uploadSvg,
    zoomAt,
    setOffset,
    panBy,
    resetView,
    zoomIn,
    zoomOut,
    triggerFileUpload,
  } = useSimpleViewer();

  // ===== 工具状态管理 =====
  const [activeTool, setActiveTool] = useState('select');
  const [previousTool, setPreviousTool] = useState('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // ===== 区域绘制状态 =====
  const [sections, setSections] = useState<Section[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<Point | null>(null);

  // ===== 绘制辅助状态 =====
  const [mousePosition, setMousePosition] = useState<Point | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isShiftPressed, setIsShiftPressed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);

  // 收集所有已有顶点用于吸附
  const allVertices = sections.flatMap(s => s.points);

  // Canvas 容器引用 - 用于获取实际滚动位置
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 处理工具切换
   */
  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
    // 切换到非绘制工具时，取消当前绘制
    if (tool !== 'section' && tool !== 'polygon' && isDrawing) {
      setIsDrawing(false);
      setDrawingPoints([]);
    }
  }, [isDrawing]);

  /**
   * 生成唯一 ID
   */
  const generateId = useCallback(() => {
    return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * 处理绘制完成
   */
  const handleDrawingComplete = useCallback((points: Point[]) => {
    if (points.length < 3) return; // 至少需要3个点

    const newSection: Section = {
      id: generateId(),
      name: `区域 ${String.fromCharCode(65 + sections.length)}`,
      points,
      color: DEFAULT_SECTION_COLORS[sections.length % DEFAULT_SECTION_COLORS.length],
      seats: [],
      opacity: 0.3,
    };

    setSections(prev => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    setSelectedIds(new Set([newSection.id]));
    setIsDrawing(false);
    setDrawingPoints([]);
    setActiveTool('select'); // 绘制完成后切换回选择工具
  }, [sections.length, generateId]);

  /**
   * 处理选择变化
   */
  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
    // 更新单选兼容性
    const firstId = ids.size > 0 ? Array.from(ids)[0] : null;
    setSelectedSectionId(firstId);
  }, []);

  /**
   * 处理元素移动 - 实时预览
   */
  const handleElementsMove = useCallback((ids: Set<string>, dx: number, dy: number) => {
    if (ids.size === 0) return;

    setSections(prev => prev.map(section => {
      if (!ids.has(section.id)) return section;

      // 移动所有顶点
      return {
        ...section,
        points: section.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy,
        })),
      };
    }));
  }, []);

  /**
   * 处理元素移动结束 - 可以在这里添加撤销历史等
   */
  const handleElementsMoveEnd = useCallback(() => {
    // 移动结束，可以在这里添加撤销记录
    console.log('Elements move ended');
  }, []);

  /**
   * 处理框选框变化
   */
  const handleSelectionBoxChange = useCallback((start: Point | null, end: Point | null) => {
    setSelectionBoxStart(start);
    setSelectionBoxEnd(end);
  }, []);

  /**
   * 处理元素旋转 - 实时预览
   * @param originalSections 旋转开始时的原始 section 数据，用于避免累积旋转
   */
  const handleElementsRotate = useCallback((ids: Set<string>, center: Point, angle: number, originalSections?: Section[]) => {
    if (ids.size === 0) return;

    setSections(prev => prev.map(section => {
      if (!ids.has(section.id)) return section;

      // 使用原始 section 数据进行旋转，避免累积旋转错误
      const sourceSection = originalSections?.find(s => s.id === section.id) || section;

      // 旋转所有顶点
      return {
        ...section,
        points: rotatePolygon(sourceSection.points, center, angle),
      };
    }));
  }, []);

  /**
   * 处理元素旋转结束
   */
  const handleElementsRotateEnd = useCallback(() => {
    // 旋转结束，可以在这里添加撤销记录
    console.log('Elements rotate ended');
  }, []);

  /**
   * 处理复制选中元素
   * - Ctrl+C 或 Ctrl+D 复制选中元素
   * - 新元素位置偏移 +20px
   * - 新元素被选中，原元素取消选中
   */
  const handleCopyElements = useCallback(() => {
    if (selectedIds.size === 0) return;

    const selectedSections = sections.filter(s => selectedIds.has(s.id));

    // 生成新元素，位置偏移
    const newSections: Section[] = selectedSections.map(section => {
      const newId = generateId();
      return {
        ...section,
        id: newId,
        name: `${section.name} (Copy)`,
        points: section.points.map(p => ({
          x: p.x + 20, // 向右偏移 20px
          y: p.y + 20, // 向下偏移 20px
        })),
      };
    });

    // 添加到 sections
    setSections(prev => [...prev, ...newSections]);

    // 选中新元素，取消原元素选中
    const newIds = new Set(newSections.map(s => s.id));
    setSelectedIds(newIds);
    setSelectedSectionId(newSections[0]?.id || null);
  }, [sections, selectedIds, generateId]);

  /**
   * 空格键处理：临时切换到 hand 工具
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        // 始终阻止默认行为（防止页面滚动）
        e.preventDefault();
        e.stopPropagation();

        // 只在首次按下时切换工具（非重复触发）
        if (!e.repeat && !isSpacePressed) {
          setPreviousTool(activeTool);
          setActiveTool('hand');
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        setActiveTool(previousTool);
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      if (isSpacePressed) {
        setActiveTool(previousTool);
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeTool, isSpacePressed, previousTool]);

  /**
   * 选择工具键盘快捷键
   * - Ctrl+A: 全选
   * - Ctrl+C / Ctrl+D: 复制选中元素
   * - Delete: 删除选中元素
   * - ESC: 取消选择
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A 全选
      if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey) && activeTool === 'select') {
        e.preventDefault();
        const allIds = new Set(sections.map(s => s.id));
        setSelectedIds(allIds);
        const firstId = sections.length > 0 ? sections[0].id : null;
        setSelectedSectionId(firstId);
      }

      // Ctrl+C 或 Ctrl+D 复制
      if ((e.key === 'c' || e.key === 'C' || e.key === 'd' || e.key === 'D')
          && (e.ctrlKey || e.metaKey)
          && activeTool === 'select'
          && selectedIds.size > 0
          && !isDrawing) {
        e.preventDefault();
        handleCopyElements();
      }

      // Delete 删除选中元素
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0 && activeTool === 'select' && !isDrawing) {
        e.preventDefault();
        // 从 sections 中删除选中的元素
        setSections(prev => prev.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
        setSelectedSectionId(null);
      }

      // ESC 取消选择
      if (e.key === 'Escape' && selectedIds.size > 0 && !isDrawing) {
        e.preventDefault();
        setSelectedIds(new Set());
        setSelectedSectionId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool, sections, selectedIds, isDrawing, handleCopyElements]);

  /**
   * 处理文件选择
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === 'image/svg+xml') {
        uploadSvg(file);
      }
    },
    [uploadSvg]
  );

  /**
   * 处理缩放变化
   */
  const handleScaleChange = useCallback(
    (newScale: number, centerX: number, centerY: number) => {
      zoomAt(newScale, centerX, centerY);
    },
    [zoomAt]
  );

  /**
   * 处理偏移变化
   */
  const handleOffsetChange = useCallback(
    (x: number, y: number) => {
      setOffset(x, y);
    },
    [setOffset]
  );

  /**
   * 平移控制 - 基于 DOM 实际滚动位置计算，避免状态延迟问题
   */
  const handlePanWithSync = useCallback((deltaX: number, deltaY: number) => {
    if (canvasContainerRef.current) {
      const { scrollLeft, scrollTop } = canvasContainerRef.current;
      // 直接使用 DOM 当前值 + delta，避免状态延迟
      setOffset(scrollLeft + deltaX, scrollTop + deltaY);
    } else {
      panBy(deltaX, deltaY);
    }
  }, [setOffset, panBy]);

  const handlePanUp = useCallback(() => handlePanWithSync(0, -100), [handlePanWithSync]);
  const handlePanDown = useCallback(() => handlePanWithSync(0, 100), [handlePanWithSync]);
  const handlePanLeft = useCallback(() => handlePanWithSync(-100, 0), [handlePanWithSync]);
  const handlePanRight = useCallback(() => handlePanWithSync(100, 0), [handlePanWithSync]);

  return (
    <div className="designer-app h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 顶部工具栏 */}
      <PanelTop />

      {/* 主工作区 */}
      <div className="workspace flex flex-1 overflow-hidden">
        {/* 左侧工具栏 */}
        <PanelLeft activeTool={activeTool} onToolChange={handleToolChange} />

        {/* 中央画布区域 */}
        <div tabIndex={-1} className="flex-1 relative bg-white overflow-hidden">
          <Canvas
            ref={canvasContainerRef}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            isSpacePressed={isSpacePressed}
            activeTool={activeTool}
            onScaleChange={handleScaleChange}
            onOffsetChange={handleOffsetChange}
            isDrawing={isDrawing}
            drawingPoints={drawingPoints}
            onDrawingPointsChange={setDrawingPoints}
            onDrawingComplete={handleDrawingComplete}
            onDrawingStateChange={setIsDrawing}
            allVertices={allVertices}
            showGrid={showGrid}
            gridSize={gridSize}
            onMousePositionChange={setMousePosition}
            onSnapResultChange={setSnapResult}
            onShiftPressedChange={setIsShiftPressed}
            onCtrlPressedChange={setIsCtrlPressed}
            sections={sections}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onSelectionBoxChange={handleSelectionBoxChange}
            onElementsMove={handleElementsMove}
            onElementsMoveEnd={handleElementsMoveEnd}
            onElementsRotate={handleElementsRotate}
            onElementsRotateEnd={handleElementsRotateEnd}
          >
            {/* SVG 渲染内容 */}
            <SVGRenderer
              scale={scale}
              svgUrl={svgUrl}
              sections={sections}
              selectedSectionId={selectedSectionId}
              selectedIds={selectedIds}
              isDrawing={isDrawing}
              drawingPoints={drawingPoints}
              activeTool={activeTool}
              mousePosition={mousePosition}
              snapResult={snapResult}
              showDimensions={activeTool === 'section'}
              showGrid={showGrid}
              gridSize={gridSize}
              selectionBoxStart={selectionBoxStart}
              selectionBoxEnd={selectionBoxEnd}
            />
          </Canvas>

          {/* 空状态提示 */}
          {!svgUrl && (
            <div tabIndex={-1} className="absolute inset-0 flex items-center justify-center pointer-events-none focus:outline-none">
              <div className="bg-white px-8 py-6 rounded-xl shadow-lg text-center pointer-events-auto">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Upload Venue Map</h2>
                <p className="text-slate-500 text-sm mb-4">
                  Upload an SVG file to view the venue layout
                </p>
                <Button onClick={triggerFileUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select SVG File
                </Button>
              </div>
            </div>
          )}

          {/* 悬浮控件 */}
          <FloatingControls
            onPanUp={handlePanUp}
            onPanDown={handlePanDown}
            onPanLeft={handlePanLeft}
            onPanRight={handlePanRight}
            onResetCenter={resetView}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        </div>

        {/* 右侧属性面板 */}
        <PanelRight
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
        />
      </div>
    </div>
  );
}

export default App;
