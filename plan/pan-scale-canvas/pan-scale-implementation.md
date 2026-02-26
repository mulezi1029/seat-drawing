# 画布平移与缩放功能实现文档

## 功能概述

画布系统支持多种平移和缩放方式，与 seats.io 保持一致的用户体验。

## 平移功能 (Pan)

### 1. 鼠标拖拽平移

**触发方式：**

- 按住空格键 + 左键拖拽
- Hand 工具选中 + 左键拖拽

**实现代码：** `Canvas.tsx`

```typescript
// 使用 ref 存储拖拽状态，避免拖拽过程中触发 React 重渲染导致抖动
const isPanningRef = useRef(false);
const panStartRef = useRef<{ x: number; y: number } | null>(null);
const [cursorStyle, setCursorStyle] = useState('default');

// 判断是否应触发平移
const shouldPan = useCallback(
  (e: React.MouseEvent | MouseEvent) => {
    return e.button === 1 || ((isSpacePressed || isHandToolActive) && e.button === 0);
  },
  [isSpacePressed, isHandToolActive]
);

// 鼠标按下时开始平移
const handleMouseDown = useCallback(
  (e: React.MouseEvent) => {
    e.preventDefault();
    if (shouldPan(e)) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      setCursorStyle('grabbing');
    }
  },
  [shouldPan, setCursorStyle]
);

// 鼠标移动时直接操作 DOM，不触发 React 更新
const handleMouseMove = useCallback(
  (e: React.MouseEvent) => {
    if (isPanningRef.current && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      // 直接操作 DOM，不经过 React 渲染周期
      containerRef.current.scrollLeft -= dx;
      containerRef.current.scrollTop -= dy;

      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  },
  []
);

// 鼠标释放
const handleMouseUp = useCallback(() => {
  if (isPanningRef.current) {
    isPanningRef.current = false;
    panStartRef.current = null;
    // 恢复光标样式
    if (isSpacePressed || isHandToolActive) {
      setCursorStyle('grab');
    } else {
      setCursorStyle('default');
    }
  }
}, [isSpacePressed, isHandToolActive]);
```

**优化要点：**

1. **使用 ref 替代 state** 存储拖拽状态：`isPanningRef` 和 `panStartRef`
2. **直接操作 DOM** 更新滚动位置，不触发 React 重渲染
3. **跳过状态同步**：拖拽期间 `isDraggingRef` 标记为 true，`handleScroll` 跳过状态更新
4. **光标样式分离**：单独使用 `cursorStyle` state，只在必要时更新
5. **结果**：拖拽流畅，无抖动

**滚动同步控制：**

```typescript
// 用于跳过大容器滚动事件的标记
const isDraggingRef = useRef(false);

// 拖拽开始
isDraggingRef.current = true;

// 拖拽结束
isDraggingRef.current = false;

// 滚动同步时检查标记
const handleScroll = useCallback(() => {
  if (!containerRef.current) return;
  if (isDraggingRef.current || isWheelingRef.current) return;  // 跳过
  onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
}, [onOffsetChange]);
```

**光标样式：**

- 平移中：`grabbing`
- 空格按下或 Hand 工具选中：`grab`
- 默认：`default`

### 2. 方向控制环平移

**位置：** 画布左下角悬浮控件

**功能：**

- ↑ 上箭头：向上平移 100 像素
- ↓ 下箭头：向下平移 100 像素
- ← 左箭头：向左平移 100 像素
- → 右箭头：向右平移 100 像素

**实现代码：** `FloatingControls.tsx` + `useSimpleViewer.ts`

```typescript
// useSimpleViewer.ts - panBy 方法
const panBy = useCallback((deltaX: number, deltaY: number) => {
  setOffsetX((prev) => prev + deltaX);
  setOffsetY((prev) => prev + deltaY);
}, []);

// App.tsx - 事件处理（旧实现 - 基于状态累加）
const handlePanUp = useCallback(() => panBy(0, -100), [panBy]);
const handlePanDown = useCallback(() => panBy(0, 100), [panBy]);
const handlePanLeft = useCallback(() => panBy(-100, 0), [panBy]);
const handlePanRight = useCallback(() => panBy(100, 0), [panBy]);
```

**问题修复：状态同步延迟**

