# 画布平移与缩放功能实现文档

## 功能概述

画布系统提供多种平移与缩放交互方式，与 seats.io 保持一致的用户体验，支持鼠标、键盘、触控板等多种输入设备。

### 功能特性总览

| 功能 | 触发方式 | 适用场景 |
|------|---------|---------|
| **空格拖拽平移** | 按住空格 + 左键拖拽 | 临时快速浏览画布内容 |
| **Hand 工具平移** | 选中 Hand 工具 + 左键拖拽 | 长时间浏览模式 |
| **鼠标中键平移** | 按住鼠标中键拖拽 | 无需切换工具的快速平移 |
| **滚轮平移** | 滚轮上下/Shift+滚轮 | 精确微调位置 |
| **方向键平移** | 点击方向控制环箭头 | 固定距离步进移动 |
| **摇杆平移** | 拖拽方向控制环中心摇杆 | 360° 连续平滑移动 |
| **滚轮缩放** | Ctrl/Cmd + 滚轮 | 以鼠标位置为中心缩放 |
| **按钮缩放** | 点击 +/- 按钮 | 以视口中心缩放 |
| **重置视图** | 点击方向控制环中心/摇杆 | 快速回到画布中心 |

### 交互优先级

当多种交互同时触发时，按以下优先级处理：

1. **拖拽平移** > 滚轮平移（拖拽时禁用滚轮平移）
2. **滚轮缩放** > 滚轮平移（Ctrl/Cmd 按下时优先缩放）
3. **空格临时模式** > Hand 工具（空格按下时临时覆盖当前工具）

## 平移功能 (Pan)

### 1. 鼠标拖拽平移

**触发条件：**

| 触发方式 | 按键组合 | 说明 |
|---------|---------|------|
| 空格临时模式 | `Space` + 左键拖拽 | 按住空格时临时切换到 Hand 工具，释放后恢复原工具 |
| Hand 工具模式 | 选中 Hand 工具 + 左键拖拽 | 工具栏点击 Hand 图标进入持续平移模式 |
| 鼠标中键 | 鼠标中键拖拽 | 无需切换工具，任何状态下可用 |

**交互流程：**

```
用户按下空格/选择Hand工具 → 光标变为 grab → 按下左键 → 光标变为 grabbing
                                    ↓
                              拖拽移动鼠标 ← 计算 deltaX/deltaY
                                    ↓
                         直接操作 DOM scrollLeft/scrollTop
                                    ↓
                              释放鼠标 → 光标恢复 grab/default
```

**光标状态流转：**

```
default ──[空格按下/Hand工具选中]──→ grab ──[按下左键]──→ grabbing
                                        ↑                    │
                                        └────[释放左键]──────┘
```

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

**状态同步实现：**

由于 Canvas 的 `isSpacePressed` 状态与 PanelLeft 的 `activeTool` 状态相互独立，需要状态提升：

```typescript
// App.tsx - 状态提升到根组件
const [activeTool, setActiveTool] = useState<string>('select');
const [previousTool, setPreviousTool] = useState<string>('select');
const [isSpacePressed, setIsSpacePressed] = useState(false);

// 空格键按下：临时切换到 Hand 工具
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      setPreviousTool(activeTool);
      setActiveTool('hand');
      setIsSpacePressed(true);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setActiveTool(previousTool);
      setIsSpacePressed(false);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, [activeTool, previousTool]);
```

- 空格键按下：保存当前工具到 `previousTool`，切换到 'hand' 工具
- 空格键释放：从 `previousTool` 恢复之前的工具
- Hand 工具选中：`activeTool === 'hand'` 时也能触发平移

### 2. 方向控制环平移

**位置：** 画布左下角悬浮控件 (NavigationHUD)

**布局结构：**

```
        ↑ (上)
   ←  [摇杆]  →  [+/-]
        ↓ (下)
```

**按键功能：**

