# Section 绘制功能完整文档

## 概述

Section（区域）绘制工具用于创建多边形区域，支持实时预览、智能对齐辅助和多种交互方式完成绘制。本功能基于 Seats.io 风格设计，采用工具系统架构实现。

---

## 一、准备阶段：工具选择

### 1.1 工具激活

在左侧工具栏点击 Section 工具（多边形图标），系统切换到 `draw-section` 模式：

| 状态 | UI 反馈 |
|------|---------|
| 工具激活 | Section 按钮高亮显示 |
| 画布状态 | 鼠标变为十字准星（crosshair） |
| 底部状态栏 | 显示操作提示："Click to add point, Right click to remove last point, Double click or Enter to complete, Esc to cancel" |

### 1.2 技术实现

```typescript
// ToolContext 提供的方法
interface ToolContext {
  mode: EditorMode;  // 'draw-section' | 'draw-seat' | 'select' | ...
  setMode: (mode: EditorMode) => void;
  // ...
}

// DrawSectionTool 激活时
onActivate() {
  this.isActive = true;
  this.points = this.context.sectionPoints; // 继承已有状态
}
```

---

## 二、绘制阶段：多边形模式

### 2.1 开始绘制（首次点击）

**视觉反馈：**

| 元素 | 样式 | 说明 |
|------|------|------|
| 第一个顶点 | 绿色圆点（半径 6px）+ 白色描边 | 标记多边形起点，可点击闭合 |
| 预览线 | 蓝色虚线（#3b82f6，dasharray: 4,4） | 从最后一点跟随鼠标到当前位置 |
| 跟随光标 | 十字准星 + 节点预览 | 指示当前绘制位置 |

**技术实现：**

```typescript
// DrawSectionTool.ts
private addPoint(point: Point): void {
  this.context.addSectionPoint(point);
  this.points = this.context.sectionPoints;
}

// OverlayRenderer.ts - 渲染绘制预览
renderDrawingPreview(points: Point[], currentPos: Point | null): void {
  // 1. 绘制已完成的线段（蓝色实线）
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('stroke', '#3b82f6');
  polyline.setAttribute('stroke-width', '2');

  // 2. 绘制预览线（蓝色虚线）
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('stroke', '#3b82f6');
  line.setAttribute('stroke-dasharray', '4,4');

  // 3. 绘制顶点
  points.forEach((point, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', index === 0 ? '6' : '4');
    circle.setAttribute('fill', index === 0 ? '#10b981' : '#3b82f6');
  });
}
```

### 2.2 添加中间节点

**视觉反馈：**

- 每点击一次，新增一个蓝色方块节点（半径 4px）
- 节点之间以蓝色实线（#3b82f6，2px）连接
- 最后一个节点与鼠标之间保持虚线预览

**交互方式：**

| 操作 | 功能 | 实现方法 |
|------|------|----------|
| 左键点击 | 添加顶点 | `DrawSectionTool.onMouseDown()` |
| 右键点击 | 删除最后一个顶点 | `context.removeLastSectionPoint()` |
| Backspace/Delete | 删除最后一个顶点 | 键盘事件处理 |
| Ctrl+Z | 撤销最后一个点 | 命令系统 undo |

### 2.3 对齐辅助线系统

#### 辅助线显示

| 辅助线 | 默认状态 | 对齐状态 | 触发条件 |
|--------|----------|----------|----------|
| 水平辅助线 | 灰色实线（#94a3b8，1px） | **绿色实线**（#22c55e，2px） | 鼠标 Y 坐标与某已有点相同（±5px 阈值） |
| 垂直辅助线 | 灰色实线（#94a3b8，1px） | **绿色实线**（#22c55e，2px） | 鼠标 X 坐标与某已有点相同（±5px 阈值） |
| 对齐标记 | - | 绿色小圆点（#22c55e，半径 4px） | 在对齐位置显示标记 |

#### 辅助线特点

- **贯穿画布**：辅助线覆盖整个 world 坐标范围（±25000）
- **非缩放描边**：使用 `vector-effect="non-scaling-stroke"`，线宽保持恒定
- **实时更新**：鼠标移动时 60fps 实时渲染
- **透明度**：辅助线 60% 透明度，避免遮挡内容

#### 技术实现

