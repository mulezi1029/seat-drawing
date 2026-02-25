# 区域绘制功能设计方案

## 一、坐标系统

### 1.1 架构概述

采用 Screen → World 两层坐标系统，所有图形数据统一使用 **World 坐标** 存储：

| 坐标系 | 用途 | 范围/说明 |
|--------|------|-----------|
| Screen | 鼠标事件、视口位置 | `e.clientX/clientY`, `scrollLeft/Top` |
| World | 数据存储、图形渲染 | (-25000, -25000) ~ (25000, 25000)，原点位于画布中心 |

### 1.2 坐标转换

```typescript
// Screen → World（鼠标事件转世界坐标）
function screenToWorld(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  offsetX: number,
  offsetY: number,
  scale: number
): Point {
  const relativeX = clientX - containerRect.left + offsetX;
  const relativeY = clientY - containerRect.top + offsetY;
  const worldX = (relativeX - WORLD_CENTER) / scale + WORLD_CENTER;
  const worldY = (relativeY - WORLD_CENTER) / scale + WORLD_CENTER;
  return { x: worldX, y: worldY };
}

// World → Screen（世界坐标转屏幕位置）
function worldToScreen(
  worldX: number,
  worldY: number,
  offsetX: number,
  offsetY: number,
  scale: number
): Point {
  const screenX = (worldX - WORLD_CENTER) * scale + WORLD_CENTER - offsetX;
  const screenY = (worldY - WORLD_CENTER) * scale + WORLD_CENTER - offsetY;
  return { x: screenX, y: screenY };
}
```

### 1.3 SVG 渲染

SVG 使用固定尺寸 `50000×50000`，通过 `matrix` 实现以中心为原点的缩放：

```tsx
<svg width={50000} height={50000}>
  <g transform={`matrix(${scale}, 0, 0, ${scale}, ${(1 - scale) * WORLD_CENTER}, ${(1 - scale) * WORLD_CENTER})`}>
    {/* 图形直接使用 World 坐标 */}
  </g>
</svg>
```

---

## 二、核心类型定义

```typescript
// 区域（Section）
interface Section {
  id: string;
  name: string;
  points: Point[];      // 多边形顶点（World 坐标）
  color: string;
  seats: Seat[];
  opacity: number;
}

// 吸附结果
interface SnapResult {
  point: Point;
  type: 'none' | 'grid' | 'vertex' | 'angle';
  source?: Point;       // 吸附源点（用于辅助线）
  angle?: number;
  alignment?: AlignmentResult;
}

// 对齐检测结果
interface AlignmentResult {
  isHorizontalAligned: boolean;
  isVerticalAligned: boolean;
  horizontalSource?: Point;
  verticalSource?: Point;
  snappedPoint?: Point;  // 吸附后的点（X或Y坐标被吸附到对齐源点）
}
```

---

## 三、绘制工具实现

### 3.1 矩形绘制（拖拽式）

**交互流程：**

```
鼠标按下 → 记录起点 → isDrawing = true
    ↓
鼠标移动 → 计算当前点 → 更新矩形预览（4个顶点）
    ↓
鼠标释放 → 保存 Section → 重置状态
```

**Shift 约束正方形：**

```typescript
if (isShiftPressed) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  end.x = start.x + Math.sign(dx) * size;
  end.y = start.y + Math.sign(dy) * size;
}
```

**Ctrl 中心绘制：**

```typescript
if (isCtrlPressed) {
  const center = start;
  const dx = end.x - center.x;
  const dy = end.y - center.y;
  // 以中心点对称生成矩形
  return createRectanglePoints(
    { x: center.x - dx, y: center.y - dy },
    { x: center.x + dx, y: center.y + dy }
  );
}
```

### 3.2 多边形绘制（点击式）

**交互流程：**

```
第一次点击 → 添加第一个顶点 → isDrawing = true
    ↓
后续点击 → 添加新顶点 → 绘制边线
    ↓
双击/点击起点/按 Enter → 闭合多边形 → 保存 Section
    ↓
按 ESC/右键 → 取消绘制
```