| 按钮 | 功能 | 平移距离 | 触发方式 |
|------|------|---------|---------|
| ↑ 上箭头 | 向上平移 | 100px | 单击 |
| ↓ 下箭头 | 向下平移 | 100px | 单击 |
| ← 左箭头 | 向左平移 | 100px | 单击 |
| → 右箭头 | 向右平移 | 100px | 单击 |
| 中心摇杆 | 360° 平移 | 连续可变 | 拖拽（见 2.1） |
| [+] 按钮 | 放大 | 1.03x | 单击 |
| [-] 按钮 | 缩小 | 1/1.03x | 单击 |

**交互特性：**

- **固定步长**：每次点击精确移动 100 像素，适合精确定位
- **快速连击**：支持快速连续点击实现平滑移动
- **状态同步**：与鼠标拖拽/滚轮操作的位置实时同步，无跳变

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

**触发方式：**

| 位置 | 操作 | 说明 |
|------|------|------|
| 方向控制环中心按钮 | 单击 | 旧版按钮，已替换为摇杆 |
| 摇杆（未拖拽） | 单击 | 现代交互方式，点击即重置 |
| 快捷键 | `Ctrl/Cmd + 0` | 待实现 |

**重置效果：**

```
重置前: scale=任意, offsetX=任意, offsetY=任意
       ↓
重置后: scale=1 (100%), offsetX=25000 - window.innerWidth/2, offsetY=25000 - window.innerHeight/2
       ↓
结果: 画布中心点 (25000, 25000) 精确对齐视口中心
```

**使用场景：**

- 迷失在无限画布中时快速找回中心
- 开始编辑前回到标准视图
- 演示或截图时获取标准视角

### 4. 滚轮平移

**触发方式：**

| 输入方式 | 操作 | 平移方向 | 灵敏度 |
|---------|------|---------|--------|
| 标准滚轮 | 上下滚动 | 垂直平移 | deltaY × 1 |
| Shift + 滚轮 | 上下滚动 | 水平平移 | deltaY × 1 |
| 触控板双指 | 上下滑动 | 垂直平移 | deltaY × 1 |
| 触控板双指 | 左右滑动 | 水平平移 | deltaX × 1 |

**使用场景：**

- **精确微调**：小幅度调整画布位置
- **快速浏览**：大幅滚动快速跳转
- **触控板操作**：笔记本电脑触控板双指滑动

**性能优化：**

```typescript
// 滚轮期间使用 ref 标记，跳过 React 状态同步
isWheelingRef.current = true;  // 滚轮开始
// ... 直接操作 DOM ...
// 150ms 后标记结束，同步一次状态
setTimeout(() => isWheelingRef.current = false, 150);
```

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

**触发条件：**

| 平台 | 快捷键 | 说明 |
|------|--------|------|
| Windows/Linux | `Ctrl` + 滚轮 | 按住 Ctrl 键滚动鼠标滚轮 |
| macOS | `Cmd` + 滚轮 | 按住 Command 键滚动鼠标滚轮 |
| 触控板 | `Ctrl` + 双指滑动 | 双指滑动配合 Ctrl 键 |

**交互行为：**

```
Ctrl/Cmd 按下 + 滚轮向上 → 放大画布 (以鼠标位置为中心)
Ctrl/Cmd 按下 + 滚轮向下 → 缩小画布 (以鼠标位置为中心)
```

**缩放参数：**

| 参数 | 值 | 说明 |
|------|-----|------|
| 步长 | 3% | 每次滚动缩放 3%，提供精细控制 |
| 放大因子 | 1.03 | `newScale = scale × 1.03` |
| 缩小因子 | 0.97 | `newScale = scale × 0.97` |
| 最小缩放 | 10% | `MIN_ZOOM = 0.1` |
| 最大缩放 | 500% | `MAX_ZOOM = 5` |

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

**位置：** 方向控制环右侧的 `+` / `-` 按钮

**行为对比：**

| 特性 | 滚轮缩放 | 按钮缩放 |
|------|---------|---------|
| 缩放中心 | 鼠标指针位置 | 视口中心 (window.innerWidth/2, window.innerHeight/2) |
| 控制精度 | 连续可变 | 固定步长 3% |
| 适用场景 | 精确聚焦某区域 | 整体视图调整 |

**交互流程：**

