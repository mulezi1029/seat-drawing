# 座位绘制系统画布架构设计

## 设计目标

基于 seats.io 的画布结构，设计一个可扩展的、模块化的画布系统，支持：
1. 场馆背景图展示与导航
2. 区域绘制与编辑（多边形/矩形）
3. 座位绘制（单点/行/线）
4. 选择与编辑工具
5. 属性面板与工具栏

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  #designerApp (主应用容器)                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ panel-top (顶部工具栏)                                        ││
│  │ [文档操作] [设计工具] [上下文操作] [帮助]                      ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌──────────┬──────────────────────────────────┬──────────────┐ │
│  │panel-left│         Canvas Area              │ panel-right  │ │
│  │(工具选择)│  ┌────────────────────────────┐  │ (属性面板)    │ │
│  │          │  │  SVG Renderer              │  │              │ │
│  │ [选择]   │  │  - Background Image        │  │ [Section]    │ │
│  │ [节点]   │  │  - Sections (Polygons)     │  │ [Category]   │ │
│  │ [区域]   │  │  - Seats (Circles/Text)    │  │ [Transform]  │ │
│  │ [座位]   │  │  - Selection Overlay       │  │ [Label]      │ │
│  │ [图形]   │  │                            │  │ [Misc]       │ │
│  │ [文字]   │  └────────────────────────────┘  │              │ │
│  └──────────┴──────────────────────────────────┴──────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Floating Controls (悬浮控件)                                 ││
│  │ ┌──────────┐ ┌──────────┐ ┌────────────────┐               ││
│  │ │Navigation│ │Floor     │ │ StatusBar      │               ││
│  │ │HUD       │ │Picker    │ │ (底部状态栏)    │               ││
│  │ └──────────┘ └──────────┘ └────────────────┘               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 组件结构详解

### 1. 顶层布局 (App.tsx)

```tsx
<div className="designer-app">
  <PanelTop />           {/* 顶部工具栏 */}
  <div className="workspace">
    <PanelLeft />        {/* 左侧工具选择 */}
    <CanvasContainer>    {/* 画布容器 */}
      <SVGRenderer />    {/* SVG 渲染器 */}
    </CanvasContainer>
    <PanelRight />       {/* 右侧属性面板 */}
  </div>
  <FloatingControls />   {/* 悬浮控件 */}
</div>
```

### 2. 核心组件设计

#### CanvasContainer (画布容器)
- **职责**: 处理视口导航（平移/缩放）
- **状态**: scale, offsetX, offsetY
- **交互**:
  - Space + 拖拽 = 平移
  - Ctrl + 滚轮 = 缩放
  - 鼠标中键 = 平移
- **实现**: 保持现有 `Canvas.tsx` 的滚动容器逻辑

#### SVGRenderer (SVG 渲染器)
- **职责**: 渲染所有图形元素
- **实现方式**: 使用 `width/height` 固定尺寸，通过 `transform` 进行缩放（与 seats.io 一致）
- **结构**:
  ```tsx
  <svg
    width={CANVAS_CONFIG.WORLD_SIZE}
    height={CANVAS_CONFIG.WORLD_SIZE}
  >
    <g
      className="world-layer"
      transform={`translate(${WORLD_CENTER}, ${WORLD_CENTER}) scale(${scale}) translate(${-WORLD_CENTER}, ${-WORLD_CENTER})`}
    >
      {/* 背景图 */}
      <BackgroundLayer svgUrl={svgUrl} />

      {/* 区域层 */}
      <SectionsLayer />

      {/* 座位层 */}
      <SeatsLayer />

      {/* 选中/悬停覆盖层 */}
      <OverlayLayer />
    </g>
  </svg>
  ```

### 3. 坐标系统设计

保持现有的三层坐标系统：

```
Screen (屏幕坐标 - 鼠标事件)
    ↓ convertScreenToViewport()
Viewport (视口坐标 - 显示区域)
    ↓ convertViewportToWorld()
World (世界坐标 - 数据存储)

世界画布: 50000×50000 像素
中心点: (25000, 25000)
数据范围: (-25000, -25000) ~ (25000, 25000)
```

坐标转换工具函数:
```typescript
// hooks/useCoordinates.ts
export function useCoordinates(viewport: ViewportState) {
  // Screen → World
  const screenToWorld = (screenX: number, screenY: number): Point => {
    const viewportX = screenX / viewport.scale + viewport.offsetX;
    const viewportY = screenY / viewport.scale + viewport.offsetY;
    return { x: viewportX, y: viewportY };
  };

  // World → Screen
  const worldToScreen = (worldX: number, worldY: number): Point => {
    const screenX = (worldX - viewport.offsetX) * viewport.scale;
    const screenY = (worldY - viewport.offsetY) * viewport.scale;
    return { x: screenX, y: screenY };
  };

  return { screenToWorld, worldToScreen };
}
```