**闭合检测：**

```typescript
const distance = getDistance(currentPoint, firstPoint);
const isClosing = distance < 20 / scale;  // 20px 容差
```

---

## 四、辅助功能实现

### 4.1 网格吸附

```typescript
function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}
```

### 4.2 顶点吸附

```typescript
// 15px 容差内吸附到已有顶点
for (const vertex of vertices) {
  if (getDistance(point, vertex) < 15) {
    return { point: vertex, type: 'vertex', source: vertex };
  }
}
```

### 4.3 角度吸附（Shift 约束）

```typescript
// Shift 按下时，相对于上一点约束为 0°/45°/90°/135°/180°/225°/270°/315°
const angles = [0, 45, 90, 135, 180, 225, 270, 315];
const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
// 找到最接近的角度（5° 容差）
```

### 4.4 对齐检测与吸附

**对齐检测：**

```typescript
function findAlignment(point: Point, vertices: Point[], tolerance: number): AlignmentResult {
  // tolerance = 5/scale（缩放自适应，约 5 屏幕像素）
  for (const vertex of vertices) {
    if (Math.abs(point.y - vertex.y) < tolerance) {
      // 水平对齐
    }
    if (Math.abs(point.x - vertex.x) < tolerance) {
      // 垂直对齐
    }
  }
  // 返回吸附后的点：水平对齐吸附Y，垂直对齐吸附X
  return {
    isHorizontalAligned,
    isVerticalAligned,
    horizontalSource,
    verticalSource,
    snappedPoint: {
      x: verticalSource ? verticalSource.x : point.x,
      y: horizontalSource ? horizontalSource.y : point.y,
    }
  };
}
```

**对齐吸附行为：**
- 水平对齐时：光标的 **Y 坐标** 自动吸附到对齐点的 Y 坐标
- 垂直对齐时：光标的 **X 坐标** 自动吸附到对齐点的 X 坐标
- 两个方向都对齐时：X 和 Y 同时吸附
- 容差：`5/scale`（缩放自适应，约 5 屏幕像素）

---

## 五、视觉反馈

### 5.1 鼠标跟随线（多边形模式）

**实线连接，优先使用吸附点：**

```tsx
// 使用吸附点（顶点吸附/网格吸附/对齐吸附）或鼠标位置
const targetPoint = snapResult && snapResult.type !== 'none'
  ? snapResult.point
  : alignment?.snappedPoint
    ? alignment.snappedPoint
    : mousePosition;

{isPolygon && targetPoint && lastPoint && (
  <line
    x1={lastPoint.x} y1={lastPoint.y}
    x2={targetPoint.x} y2={targetPoint.y}
    stroke="#3b82f6"
    strokeWidth={2 / scale}
    strokeLinecap="round"
  />
)}
```

### 5.2 尺寸标注（矩形模式）

实时显示矩形的宽度和高度：

```tsx
<text x={centerX} y={minY - 10/scale} textAnchor="middle">
  {Math.round(width)}px
</text>
<text x={maxX + 10/scale} y={centerY} dominantBaseline="middle">
  {Math.round(height)}px
</text>
```

### 5.3 光标辅助线（矩形/多边形模式）

**蓝色实线，对齐时变绿色实线：**

```tsx
// 水平线 + 垂直线，贯穿整个画布，统一使用实线
<line
  x1={x - 10000} y1={y} x2={x + 10000} y2={y}
  stroke={horizontalColor}
  strokeWidth={1 / scale}
/>
<line
  x1={x} y1={y - 10000} x2={x} y2={y + 10000}
  stroke={verticalColor}
  strokeWidth={1 / scale}
/>

// 颜色逻辑：对齐时绿色，否则蓝色
const horizontalColor = alignment?.isHorizontalAligned ? '#22c55e' : '#3b82f6';
const verticalColor = alignment?.isVerticalAligned ? '#22c55e' : '#3b82f6';

// 触发条件：矩形模式或多边形模式下正在绘制时显示
{(activeTool === 'section' || activeTool === 'polygon') && isDrawing && (
  <CursorGuideLayer ... />
)}
```