**问题描述：**
当用户先用鼠标拖拽或滚轮平移画布后，再点击方向控制环时，画布会从错误的位置开始平移。这是因为：

- 鼠标拖拽时直接操作 DOM `scrollLeft/scrollTop`，不立即同步到 React 状态
- React 状态 `offsetX/offsetY` 可能滞后于实际 DOM 滚动位置
- `panBy` 基于过期的状态累加，导致画布"跳回"错误位置

**解决方案（方案三）：直接读取 DOM 当前值**

```typescript
// App.tsx - Canvas 容器引用
const canvasContainerRef = useRef<HTMLDivElement>(null);

// 方向控制平移 - 基于 DOM 实际滚动位置计算，避免状态延迟问题
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

// Canvas 通过 forwardRef 暴露内部滚动容器
<Canvas ref={canvasContainerRef} ... />
```

**关键点：**

1. Canvas 组件使用 `forwardRef` + `useImperativeHandle` 暴露内部滚动容器
2. 平移前直接从 DOM 读取 `scrollLeft/scrollTop` 获取当前实际位置
3. 使用 `setOffset` 直接设置绝对位置（而非基于过期状态的相对累加）
4. 确保鼠标拖拽/滚轮后，方向控制能继续从当前位置平移

### 3. 重置视图中心

**触发方式：** 点击方向控制环中心按钮

**实现代码：**

```typescript
// useSimpleViewer.ts - resetView 方法
const resetView = useCallback(() => {
  setScaleState(1);
  setOffsetX(WORLD_CENTER - window.innerWidth / 2);
  setOffsetY(WORLD_CENTER - window.innerHeight / 2);
}, []);
```

将画布中心点 (25000, 25000) 移动到视口中心。

### 4. 滚轮平移

**触发方式：**

- 滚轮上下滚动：垂直平移画布
- Shift + 滚轮：水平平移画布

**实现代码：** `Canvas.tsx`

```typescript
// 滚轮移动优化：使用 ref 标记滚轮操作中，跳过状态同步
const isWheelingRef = useRef(false);
const wheelTimeoutRef = useRef<number | null>(null);

const handleWheel = useCallback(
  (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+滚轮：缩放处理（见缩放章节）
      // ...
    } else {
      // 普通滚轮：直接操作 DOM 移动画布，避免触发 React 状态更新循环
      if (!containerRef.current) return;

      e.preventDefault();

      // 标记滚轮操作中
      isWheelingRef.current = true;

      // 根据滚轮方向计算滚动偏移
      // deltaY: 垂直滚动，deltaX: 水平滚动（或 Shift+滚轮）
      const scrollSpeed = 1;
      containerRef.current.scrollLeft += e.deltaX * scrollSpeed;
      containerRef.current.scrollTop += e.deltaY * scrollSpeed;

      // 清除之前的 timeout
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
      }

      // 滚轮结束后延迟同步状态（用于方向控制环等 UI 同步）
      wheelTimeoutRef.current = window.setTimeout(() => {
        isWheelingRef.current = false;
        // 最后一次同步状态
        if (containerRef.current) {
          onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
        }
      }, 150);
    }
  },
  [scale, onScaleChange, onOffsetChange]
);
```

**滚动同步优化：**

```typescript
/**
 * 滚动位置变化时同步到状态
 * 拖拽或滚轮期间跳过，避免与直接 DOM 操作冲突
 */
const handleScroll = useCallback(() => {
  if (!containerRef.current) return;
  if (isDraggingRef.current || isWheelingRef.current) return;
  onOffsetChange(containerRef.current.scrollLeft, containerRef.current.scrollTop);
}, [onOffsetChange]);
```

**优化要点：**

1. **直接操作 DOM**：滚轮事件直接修改 `scrollLeft/scrollTop`，不经过 React 状态更新
2. **跳过状态同步**：滚轮期间 `isWheelingRef` 标记为 true，`handleScroll` 跳过状态同步
3. **延迟同步状态**：滚轮结束 150ms 后同步一次状态，用于方向控制环等 UI 控件更新
4. **结果**：滚轮平移流畅，无抖动

## 缩放功能 (Zoom)

### 1. 滚轮缩放

**触发方式：** Ctrl/Cmd + 滚轮