### 4. 工具系统设计

#### ToolManager (工具管理器)
```typescript
interface Tool {
  id: string;
  name: string;
  icon: string;
  cursor: string;

  // 生命周期
  onActivate?: () => void;
  onDeactivate?: () => void;

  // 事件处理
  onMouseDown?: (e: MouseEvent, worldPos: Point) => void;
  onMouseMove?: (e: MouseEvent, worldPos: Point) => void;
  onMouseUp?: (e: MouseEvent, worldPos: Point) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}
```

#### 工具列表
| 工具 | ID | 快捷键 | 功能 |
|------|----|--------|------|
| 选择 | select | v | 框选、点选对象 |
| 节点选择 | node | a | 编辑多边形节点 |
| 矩形区域 | section-rect | s | 拖拽绘制矩形区域 |
| 多边形区域 | section-poly | - | 逐点绘制多边形 |
| 单座位 | seat-single | - | 点击放置单个座位 |
| 行座位 | seat-row | r | 拖拽绘制一行座位 |
| 线座位 | seat-line | - | 点击多点绘制沿线座位 |
| 平移 | pan | Space | 平移画布 |

### 5. 渲染系统设计

#### 渲染分层 (Z-Index)
```
Layer 0: 背景图 (BackgroundImage)
Layer 1: 区域填充 (Section Fill)
Layer 2: 区域边框 (Section Stroke)
Layer 3: 座位 (Seats)
Layer 4: 标签文字 (Labels)
Layer 5: 选中高亮 (Selection Highlight)
Layer 6: 工具预览 (Tool Preview)
Layer 7: 吸附辅助线 (Snap Guides)
```

> **注意**: 与 seats.io 保持一致，不显示网格层

#### 元素变换策略（与 seats.io 一致）

采用**数据驱动变换**策略：

**核心原则**
- **数据层存储真实坐标** - 元素的位置、旋转、缩放等属性存储在数据模型中
- **变换用于预览** - 操作过程中使用 `transform` 做实时预览，操作结束后更新数据并重置变换
- **视口变换独立** - 画布缩放/平移使用独立的 `world-layer` transform

**变换流程示例（移动元素）**

```
移动前:
  <path d="M9883.298...,10037.742..." ...
        transform="translate(25000,25000) scale(1.125) translate(-25000,-25000)" />
  // d = 原始世界坐标
  // transform = 视口变换（所有元素共享）

移动过程中:
  <path d="M9883.298...,10037.742..." ...
        transform="translate(25000,25000) scale(1.125) translate(-25000,-25000)
                   translate(100, -50)" />
  // d = 坐标不变
  // transform = 视口变换 + 临时偏移（预览新位置）

移动完成后:
  <path d="M9983.298...,9987.742..." ...
        transform="translate(25000,25000) scale(1.125) translate(-25000,-25000)" />
  // d = 更新后的世界坐标（原坐标 + 偏移量）
  // transform = 恢复原视口变换
```

**实现代码示例**

```typescript
interface DraggableElement {
  id: string;
  x: number;
  y: number;
  // 不使用 rotation/scale 等 transform 属性，而是直接操作坐标
}

// 拖拽逻辑
class MoveTool {
  private dragStartPos: Point;
  private mouseStartPos: Point;
  private tempTransform: string = '';

  onMouseDown(element: DraggableElement, e: MouseEvent) {
    this.dragStartPos = { x: element.x, y: element.y };
    this.mouseStartPos = screenToWorld(e.clientX, e.clientY);
  }

  onMouseMove(element: DraggableElement, e: MouseEvent) {
    const currentPos = screenToWorld(e.clientX, e.clientY);
    const deltaX = currentPos.x - this.mouseStartPos.x;
    const deltaY = currentPos.y - this.mouseStartPos.y;

    // 预览：应用临时 transform
    this.tempTransform = `translate(${deltaX}, ${deltaY})`;
    element.el.style.transform = `${element.baseTransform} ${this.tempTransform}`;
  }

  onMouseUp(element: DraggableElement, e: MouseEvent) {
    const currentPos = screenToWorld(e.clientX, e.clientY);
    const deltaX = currentPos.x - this.mouseStartPos.x;
    const deltaY = currentPos.y - this.mouseStartPos.y;

    // 更新实际数据（坐标变更写入数据层）
    updateElement(element.id, {
      x: this.dragStartPos.x + deltaX,
      y: this.dragStartPos.y + deltaY
    });

    // 重置临时 transform
    element.el.style.transform = element.baseTransform;
  }
}
```