```typescript
// OverlayRenderer.ts
private renderAlignmentGuides(points: Point[], currentPos: Point): void {
  const snapThreshold = 5; // 5px 吸附阈值

  // 检查水平对齐
  for (const point of points) {
    if (Math.abs(point.y - currentPos.y) <= snapThreshold) {
      isHorizontalAligned = true;
      alignedY = point.y;
      break;
    }
  }

  // 检查垂直对齐
  for (const point of points) {
    if (Math.abs(point.x - currentPos.x) <= snapThreshold) {
      isVerticalAligned = true;
      alignedX = point.x;
      break;
    }
  }

  // 渲染水平辅助线
  const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  hLine.setAttribute('x1', String(-worldSize / 2));
  hLine.setAttribute('y1', String(hLineY));
  hLine.setAttribute('x2', String(worldSize / 2));
  hLine.setAttribute('y2', String(hLineY));
  hLine.setAttribute('stroke', isHorizontalAligned ? '#22c55e' : '#94a3b8');
  hLine.setAttribute('stroke-width', isHorizontalAligned ? '2' : '1');
  hLine.style.opacity = '0.6';
  this.setNonScalingStroke(hLine);
}
```

#### 视觉效果

**正常状态：**
```
    ●──────●
           │
           │ ← 灰色水平辅助线
           │
    ───────┼───────  ← 灰色垂直辅助线
           │
           ○ 鼠标位置
```

**对齐状态：**
```
    ●══════●
           ║
           ║ ← 绿色水平辅助线（与上方点对齐）
           ║
    ───────╫───────
           ● 鼠标位置（显示对齐标记）
```

### 2.4 特殊交互：回到起点闭合

当鼠标靠近第一个节点时（<15px 距离）：

| 交互 | 视觉反馈 | 功能结果 |
|------|----------|----------|
| 吸附效果 | 起点放大高亮（绿色） | 提示可闭合 |
| 闭合提示 | 跟随线显示为闭合预览 | 即将连接起点 |
| 点击起点 | 路径闭合，填充灰色 | 完成绘制 |

**实现细节：**

```typescript
private isNearFirstPoint(point: Point): boolean {
  if (this.points.length < 3) return false;
  const firstPoint = this.points[0];
  const distance = Math.sqrt(
    Math.pow(point.x - firstPoint.x, 2) +
    Math.pow(point.y - firstPoint.y, 2)
  );
  return distance < this.snapThreshold; // 15px
}
```

---

## 三、完成阶段：闭合多边形

### 3.1 闭合方式

| 方式 | 触发条件 | 说明 |
|------|----------|------|
| 点击起点 | 鼠标靠近第一个点（<15px）时点击 | 常规闭合方式 |
| 双击 | 任意位置双击 | 强制闭合 |
| 按 Enter | 至少 3 个点后按 Enter | 键盘完成 |

### 3.2 有效性验证

闭合前进行几何验证：

```typescript
private completeDrawing(): void {
  if (this.context.sectionPoints.length < 3) return;

  // 检查点是否共线
  if (this.arePointsCollinear(this.context.sectionPoints)) {
    console.warn('Points are collinear, cannot create section');
    return;
  }

  const defaultName = `Section ${this.context.venueMap.sections.length + 1}`;
  this.context.completeSectionDrawing(defaultName);
  this.resetState();
}

private arePointsCollinear(points: Point[]): boolean {
  if (points.length < 3) return true;
  // 使用叉积检查共线性
  for (let i = 2; i < points.length; i++) {
    const crossProduct =
      (points[i].x - points[0].x) * (points[i-1].y - points[0].y) -
      (points[i].y - points[0].y) * (points[i-1].x - points[0].x);
    if (Math.abs(crossProduct) > 1e-10) return false;
  }
  return true;
}
```

### 3.3 刚完成绘制的 UI 状态

一旦闭合，完成 Section 绘制：

| 元素 | 样式 |
|------|------|
| 区域填充 | 默认浅灰色#e3e3e3，可配置 |
| 边框 | 灰色细线（#ccc） |
| 标签 | 显示默认名称 "Section" |
| 选中状态 | 边框高亮，显示选中框 |

**重要：绘制完成后默认不自动进入区域**