**实现代码：** `Canvas.tsx`

```typescript
const handleWheel = useCallback(
  (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // 阻止默认滚动行为和事件冒泡
      e.preventDefault();
      e.stopPropagation();

      // 根据滚轮方向计算缩放因子 (3% 步长)
      const zoomStep = 0.03;
      const zoomFactor = e.deltaY > 0 ? 1 - zoomStep : 1 + zoomStep;
      const newScale = scale * zoomFactor;

      onScaleChange(newScale, e.clientX, e.clientY);
    }
  },
  [scale, onScaleChange]
);
```

**原生事件监听：**

```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleNativeWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  };

  // passive: false 确保 preventDefault 生效
  container.addEventListener('wheel', handleNativeWheel, { passive: false });

  return () => {
    container.removeEventListener('wheel', handleNativeWheel);
  };
}, []);
```

**优化要点：**

1. **阻止事件冒泡**：`e.stopPropagation()` 防止事件被父元素拦截
2. **原生事件监听**：使用 `{ passive: false }` 确保 Chrome 中 `preventDefault` 生效
3. **精细缩放步长**：3% 步长提供更精细的缩放控制

### 2. 按钮缩放

**位置：** 方向控制环右侧的 +/- 按钮

**实现代码：** `useSimpleViewer.ts`

```typescript
// 放大
const zoomIn = useCallback(() => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  zoomAt(scale * ZOOM_STEP, centerX, centerY);
}, [scale, zoomAt]);

// 缩小
const zoomOut = useCallback(() => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  zoomAt(scale / ZOOM_STEP, centerX, centerY);
}, [scale, zoomAt]);
```

### 3. 以指定点为中心缩放

**算法：** 保持鼠标/中心点位置不变进行缩放

```typescript
const zoomAt = useCallback((newScale: number, centerX: number, centerY: number) => {
  const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
  const oldScale = scale;
  const zoomFactor = clampedScale / oldScale;

  // 计算新的偏移量，保持中心点不变
  const newOffsetX = WORLD_CENTER - (WORLD_CENTER - offsetX - centerX) * zoomFactor - centerX;
  const newOffsetY = WORLD_CENTER - (WORLD_CENTER - offsetY - centerY) * zoomFactor - centerY;

  setScaleState(clampedScale);
  setOffsetX(newOffsetX);
  setOffsetY(newOffsetY);
}, [scale, offsetX, offsetY]);
```

## 配置参数

```typescript
// types/index.ts
export const CANVAS_CONFIG = {
  WORLD_SIZE: 50000,    // 世界画布大小 50000x50000
  MIN_ZOOM: 0.1,        // 最小缩放 10%
  MAX_ZOOM: 5,          // 最大缩放 500%
} as const;

const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;  // 25000
const ZOOM_STEP = 1.03;  // 每次缩放 3%，提供更精细的控制
```

## 坐标系统

```
Screen (屏幕坐标 - 鼠标事件)
    ↓
Viewport (视口坐标 - 滚动位置)
    ↓
World (世界坐标 - 数据存储)

世界画布: 50000×50000 像素
中心点: (25000, 25000)
数据范围: (0, 0) ~ (50000, 50000)
```

## 相关文件


| 文件                     | 功能            |
| ---------------------- | ------------- |
| `Canvas.tsx`           | 拖拽平移、滚轮缩放事件处理 |
| `FloatingControls.tsx` | 方向控制环、缩放按钮 UI |
| `useSimpleViewer.ts`   | 平移/缩放状态管理和操作  |
| `App.tsx`              | 连接组件和 Hook    |
| `SVGRenderer.tsx`      | SVG 变换渲染      |


## 使用示例

```typescript
function App() {
  const {
    scale,
    offsetX,
    offsetY,
    panBy,      // 相对平移
    zoomAt,     // 指定中心缩放
    zoomIn,     // 放大
    zoomOut,    // 缩小
    resetView,  // 重置视图
    setOffset,  // 设置绝对偏移
  } = useSimpleViewer();

  return (
    <Canvas
      scale={scale}
      offsetX={offsetX}
      offsetY={offsetY}
      onScaleChange={zoomAt}
      onOffsetChange={setOffset}
    >
      <SVGRenderer scale={scale} />
    </Canvas>
  );
}
```