### 5.4 预览点（多边形模式）

```tsx
// 默认橙色，吸附时红色
const fillColor = isSnapped ? '#ef4444' : '#f97316';
<circle cx={x} cy={y} r={8/scale} fill={fillColor} stroke="white" />
```

### 5.5 网格显示

**可选的网格背景：**

```tsx
const GridLayer: React.FC = ({ scale, gridSize }) => {
  // 绘制垂直线和水平线（实线，strokeWidth 统一为 1/scale）
  for (let x = worldMin; x <= worldMax; x += gridSize) {
    <line
      x1={x} y1={worldMin} x2={x} y2={worldMax}
      stroke="#e5e7eb"
      strokeWidth={1 / scale}
    />
  }
  for (let y = worldMin; y <= worldMax; y += gridSize) {
    <line
      x1={worldMin} y1={y} x2={worldMax} y2={y}
      stroke="#e5e7eb"
      strokeWidth={1 / scale}
    />
  }
};
```

### 5.6 闭合提示（多边形模式）

**鼠标靠近第一个点时显示闭合提示：**

```tsx
const distance = Math.hypot(targetPoint.x - firstPoint.x, targetPoint.y - firstPoint.y);
const closeThreshold = 20 / scale;

if (distance < closeThreshold) {
  return (
    <>
      <circle
        cx={firstPoint.x} cy={firstPoint.y}
        r={15 / scale}
        fill="rgba(34, 197, 94, 0.3)"
        stroke="#22c55e"
      />
      <text>点击闭合</text>
    </>
  );
}
```

### 5.7 吸附高亮

```tsx
// 顶点吸附时显示对齐线（实线，strokeWidth 统一为 1/scale）
{type === 'vertex' && (
  <>
    <line
      x1={source.x} y1={source.y - 1000}
      x2={source.x} y2={source.y + 1000}
      stroke="#22c55e"
      strokeWidth={1 / scale}
    />
    <line
      x1={source.x - 1000} y1={source.y}
      x2={source.x + 1000} y2={source.y}
      stroke="#22c55e"
      strokeWidth={1 / scale}
    />
  </>
)}
```

---

## 六、交互规范

### 6.1 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Shift` | 约束模式：矩形→正方形，多边形→角度约束 |
| `Ctrl/Cmd` | 矩形从中心点绘制 |
| `ESC` | 取消当前绘制 |
| `Backspace` | 删除上一个顶点（多边形模式） |
| `Enter` | 完成绘制（多边形模式） |

### 6.2 鼠标操作

| 操作 | 功能 |
|------|------|
| 左键拖拽 | 矩形绘制 |
| 左键点击 | 多边形添加顶点 |
| 双击 | 多边形闭合 |
| 右键 | 取消绘制 |
| 中键/空格+拖拽 | 平移画布 |
| Ctrl+滚轮 | 缩放 |

### 6.3 吸附优先级

1. 顶点吸附（15px 容差）
2. 网格吸附（10px 容差）
3. 角度吸附（5° 容差，Shift 模式）
4. 对齐检测（`5/scale` 缩放自适应容差，约 5 屏幕像素，自动吸附 X/Y 坐标）

### 6.4 对齐吸附行为

**当光标位置与已有顶点水平/垂直对齐时：**

| 对齐类型 | 吸附行为 | 视觉反馈 |
|----------|----------|----------|
| 水平对齐 | Y 坐标吸附到对齐点的 Y 值 | 水平辅助线变绿色实线 |
| 垂直对齐 | X 坐标吸附到对齐点的 X 值 | 垂直辅助线变绿色实线 |
| 双向对齐 | X 和 Y 同时吸附 | 两条辅助线都变绿色实线 |

**注意：** 对齐吸附仅在顶点吸附未触发时生效（避免冲突）