绘制完成后，section 会被选中（高亮显示），但编辑器保持在 `view` 模式。用户需要显式操作才能进入 section 编辑座位。

---

## 三（附）、进入区域编辑模式

### 3.4 进入区域的方式

绘制完成后，有以下两种方式进入区域编辑座位：

| 方式 | 触发条件 | 说明 |
|------|----------|------|
| **双击区域** | 在 view 模式下双击已绘制的 section | 快速进入编辑模式 |
| **属性面板进入** | 选中 section 后，在右侧面板点击"进入区域"按钮 | 适合精确操作 |

**进入区域前的校准流程：**

进入区域时会自动执行校准，解决 SVG 区域尺寸断层问题：

1. **自动缩放计算**：计算 section 的边界框，自动调整 viewport 使区域完整显示
2. **坐标映射校准**：建立 section 本地坐标与 world 坐标的映射关系
3. **视图状态保存**：保存当前视图状态，退出时可恢复

```typescript
// enterSection 实现
const enterSection = useCallback((sectionId: string) => {
  // 1. 设置选中区域
  selection.setSelectedSectionId(sectionId);
  // 2. 切换到 draw-seat 模式
  editorState.setMode('draw-seat');
  // 3. 自动调整 viewport 聚焦到区域
  fitToSection(sectionId);
}, [selection, editorState]);
```

### 3.5 退出区域编辑

| 操作 | 效果 |
|------|------|
| 点击工具栏"Exit"按钮 | 退出当前区域，返回 view 模式 |
| 按 Escape 键 | 如果当前没有选择座位，退出区域编辑 |

退出时会恢复之前的视图状态（缩放级别和平移位置）。

---

## 四、SVG 区域尺寸校准

### 4.1 校准背景

当 SVG 底图与绘制的 section 区域存在尺寸断层时，进入区域编辑前需要进行校准：

**常见场景：**
- SVG 底图使用像素单位，而 section 使用世界坐标
- SVG 导入时的缩放比例与 section 不一致
- 底图边缘留白导致坐标偏移

### 4.2 校准流程

进入区域时自动执行以下校准：

```
┌─────────────────────────────────────────┐
│  1. 计算 Section 边界框 (Bounding Box)    │
│     minX, minY, maxX, maxY               │
├─────────────────────────────────────────┤
│  2. 计算合适的缩放比例                    │
│     scale = min(canvasWidth / width,      │
│                  canvasHeight / height)  │
├─────────────────────────────────────────┤
│  3. 计算居中偏移                         │
│     offsetX = centerX - sectionCenterX   │
│     offsetY = centerY - sectionCenterY   │
├─────────────────────────────────────────┤
│  4. 应用 Viewport 变换                   │
│     平滑动画过渡到目标视图                │
└─────────────────────────────────────────┘
```

### 4.3 手动校准（高级）

如果自动校准不够精确，用户可以在属性面板中：

| 参数 | 说明 | 调整效果 |
|------|------|----------|
| Scale X/Y | 区域缩放比例 | 调整区域显示大小 |
| Offset X/Y | 坐标偏移 | 微调区域位置 |
| Rotation | 旋转角度 | 校正倾斜的 SVG |

---

## 四、取消与回退

### 4.1 取消绘制

| 操作 | 效果 |
|------|------|
| ESC 键 | 取消整个绘制，清除所有已添加的点 |
| 右键点击 | 删除最后一个点（至少保留 0 个） |
| Backspace/Delete | 删除最后一个点 |

### 4.2 实现代码

```typescript
private handleKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'Enter':
      e.preventDefault();
      this.completeDrawing();
      break;
    case 'Escape':
      e.preventDefault();
      this.cancelDrawing();
      break;
    case 'Backspace':
    case 'Delete':
      e.preventDefault();
      this.context.removeLastSectionPoint();
      this.points = this.context.sectionPoints;
      break;
    case 'z':
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        this.context.removeLastSectionPoint();
        this.points = this.context.sectionPoints;
      }
      break;
  }
}

private cancelDrawing(): void {
  this.resetState();
  this.context.cancelSectionDrawing();
}
```

---

## 五、技术架构

### 5.1 文件位置