```
点击 [+] → 以视口中心为锚点 → scale × 1.03
点击 [-] → 以视口中心为锚点 → scale ÷ 1.03
```

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

**算法原理：**

在缩放过程中保持鼠标/中心点在世界坐标系中的位置不变，仅改变缩放比例。

**坐标变换过程：**

```
Screen (sx, sy)              World (wx, wy)
     │                              ↑
     │    ① 减去视口偏移              │
     ↓                              │
Viewport (vx, vy) ───────────────┘
     │    ② 除以缩放比例              │
     ↓                              │
World' (wx', wy') ───────────────┘
```

**计算公式：**

```
// 保持中心点不变
newOffsetX = WORLD_CENTER - (WORLD_CENTER - offsetX - centerX) × zoomFactor - centerX
newOffsetY = WORLD_CENTER - (WORLD_CENTER - offsetY - centerY) × zoomFactor - centerY
```

**直观理解：**

想象你在地图上看一个标记点：
- 放大时：地图内容变大，为了让标记点仍在原来的屏幕位置，需要调整地图的位置
- 缩小时：地图内容变小，同样调整地图位置保持标记点不动

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

## 快捷键总览

| 快捷键 | 功能 | 范围 |
|--------|------|------|
| `Space` + 拖拽 | 临时平移模式 | 画布区域 |
| `Ctrl/Cmd` + 滚轮 | 缩放 | 画布区域 |
| `Shift` + 滚轮 | 水平平移 | 画布区域 |
| `Ctrl/Cmd` + `0` | 重置视图（待实现） | 全局 |

## 边界情况与异常处理

### 缩放边界

```typescript
// 缩放值被限制在 [0.1, 5] 范围内
const clampedScale = Math.max(0.1, Math.min(5, newScale));
```

- 达到最小缩放时继续缩小无效果（不报错）
- 达到最大缩放时继续放大无效果（不报错）

### 平移边界

- 画布无硬边界限制，可无限平移
- 实际使用 scrollLeft/scrollTop 实现，受限于浏览器整数精度

### 并发操作处理

```typescript
// 优先级: 拖拽 > 滚轮
if (isDraggingRef.current) return; // 拖拽期间忽略滚轮
if (isWheelingRef.current) return; // 滚轮期间忽略滚动同步
```

### 状态同步延迟问题

**问题：** 鼠标拖拽直接操作 DOM，React 状态可能滞后

**解决：**
1. 拖拽期间使用 `isDraggingRef` 标记跳过状态同步
2. 方向控制环平移前直接从 DOM 读取当前位置
3. 使用 `setOffset` 设置绝对位置而非相对累加

### 2.1 摇杆控制（中心 360° 平移）

**功能特性：**

- **360° 全向控制**：拖拽方向决定画布移动方向
- **速度感应**：拖拽距离越远，移动速度越快
- **点击重置**：轻触不拖拽可重置视图中心

**交互流程：**

```
鼠标按下摇杆 → 记录起始位置
       ↓
拖拽移动 → 计算偏移向量 (dx, dy)
       ↓
转换为极坐标 → 角度(方向) + 距离(速度)
       ↓
requestAnimationFrame 循环 → 持续平移画布
       ↓
释放鼠标 → 停止动画，摇杆回弹到中心
```

**速度与距离关系：**

```typescript
// 最大拖拽半径: 12px
// 速度系数: 8 像素/帧
const speed = 8 * (dragDistance / 12); // 0 ~ 8 px/frame
```

**点击 vs 拖拽判定：**

| 操作 | 判定条件 | 触发动作 |
|------|---------|---------|
| 点击 | 移动距离 ≤ 3px | 重置视图中心 |
| 拖拽 | 移动距离 > 3px | 开始摇杆平移 |

### 5.1 需求分析

方向环中间改为摇杆，支持 360 度控制画布移动，点击摇杆即为重置视图中心。

### 5.2 Joystick 组件实现

在 `FloatingControls.tsx` 中创建可拖拽的摇杆组件：