**优势**
1. **数据即真相** - 数据层始终存储元素的真实世界坐标，无累积误差
2. **序列化简单** - 保存/加载时无需处理复杂的 transform matrix
3. **协作友好** - 多人编辑时只需同步坐标数据，无 transform 冲突
4. **历史记录清晰** - 撤销/重做基于坐标变更，逻辑清晰

#### SVG 元素结构
```tsx
// Section 渲染
<g className="section" data-id={section.id}>
  {/* 填充区域 */}
  <path
    d={pointsToPath(section.points)}
    fill={section.color}
    fillOpacity={section.opacity}
    stroke={section.color}
    strokeWidth={2 / scale}
  />
  {/* 标签 */}
  <text
    x={centerX}
    y={centerY}
    textAnchor="middle"
    fontSize={12 / scale}
  >
    {section.name}
  </text>
</g>

// Seat 渲染
<g className="seat" data-id={seat.id}>
  <circle
    cx={seat.x}
    cy={seat.y}
    r={SEAT_RADIUS / scale}
    fill={getSeatColor(seat)}
    stroke="#fff"
    strokeWidth={1 / scale}
  />
  <text
    x={seat.x}
    y={seat.y}
    textAnchor="middle"
    fontSize={10 / scale}
  >
    {seat.number}
  </text>
</g>
```

### 6. 状态管理设计

#### 核心状态
```typescript
// stores/editorStore.ts
interface EditorStore {
  // 数据层
  venue: VenueMap;
  categories: Category[];

  // 视图层
  viewport: ViewportState;

  // 工具层
  activeTool: ToolType;
  toolOptions: Record<string, unknown>;

  // 选择层
  selectedSectionIds: string[];
  selectedSeatIds: string[];
  hoveredObject: { type: 'seat' | 'section'; id: string } | null;

  // 绘制状态
  isDrawing: boolean;
  drawingPoints: Point[];
  previewObject: Partial<Section | Seat> | null;

  // 操作
  setTool: (tool: ToolType) => void;
  setViewport: (viewport: ViewportState) => void;
  selectSection: (id: string | null) => void;
  selectSeat: (id: string, multi?: boolean) => void;
  addSection: (section: Section) => void;
  addSeat: (seat: Seat) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSelected: () => void;
}
```

### 7. 交互设计

#### 选择交互
- **单击**: 选择单个对象
- **Shift + 单击**: 多选切换
- **框选**: 拖拽选择多个对象
- **双击**: 进入编辑模式
- **Esc**: 取消选择
- **Delete**: 删除选中

#### 绘制交互
**区域绘制 (多边形)**:
1. 选择多边形工具
2. 点击添加顶点
3. 双击或按 Enter 完成
4. 按 Esc 取消

**区域绘制 (矩形)**:
1. 选择矩形工具
2. 拖拽绘制矩形
3. 松开完成

**座位绘制 (行)**:
1. 选择行工具
2. 点击起点
3. 拖拽到终点
4. 预览座位数量和间距
5. 松开完成

#### 快捷键
| 快捷键 | 功能 |
|--------|------|
| V | 选择工具 |
| A | 节点工具 |
| S | 矩形区域工具 |
| R | 行座位工具 |
| Space + 拖拽 | 平移画布 |
| Ctrl + 滚轮 | 缩放 |
| Ctrl + Z | 撤销 |
| Ctrl + Shift + Z | 重做 |
| Ctrl + C | 复制 |
| Ctrl + V | 粘贴 |
| Delete | 删除 |
| Esc | 取消/退出 |

### 8. 属性面板设计

参考 seats.io 的 Inspector 结构：

```
┌─────────────┐
│ Inspector   │
├─────────────┤
│ Section     │
│ ├─ Edit     │
│ ├─ Name     │
│ ├─ Seats: 0 │
├─────────────┤
│ Category    │
│ ├─ Color A  │
├─────────────┤
│ Transform   │
│ ├─ Scale    │
│ ├─ Smooth   │
├─────────────┤
│ Label       │
│ ├─ Text     │
│ ├─ Visible  │
│ ├─ FontSize │
│ ├─ Rotation │
│ ├─ Pos X/Y  │
├─────────────┤
│ View Image  │
│ [Upload]    │
├─────────────┤
│ Misc        │
│ ├─ Entrance │
└─────────────┘
```

---

## 文件结构设计