```
src/
├── tools/
│   ├── DrawSectionTool.ts      # 绘制工具逻辑
│   ├── ViewTool.ts             # 视图/选择工具
│   ├── SelectTool.ts           # 选择工具
│   ├── MoveTool.ts             # 移动/拖拽工具
│   └── ToolManager.ts          # 工具管理器
├── render/
│   ├── OverlayRenderer.ts      # 叠加层渲染（预览、辅助线）
│   └── SVGRenderer.ts          # 主渲染器
├── components/canvas/
│   └── Canvas.tsx              # 画布组件，事件分发
├── components/
│   └── PropertiesPanel.tsx     # 属性面板（点击进入区域）
└── hooks/
    └── useVenueDesigner.ts     # 状态管理
```

### 5.2 核心类与接口

#### DrawSectionTool

```typescript
export class DrawSectionTool implements Tool {
  id = 'draw-section';
  name = 'Draw Section';
  cursor = 'crosshair';

  private points: Point[] = [];
  private isActive = false;
  private snapThreshold = 15;

  constructor(private context: ToolContext) {}

  onMouseDown(e: ToolEvent): void { /* ... */ }
  onMouseMove(e: ToolEvent): void { /* 触发重绘预览 */ }
  onKeyDown(e: KeyboardEvent): void { /* ... */ }
  onActivate(): void { /* ... */ }
  onDeactivate(): void { /* ... */ }
}
```

#### ToolContext

```typescript
interface ToolContext {
  // 状态
  mode: EditorMode;
  sectionPoints: Point[];
  venueMap: VenueMap;
  selectedSectionId: string | null;

  // Section 绘制相关方法
  addSectionPoint: (point: Point) => void;
  removeLastSectionPoint: () => void;
  completeSectionDrawing: (name?: string) => Section | null;
  cancelSectionDrawing: () => void;

  // Section 选择与进入
  setSelectedSectionId: (id: string | null) => void;  // 仅选中，不进入
  enterSection: (id: string) => void;                 // 选中并进入编辑模式

  // 几何查询
  getSectionAtPoint: (point: Point) => Section | null;
  getSeatAtPoint: (point: Point, sectionId?: string) => Seat | null;
}
```

**重要区分：**
- `setSelectedSectionId(id)`：仅设置选中状态（高亮显示），不改变编辑器模式
- `enterSection(id)`：选中区域并切换到 `draw-seat` 模式，用于编辑座位

### 5.3 渲染流程

```
鼠标移动
   ↓
ToolManager.handleMouseMove()
   ↓
DrawSectionTool.onMouseMove()
   ↓
触发 Canvas 重渲染
   ↓
SVGRenderer.render() / updateViewport()
   ↓
OverlayRenderer.renderDrawingPreview()
   ↓
  ├─ renderPolyline(已完成线段)
  ├─ renderPreviewLine(预览线)
  ├─ renderPoints(顶点)
  └─ renderAlignmentGuides(辅助线)
```

---

## 六、样式常量

| 颜色 | 色值 | 用途 |
|------|------|------|
| 蓝色 | #3b82f6 | 默认线段、普通顶点 |
| 绿色 | #10b981 | 起始点 |
| 亮绿 | #22c55e | 对齐状态、对齐标记 |
| 灰色 | #94a3b8 | 默认辅助线 |
| 白色 | #ffffff | 顶点描边 |

---

## 七、注意事项

1. **辅助线仅在绘制模式下显示**（mode === 'draw-section'）
2. **至少需要 3 个点**才能形成有效多边形
3. **共线的点无法创建有效多边形**（会提示警告）
4. **辅助线使用 SVG line 元素**，性能开销极小
5. **所有坐标使用 world 坐标系**（范围 ±25000）
6. **非缩放描边**确保辅助线在不同缩放级别下保持可见

---

## 十、区域选择与拖拽移动（Select 工具）

### 10.1 选择区域

在 view 模式下使用 Select 工具（或默认的 View 工具）：

| 操作 | 效果 |
|------|------|
| **单击区域** | 选中该区域，显示选中框（不进入编辑模式） |
| **Shift + 单击** | 切换选中状态（当前实现为单选，未来可扩展多选） |
| **单击空白处** | 取消当前选中 |

**选中状态视觉反馈：**
- 区域边框高亮显示
- 显示选中框（selection box）带控制点
- 区域名称标签高亮

### 10.2 拖拽移动区域