```tsx
interface JoystickProps {
  onPan: (dx: number, dy: number) => void;  // 平移回调
  onReset: () => void;  // 点击(不拖拽)时重置
}

const Joystick: React.FC<JoystickProps> = ({ onPan, onReset }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const joystickStateRef = useRef({ angle: 0, distance: 0, active: false });
  const MAX_RADIUS = 12; // 最大拖拽半径(px)
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // 动画循环
  const animate = useCallback(() => {
    if (joystickStateRef.current.active) {
      const { angle, distance } = joystickStateRef.current;
      const speed = 8 * distance; // 距离越大速度越快，每帧移动像素
      const rad = (angle * Math.PI) / 180;
      const dx = Math.cos(rad) * speed;
      const dy = Math.sin(rad) * speed;
      onPan(dx, dy);
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [onPan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    hasMovedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!isDragging) {
      joystickStateRef.current.active = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      const rawDistance = Math.sqrt(dx * dx + dy * dy);
      const distance = Math.min(rawDistance, MAX_RADIUS);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      if (rawDistance > 3) {
        hasMovedRef.current = true;
      }

      const rad = Math.atan2(dy, dx);
      const x = Math.cos(rad) * distance;
      const y = Math.sin(rad) * distance;
      setPosition({ x, y });

      joystickStateRef.current = { angle, distance: distance / MAX_RADIUS, active: true };

      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseUp = () => {
      if (!hasMovedRef.current) {
        onReset();
      }
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      joystickStateRef.current.active = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onReset, animate]);

  return (
    <div
      className="relative w-6 h-6 cursor-pointer"
      onMouseDown={handleMouseDown}
      title="Drag to pan, click to reset center"
    >
      {/* 轨道 */}
      <div className="absolute inset-0 rounded-full border-2 border-gray-300 bg-white" />
      {/* 摇杆头 */}
      <div
        className={`absolute w-3 h-3 bg-blue-500 rounded-full transition-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          left: '6px',
          top: '6px',
        }}
      />
    </div>
  );
};
```

### 5.3 NavigationHUD 集成

替换中心按钮为 Joystick 组件：

```tsx
// 中心摇杆 - 支持 360 度控制
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
  <Joystick
    onPan={(dx, dy) => {
      onPan?.(dx, dy);
    }}
    onReset={onResetCenter}
  />
</div>
```

### 5.4 摇杆交互逻辑

- **鼠标按下**: 开始拖拽，记录起始位置
- **拖拽时**: 计算相对于中心的角度和距离，根据距离比例控制移动速度
- **鼠标释放**: 如果移动距离很小(≤3px)则视为点击，触发重置视图
- **支持 360 度**: 全方向控制画布移动
- **速度控制**: 距离中心越远，画布移动速度越快

### 5.5 测试要点

1. 拖拽摇杆可 360 度控制画布移动方向
2. 拖拽距离越大，画布移动速度越快
3. 轻轻点击摇杆(不拖拽)可重置视图中心
4. 释放摇杆后摇杆头自动回到中心位置
5. 移动过程中动画流畅，无卡顿

## 相关文件

| 文件 | 功能 | 关键导出 |
|------|------|---------|
| `Canvas.tsx` | 拖拽平移、滚轮缩放事件处理 | `Canvas` 组件（支持 forwardRef） |
| `FloatingControls.tsx` | 方向控制环、缩放按钮 UI、摇杆控制 | `NavigationHUD`, `Joystick` 组件 |
| `useSimpleViewer.ts` | 平移/缩放状态管理和操作 | `useSimpleViewer` Hook |
| `App.tsx` | 状态管理、组件连接 | 根组件 |
| `SVGRenderer.tsx` | SVG 变换渲染 | `SVGRenderer` 组件 |
| `PanelLeft.tsx` | 左侧工具栏 | 工具选择状态 |

## 实现要点总结

1. **性能优先**：拖拽和滚轮期间直接操作 DOM，跳过 React 渲染周期
2. **状态分离**：光标样式单独管理，不与平移状态耦合
3. **引用同步**：使用 ref 标记操作状态，避免状态延迟问题
4. **坐标转换**：缩放时精确计算偏移量保持中心点不变
5. **降级兼容**：支持鼠标、键盘、触控板等多种输入方式


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

