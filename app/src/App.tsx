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

  // Canvas 容器引用 - 用于获取实际滚动位置
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 处理工具切换
   */
  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
  }, []);

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
    debugger;
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
        <div ref={canvasContainerRef} className="flex-1 relative bg-white overflow-scroll">
          <Canvas
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            isSpacePressed={isSpacePressed}
            activeTool={activeTool}
            onScaleChange={handleScaleChange}
            onOffsetChange={handleOffsetChange}
          >
            {/* SVG 渲染内容 */}
            <SVGRenderer scale={scale} svgUrl={svgUrl} />
          </Canvas>

          {/* 空状态提示 */}
          {!svgUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
        <PanelRight />
      </div>
    </div>
  );
}

export default App;