```
app/src/
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx           # 画布容器 (视口管理)
│   │   ├── SVGRenderer.tsx      # SVG 渲染器 (使用 transform 缩放, 无 viewBox)
│   │   ├── layers/
│   │   │   ├── BackgroundLayer.tsx
│   │   │   ├── SectionsLayer.tsx
│   │   │   ├── SeatsLayer.tsx
│   │   │   └── OverlayLayer.tsx
│   │   └── elements/
│   │       ├── SectionElement.tsx
│   │       ├── SeatElement.tsx
│   │       └── SelectionBox.tsx
│   ├── panels/
│   │   ├── PanelTop.tsx         # 顶部工具栏
│   │   ├── PanelLeft.tsx        # 左侧工具选择
│   │   ├── PanelRight.tsx       # 右侧属性面板
│   │   └── Inspector/
│   │       ├── SectionInspector.tsx
│   │       ├── SeatInspector.tsx
│   │       └── CategorySelector.tsx
│   └── ui/                      # shadcn/ui 组件
├── hooks/
│   ├── useCanvas.ts             # 画布状态管理
│   ├── useCoordinates.ts        # 坐标转换
│   ├── useTools.ts              # 工具管理
│   ├── useSelection.ts          # 选择逻辑
│   └── useDrawing.ts            # 绘制逻辑
├── stores/
│   └── editorStore.ts           # Zustand 状态管理
├── tools/
│   ├── ToolManager.ts
│   ├── BaseTool.ts
│   ├── SelectTool.ts
│   ├── SectionTool.ts
│   └── SeatTool.ts
├── utils/
│   ├── geometry.ts              # 几何计算
│   ├── svg.ts                   # SVG 工具
│   └── constants.ts             # 常量
└── types/
    └── index.ts                 # 类型定义 (已有)
```

---

## 实现阶段

### Phase 1: 基础架构
1. 重构 Canvas 组件，分离视口管理和 SVG 渲染
2. 创建坐标转换 hook
3. 实现基础 SVGRenderer

### Phase 2: 工具系统
1. 实现 ToolManager
2. 创建选择工具
3. 创建区域绘制工具

### Phase 3: 渲染系统
1. 实现 Section 渲染
2. 实现 Seat 渲染
3. 添加选中/悬停效果

### Phase 4: UI 面板
1. 创建左侧工具栏
2. 创建右侧属性面板
3. 创建顶部工具栏

### Phase 5: 高级功能
1. 多选/框选
2. 复制粘贴
3. 撤销重做

---

## 关键设计决策

1. **SVG vs Canvas**: 使用 SVG 渲染，因为座位图是矢量图形，SVG 更适合交互和 DOM 操作

2. **状态管理**: 使用 Zustand 替代 React Context，性能更好，代码更简洁

3. **坐标系统**: 保持现有的三层坐标系统 (Screen → Viewport → World)

4. **工具模式**: 采用工具模式而非命令模式，更直观易懂

5. **渲染分层**: SVG 中使用 `<g>` 分层管理，便于控制和性能优化

---

## 已完成的改动总结

### 与原始设计的差异

| 项目 | 原始设计 | 当前实现 | 原因 |
|------|---------|---------|------|
| SVG 缩放方式 | `viewBox` | `width/height` + `transform` | 与 seats.io 保持一致 |
| 网格层 | 有 GridLayer | 已移除 | seats.io 画布无网格 |
| 滚动条 | 默认显示 | 隐藏 (`scrollbar-hidden`) | 更简洁的视觉体验 |
| 工具提示 | 使用 `lucide-react` | 使用 `lucide-react` + 自定义样式 | 保持统一 |

### 当前实现的占位组件

- ✅ `PanelTop` - 顶部工具栏 (文档操作、设计工具、帮助)
- ✅ `PanelLeft` - 左侧工具栏 (选择/绘制/区域工具)
- ✅ `PanelRight` - 右侧属性面板 (Section/Category/Transform/Label/Misc)
- ✅ `FloatingControls` - 悬浮控件 (NavigationHUD、FloorPicker、StatusBar)
- ✅ `Canvas` - 画布容器 (Space+拖拽平移、Ctrl+滚轮缩放)
- ✅ `SVGRenderer` - SVG 渲染器 (分层渲染架构)

### 待实现功能

- [ ] 工具系统 (ToolManager + 具体工具)
- [ ] 区域绘制 (SectionTool)
- [ ] 座位绘制 (SeatTool)
- [ ] 选择交互 (框选、多选)
- [ ] 属性面板数据绑定
- [ ] 撤销/重做

---

## 参考 seats.io 的关键特性

1. **视图原点**: 采用中心原点坐标系，便于定位
2. **悬浮控件**: Navigation HUD、Floor Picker 悬浮在画布上
3. **工具提示**: 状态栏显示当前工具的操作提示
4. **视觉反馈**: 悬停、选中、绘制预览等即时反馈
5. **快捷键**: 每个工具都有单字母快捷键