选中区域后，支持鼠标拖拽移动：

| 操作 | 效果 |
|------|------|
| **拖拽区域** | 移动整个 section 到新的位置 |
| **实时预览** | 拖拽时显示半透明预览 |
| **释放确认** | 释放鼠标后提交新位置 |

**技术实现：**

```typescript
// MoveTool.ts - 处理区域拖拽
export class MoveTool extends BaseTool {
  private dragStart: Point | null = null;
  private selectedSectionId: string | null = null;

  onMouseDown(e: ToolEvent): void {
    // 检查是否点中已选中的区域
    const section = this.context.getSectionAtPoint(e.worldPoint);
    if (section && section.id === this.context.selectedSectionId) {
      this.dragStart = e.worldPoint;
      this.selectedSectionId = section.id;
    }
  }

  onMouseMove(e: ToolEvent): void {
    if (this.dragStart && this.selectedSectionId) {
      const deltaX = e.worldPoint.x - this.dragStart.x;
      const deltaY = e.worldPoint.y - this.dragStart.y;
      // 实时预览：渲染拖拽偏移
      this.context.setToolOverlay(
        <DragPreview sectionId={this.selectedSectionId} delta={{x: deltaX, y: deltaY}} />
      );
    }
  }

  onMouseUp(e: ToolEvent): void {
    if (this.dragStart && this.selectedSectionId) {
      const deltaX = e.worldPoint.x - this.dragStart.x;
      const deltaY = e.worldPoint.y - this.dragStart.y;
      // 提交移动命令
      this.context.execute(new MoveSectionCommand(this.selectedSectionId, deltaX, deltaY));
      this.dragStart = null;
    }
  }
}
```

**与进入编辑模式的区分：**
- **单击 + 拖拽** = 移动区域（保持 view 模式）
- **双击** = 进入区域编辑模式（切换到 draw-seat 模式）

---

## 八、后续扩展计划

### 8.1 曲线支持（待实现）

- 宽角度（>45°）线段显示为贝塞尔曲线预览
- Smoothing 滑块控制曲线平滑度（0% → 100%）

### 8.2 矩形绘制模式（待实现）

- 拖拽绘制矩形区域
- 支持旋转和缩放控制点

### 8.3 节点编辑工具（待实现）

- 拖拽节点移动位置
- 点击边线添加新节点
- 线段实时更新曲率

### 8.4 属性面板集成（待实现）

| 属性分组 | 可配置项 |
|----------|----------|
| Transform | Scale、Smoothing |
| Label | 名称、显示标签、字体大小、旋转角度 |
| Position | X/Y 坐标 |
| Appearance | 填充色、边框色、透明度 |

---

## 九、交互动作总结

### 9.1 绘制阶段

| 交互动作 | UI 反馈 | 功能结果 |
|----------|---------|----------|
| Click | 新增蓝色节点 | 添加路径点 |
| Right Click | 移除最后一个节点 | 回退操作 |
| Hover 起点 | 起点高亮放大（绿色） | 提示可闭合 |
| Click 起点 | 路径闭合，填充灰色 | 完成绘制 |
| Double Click | 同上 | 强制闭合 |
| Enter 键 | 同上 | 完成绘制 |
| ESC 键 | 清除所有预览 | 取消绘制 |
| 水平对齐 | 水平辅助线变绿 | 视觉提示对齐 |
| 垂直对齐 | 垂直辅助线变绿 | 视觉提示对齐 |

### 9.2 选择阶段（View 模式）

| 交互动作 | UI 反馈 | 功能结果 |
|----------|---------|----------|
| 单击 Section | 边框高亮，显示选中框 | 选中区域（不进入编辑） |
| 拖拽 Section | 半透明预览跟随鼠标 | 移动区域位置 |
| 双击 Section | 视图聚焦到区域 | 进入区域编辑模式 |
| 单击空白处 | 取消高亮 | 取消选中 |

### 9.3 进入/退出区域

| 交互动作 | 触发位置 | 功能结果 |
|----------|----------|----------|
| 双击区域 | 画布上 | 进入该区域编辑座位 |
| 点击"进入区域" | 右侧面板 | 进入选中区域编辑 |
| 点击"Exit"按钮 | 工具栏 | 退出区域，返回 View 模式 |