---

## 七、组件架构

### 7.1 组件层级

```
App.tsx
├── Canvas.tsx（事件处理、坐标转换）
│   └── SVGRenderer.tsx（SVG 渲染）
│       ├── BackgroundLayer（背景图）
│       ├── SectionsLayer（已绘制区域）
│       ├── DrawingPreviewLayer（绘制预览）
│       ├── GuideLinesLayer（吸附辅助线）
│       ├── CursorGuideLayer（光标辅助线）
│       └── PolygonPreviewPoint（预览点）
└── Toolbar.tsx（工具栏）
```

### 7.2 状态流向

```
App State
    ↓ props
Canvas（鼠标事件）
    ↓ 计算 worldPoint, snap, alignment
    ↓ 回调 onMousePositionChange, onSnapResultChange
    ↓ 回调 onDrawingComplete
App（更新 sections）
    ↓ props
SVGRenderer（渲染）
```

---

## 八、文件职责

| 文件 | 职责 |
|------|------|
| `app/src/App.tsx` | 应用状态管理、Section 列表、绘制完成回调 |
| `app/src/components/canvas/Canvas.tsx` | 鼠标事件处理、坐标转换、键盘事件、对齐计算 |
| `app/src/components/canvas/SVGRenderer.tsx` | SVG 分层渲染（区域、预览、辅助线） |
| `app/src/utils/coordinate.ts` | 坐标转换、网格吸附、顶点吸附、角度吸附、对齐检测 |
| `app/src/types/index.ts` | 类型定义（Point, Section, SnapResult, AlignmentResult） |

---

## 九、关键实现细节

### 9.1 线条宽度自适应

所有线条宽度需除以缩放比例，确保视觉上粗细一致：

```typescript
const strokeWidth = 2 / scale;
```

### 9.2 对齐容差

对齐检测使用 **`5/scale` 缩放自适应** 容差（约 5 屏幕像素），确保精确对齐的同时容易触发：

```typescript
const alignment = findAlignment(point, allVertices, 5 / scale);
```

**吸附后的点计算：**

```typescript
const snappedPoint: Point = {
  x: verticalSource ? verticalSource.x : point.x,
  y: horizontalSource ? horizontalSource.y : point.y,
};
```

### 9.3 顶点收集

从所有 Section 中收集顶点用于吸附和对齐：

```typescript
const allVertices = sections.flatMap(s => s.points);
```

---

## 十、验证清单

### 基础功能

- [ ] 坐标转换：画布中心点击 → 世界坐标接近 (0, 0)
- [ ] 矩形绘制：拖拽创建，实时预览，释放保存
- [ ] 多边形绘制：点击添加顶点，双击/点击起点闭合
- [ ] Shift 约束：矩形→正方形，多边形→角度约束
- [ ] Ctrl 中心：矩形从中心向四周绘制

### 视觉反馈

- [x] 鼠标跟随线：多边形模式下显示**蓝色实线**连接最后一个点和目标点（使用吸附点）
- [x] 尺寸标注：矩形模式下实时显示宽高
- [x] 光标辅助线：矩形/多边形模式下显示蓝色实线十字，对齐时变绿色
- [x] 对齐变色：与顶点水平/垂直对齐时对应辅助线变**绿色实线**，另一方向保持蓝色实线
- [x] 对齐吸附：水平对齐时吸附 Y 坐标，垂直对齐时吸附 X 坐标
- [x] 预览点：多边形模式下光标处显示橙色点，吸附时变红色
- [x] 吸附反馈：靠近顶点时预览点变红，显示对齐线
- [x] 网格显示：可开关的网格背景（10px/50px/100px）
- [x] 闭合提示：鼠标靠近第一个点时显示绿色提示圈

### 交互

- [ ] ESC 取消绘制
- [ ] Backspace 删除上一个顶点（多边形）
- [ ] 右键取消绘制
- [ ] 网格吸附（可选）
- [ ] 顶点吸附（15px 容差）
