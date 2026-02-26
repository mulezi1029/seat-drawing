# Section 编辑技术实现文档

## 文档概述

本文档详细描述了 Section（区域）编辑模式的技术架构、设计方案和代码实现。

**版本**：v1.5.2  
**更新日期**：2026-02-26

---

## 目录

1. [架构设计](#架构设计)
2. [数据结构](#数据结构)
3. [坐标系统](#坐标系统)
4. [组件设计](#组件设计)
5. [状态管理](#状态管理)
6. [核心算法](#核心算法)
7. [事件处理](#事件处理)
8. [性能优化](#性能优化)

---

## 架构设计

### 整体架构

```
App.tsx (主应用)
  ↓
SectionEditModal.tsx (模态框容器)
  ├─ CalibrationMode.tsx (校准模式)
  │   ├─ PlaceSeatsStep.tsx (步骤1)
  │   ├─ AdjustSizeStep.tsx (步骤2)
  │   └─ SpacingStep.tsx (步骤3)
  │       └─ InteractiveCalibrationCanvas.tsx (交互画布)
  └─ EditMode.tsx (编辑模式)
      ├─ SeatToolsPanel.tsx (工具面板)
      ├─ EditModeCanvas.tsx (编辑画布)
      └─ SeatPropertiesPanel.tsx (属性面板)
```

### 模块职责

| 模块 | 职责 | 关键功能 |
|------|------|----------|
| SectionEditModal | 模态框管理 | 阶段切换、数据传递 |
| CalibrationMode | 校准流程 | 三步校准、数据收集 |
| EditMode | 编辑容器 | 工具管理、数据管理 |
| EditModeCanvas | 核心画布 | 绘制、选择、编辑 |
| SeatToolsPanel | 工具面板 | 工具切换、快捷键 |
| SeatPropertiesPanel | 属性面板 | 属性编辑、批量修改 |

### 技术栈

- **框架**：React 18 + TypeScript
- **状态管理**：React Hooks (useState, useCallback, useMemo, useEffect)
- **渲染**：SVG (原生 SVG 元素)
- **样式**：Tailwind CSS
- **构建工具**：Vite
- **类型检查**：TypeScript 5.x

---

## 数据结构

### Section 接口

```typescript
interface Section {
  id: string;                    // 唯一标识符
  name: string;                  // 区域名称
  points: Point[];               // 多边形顶点（世界坐标）
  color: string;                 // 显示颜色
  seats: Seat[];                 // 座位数组（局部坐标）
  opacity: number;               // 透明度
  calibrationData?: CalibrationData;  // 校准数据
}
```

### Seat 接口

```typescript
interface Seat {
  id: string;                    // 唯一标识符
  x: number;                     // 局部坐标 X
  y: number;                     // 局部坐标 Y
  row: string;                   // 行号（A, B, C...）
  number: number;                // 座位号（1, 2, 3...）
  type: SeatType;                // 座位类型
  angle: number;                 // 旋转角度（0-360°）
}

type SeatType = 'normal' | 'vip' | 'accessible' | 'empty';
```

### CalibrationData 接口

```typescript
interface CalibrationData {
  canvasScale: number;           // 画布缩放比例
  anchorScale: number;           // 锚点缩放
  seatVisual: SeatVisualParams;  // 座位视觉参数
  isCalibrated: boolean;         // 是否已校准
}

interface SeatVisualParams {
  size: number;                  // 座位尺寸 (pt)
  gapX: number;                  // 横向间距 (pt)
  gapY: number;                  // 纵向间距 (pt)
}
```

### 组 ID 格式

**单排工具**：
```
seat-{groupId}-{index}
示例：seat-group-1234567890-0
```

**矩阵工具**：
```
seat-{groupId}-{row}-{col}
示例：seat-group-1234567890-0-0
```

**提取逻辑**：
```typescript
const getGroupId = (seatId: string): string | null => {
  const groupMatch = seatId.match(/^seat-(group-\d+)-/);
  return groupMatch ? groupMatch[1] : null;
};
```

---

## 坐标系统

### 三套坐标系

#### 1. 屏幕坐标系（Screen）

**定义**：
- 原点：浏览器窗口左上角
- 单位：像素（px）
- 范围：(0, 0) ~ (窗口宽度, 窗口高度)

**用途**：
- 鼠标事件（clientX, clientY）
- DOM 元素定位

#### 2. 世界坐标系（World）

**定义**：
- 原点：虚拟画布中心 (0, 0)
- 单位：世界单位
- 范围：(-25000, -25000) ~ (25000, 25000)

**用途**：
- 编辑时的座位坐标
- Section 顶点坐标
- 所有绘制和操作

**配置**：
```typescript
export const CANVAS_CONFIG = {
  WORLD_SIZE: 50000,
  WORLD_MIN: -25000,
  WORLD_MAX: 25000,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  DEFAULT_ZOOM: 1,
};
```

#### 3. 局部坐标系（Local）

**定义**：
- 原点：Section 边界框左上角
- 单位：世界单位
- 范围：相对于 section

**用途**：
- 存储座位坐标
- 确保座位跟随 section 移动

**原点计算**：
```typescript
const sectionOrigin = useMemo(() => {
  const bbox = getBoundingBox(section.points);
  return { x: bbox.minX, y: bbox.minY };
}, [section.points]);
```

### 坐标转换

#### 屏幕 → 世界

```typescript
const screenToWorld = useCallback((
  clientX: number,
  clientY: number
): Point => {
  if (!containerRef.current) return { x: 0, y: 0 };
  
  const rect = containerRef.current.getBoundingClientRect();
  const scrollLeft = containerRef.current.scrollLeft;
  const scrollTop = containerRef.current.scrollTop;
  
  const WORLD_CENTER = CANVAS_CONFIG.WORLD_SIZE / 2;
  
  const worldX = (clientX - rect.left + scrollLeft - WORLD_CENTER) / canvasScale;
  const worldY = (clientY - rect.top + scrollTop - WORLD_CENTER) / canvasScale;
  
  return { x: worldX, y: worldY };
}, [canvasScale]);
```

#### 世界 → 局部

```typescript
export function worldToLocal(worldPoint: Point, sectionOrigin: Point): Point {
  return {
    x: worldPoint.x - sectionOrigin.x,
    y: worldPoint.y - sectionOrigin.y,
  };
}
```

#### 局部 → 世界

```typescript
export function localToWorld(localPoint: Point, sectionOrigin: Point): Point {
  return {
    x: localPoint.x + sectionOrigin.x,
    y: localPoint.y + sectionOrigin.y,
  };
}
```

### 坐标转换时机

**加载座位**（进入编辑模式）：
```typescript
const [seats, setSeats] = useState<Seat[]>(() => {
  const savedSeats = section.seats || [];
  // 局部坐标 → 世界坐标
  return savedSeats.map(seat => ({
    ...seat,
    x: seat.x + sectionOrigin.x,
    y: seat.y + sectionOrigin.y,
  }));
});
```

**保存座位**（退出编辑模式）：
```typescript
const handleSave = useCallback(() => {
  // 世界坐标 → 局部坐标
  const localSeats = seats.map(seat => ({
    ...seat,
    x: seat.x - sectionOrigin.x,
    y: seat.y - sectionOrigin.y,
  }));
  onSaveSeats(section.id, localSeats);
}, [seats, sectionOrigin]);
```

---

## 组件设计

### EditModeCanvas 组件

**职责**：核心编辑画布，处理所有绘制、选择和编辑操作

**状态管理**：
```typescript
// 绘制状态
const [drawStart, setDrawStart] = useState<Point | null>(null);
const [drawCurrent, setDrawCurrent] = useState<Point | null>(null);
const [isDrawing, setIsDrawing] = useState(false);

// 矩阵工具两步绘制状态
const [matrixFirstRow, setMatrixFirstRow] = useState<Seat[] | null>(null);

// 拖拽座位状态
const [draggingSeatIds, setDraggingSeatIds] = useState<string[]>([]);
const [dragStartWorld, setDragStartWorld] = useState<Point | null>(null);
const [dragCurrentWorld, setDragCurrentWorld] = useState<Point | null>(null);

// 框选状态
const [selectionBoxStart, setSelectionBoxStart] = useState<Point | null>(null);
const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<Point | null>(null);

// 旋转状态
const [isRotating, setIsRotating] = useState(false);
const [rotationAngle, setRotationAngle] = useState(0);
const [rotationCenter, setRotationCenter] = useState<Point | null>(null);
const [rotationStartAngle, setRotationStartAngle] = useState(0);
const originalSeatsRef = useRef<Seat[]>([]);

// 画布控制
const [isSpacePressed, setIsSpacePressed] = useState(false);
```

**核心方法**：
```typescript
// 坐标转换
const screenToWorld = useCallback((clientX, clientY) => { /* ... */ }, []);

// 组选择
const getGroupId = useCallback((seatId) => { /* ... */ }, []);
const getGroupSeatIds = useCallback((groupId) => { /* ... */ }, [seats]);
const expandToGroups = useCallback((seatIds) => { /* ... */ }, []);

// 鼠标事件
const handleMouseDown = useCallback((e) => { /* ... */ }, []);
const handleMouseMove = useCallback((e) => { /* ... */ }, []);
const handleMouseUp = useCallback(() => { /* ... */ }, []);

// 座位交互
const handleSeatClick = useCallback((e, seatId) => { /* ... */ }, []);
const handleSeatMouseDown = useCallback((e, seatId) => { /* ... */ }, []);

// 旋转
const rotateSeat = useCallback((seat, center, angle) => { /* ... */ }, []);
const isClickOnRotationHandle = useCallback((worldPos, bbox) => { /* ... */ }, []);
```

**渲染层级**：
```tsx
<svg>
  {/* 1. 背景图（全图） */}
  <image href={svgUrl} />
  
  {/* 2. 背景图（裁剪到 section） */}
  <clipPath id={clipPathId}>
    <polygon points={section.points} />
  </clipPath>
  <image href={svgUrl} clipPath={`url(#${clipPathId})`} />
  
  {/* 3. 区域外遮罩 */}
  <mask id={maskId}>
    <rect fill="white" />
    <polygon points={section.points} fill="black" />
  </mask>
  <rect mask={`url(#${maskId})`} opacity={0.3} />
  
  {/* 4. 区域边框 */}
  <polygon points={section.points} stroke={section.color} />
  
  {/* 5. 座位渲染 */}
  {seats.map(seat => (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <rect />  {/* 座位 */}
      <text />  {/* 座位号 */}
    </g>
  ))}
  
  {/* 6. 单排座位预览 */}
  {singleRowPreview && (
    <g>
      <line />  {/* 连接线 */}
      {seats.map(...)}  {/* 预览座位 */}
      <text />  {/* 数量标签 */}
    </g>
  )}
  
  {/* 7. 矩阵绘制预览 */}
  {matrixPreview && (
    <g>
      {seats.map(...)}  {/* 预览座位 */}
      <text />  {/* 尺寸标签 */}
    </g>
  )}
  
  {/* 8. 框选预览 */}
  {selectionBox && <rect />}
  
  {/* 9. 选中座位的边界框和旋转手柄 */}
  {selectedSeatsBbox && (
    <g>
      <rect />  {/* 边界框 */}
      <line />  {/* 旋转手柄连接线 */}
      <circle />  {/* 旋转手柄 */}
      <text />  {/* 角度文本 */}
    </g>
  )}
</svg>
```

### EditMode 组件

**职责**：编辑模式容器，管理工具和数据

**状态管理**：
```typescript
const [currentTool, setCurrentTool] = useState<SectionEditTool>('select');
const [seats, setSeats] = useState<Seat[]>(() => {
  // 加载时转换为世界坐标
  return savedSeats.map(seat => ({
    ...seat,
    x: seat.x + sectionOrigin.x,
    y: seat.y + sectionOrigin.y,
  }));
});
const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
```

**数据操作**：
```typescript
// 添加座位
const handleAddSeats = useCallback((newSeats: Seat[]) => {
  setSeats(prev => [...prev, ...newSeats]);
}, []);

// 更新座位
const handleUpdateSeats = useCallback((updatedSeats: Seat[]) => {
  setSeats(prev => {
    const updatedMap = new Map(updatedSeats.map(s => [s.id, s]));
    return prev.map(s => updatedMap.get(s.id) || s);
  });
}, []);

// 删除座位
const handleDeleteSeats = useCallback((seatIds: string[]) => {
  const idsSet = new Set(seatIds);
  setSeats(prev => prev.filter(s => !idsSet.has(s.id)));
  setSelectedSeatIds(prev => {
    const newSet = new Set(prev);
    seatIds.forEach(id => newSet.delete(id));
    return newSet;
  });
}, []);

// 保存座位（转换为局部坐标）
const handleSave = useCallback(() => {
  const localSeats = seats.map(seat => ({
    ...seat,
    x: seat.x - sectionOrigin.x,
    y: seat.y - sectionOrigin.y,
  }));
  onSaveSeats(section.id, localSeats);
  onBack();
}, [seats, sectionOrigin]);
```

---

## 状态管理

### 全局状态（App.tsx）

```typescript
// Section 数据
const [sections, setSections] = useState<Section[]>([]);

// Section 编辑状态
const sectionEditState = useSectionEdit({
  onSaveSeats: handleSaveSeats,
});

// 保存座位数据
const handleSaveSeats = useCallback((sectionId: string, seats: Seat[]) => {
  setSections(prev => prev.map(s => 
    s.id === sectionId ? { ...s, seats } : s
  ));
}, []);
```

### 局部状态（EditModeCanvas）

**绘制状态**：
- `drawStart`：绘制起点
- `drawCurrent`：当前鼠标位置
- `isDrawing`：是否正在绘制
- `matrixFirstRow`：矩阵第一排座位

**选择状态**：
- `selectedSeatIds`：选中的座位 ID 集合
- `selectionBoxStart`：框选起点
- `selectionBoxCurrent`：框选当前位置

**拖拽状态**：
- `draggingSeatIds`：正在拖拽的座位 ID 数组
- `dragStartWorld`：拖拽起点（世界坐标）
- `dragCurrentWorld`：拖拽当前位置（世界坐标）

**旋转状态**：
- `isRotating`：是否正在旋转
- `rotationAngle`：旋转角度
- `rotationCenter`：旋转中心
- `rotationStartAngle`：旋转起始角度
- `originalSeatsRef`：原始座位数据（避免累积误差）

### 状态转换

```
初始状态
  ↓ 按工具键（1/2）
绘制工具激活
  ↓ mouseDown
绘制中（isDrawing = true）
  ↓ mouseUp
完成绘制 → 添加座位
  ↓ 按 V 键
选择工具激活
  ↓ 单击座位
选中状态（selectedSeatIds 更新）
  ↓ mouseDown（已选中座位）
拖拽中（draggingSeatIds 更新）
  ↓ mouseUp
完成拖拽 → 更新座位位置
```

---

## 核心算法

### 单排座位绘制

**距离计算**：
```typescript
const distance = Math.hypot(dx, dy);
```

**座位数量**：
```typescript
const cellWidth = seatVisual.size + seatVisual.gapX;
const seatCount = Math.max(1, Math.round(distance / cellWidth));
```

**座位分布**：
```typescript
for (let i = 0; i < seatCount; i++) {
  const t = seatCount === 1 ? 0 : i / (seatCount - 1);
  seats.push({
    x: startX + dx * t,
    y: startY + dy * t,
    angle: Math.atan2(dy, dx) * 180 / Math.PI,
  });
}
```

### 矩阵座位绘制

**第一步：绘制第一排**（同单排座位）

**第二步：垂直扩展**

**1. 计算第一排方向向量**：
```typescript
const rowDx = lastSeat.x - firstSeat.x;
const rowDy = lastSeat.y - firstSeat.y;
const rowLength = Math.sqrt(rowDx * rowDx + rowDy * rowDy);
const rowUnitX = rowDx / rowLength;
const rowUnitY = rowDy / rowLength;
```

**2. 计算垂直方向单位向量**（逆时针旋转90度）：
```typescript
const perpUnitX = -rowUnitY;
const perpUnitY = rowUnitX;
```

**数学原理**：
```
旋转矩阵（逆时针90度）:
[ cos(90°)  -sin(90°) ]   [ 0  -1 ]
[ sin(90°)   cos(90°) ] = [ 1   0 ]

应用到向量 (x, y):
新 x = 0 * x + (-1) * y = -y
新 y = 1 * x + 0 * y = x
```

**3. 计算垂直距离**（向量投影）：
```typescript
const dragDx = dragPoint.x - firstSeat.x;
const dragDy = dragPoint.y - firstSeat.y;
const perpDistance = Math.abs(dragDx * perpUnitX + dragDy * perpUnitY);
```

**数学原理**：
```
向量投影公式：
proj_v(u) = (u · v) / |v|

其中 v 是垂直方向单位向量，|v| = 1
所以：proj_v(u) = u · v
```

**4. 计算行数**：
```typescript
const cellHeight = seatVisual.size + seatVisual.gapY;
const rowCount = Math.max(1, Math.round(perpDistance / cellHeight));
```

**5. 生成座位**：
```typescript
for (let r = 0; r < rowCount; r++) {
  for (let c = 0; c < colCount; c++) {
    const baseSeat = firstRow[c];
    seats.push({
      id: `seat-${groupId}-${r}-${c}`,
      x: baseSeat.x + perpUnitX * cellHeight * r,
      y: baseSeat.y + perpUnitY * cellHeight * r,
      row: String.fromCharCode(65 + r),
      number: c + 1,
      angle: baseSeat.angle,
    });
  }
}
```

### 座位旋转

**旋转公式**：
```typescript
const rotateSeat = (seat: Seat, center: Point, angle: number): Seat => {
  const rad = angle * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const dx = seat.x - center.x;
  const dy = seat.y - center.y;
  
  return {
    ...seat,
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
    angle: seat.angle + angle,
  };
};
```

**数学原理**：
```
旋转矩阵：
[ cos(θ)  -sin(θ) ]
[ sin(θ)   cos(θ) ]

应用到点 (x, y) 围绕中心 (cx, cy) 旋转：
dx = x - cx
dy = y - cy

新 x = cx + dx * cos(θ) - dy * sin(θ)
新 y = cy + dx * sin(θ) + dy * cos(θ)
```

### 组选择扩展

**提取组 ID**：
```typescript
const getGroupId = (seatId: string): string | null => {
  const groupMatch = seatId.match(/^seat-(group-\d+)-/);
  return groupMatch ? groupMatch[1] : null;
};
```

**获取组内所有座位**：
```typescript
const getGroupSeatIds = (groupId: string): string[] => {
  return seats
    .filter(s => s.id.includes(groupId))
    .map(s => s.id);
};
```

**扩展为整组**：
```typescript
const expandToGroups = (seatIds: string[]): string[] => {
  const groupIds = new Set<string>();
  const allSelectedIds = new Set<string>();
  
  // 收集所有涉及的组 ID
  seatIds.forEach(seatId => {
    const groupId = getGroupId(seatId);
    if (groupId) {
      groupIds.add(groupId);
    } else {
      allSelectedIds.add(seatId);
    }
  });
  
  // 添加所有组内的座位
  groupIds.forEach(groupId => {
    getGroupSeatIds(groupId).forEach(id => allSelectedIds.add(id));
  });
  
  return Array.from(allSelectedIds);
};
```

---

## 事件处理

### 鼠标事件流程

**mouseDown**：
```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  // 1. 检查 Space 键（平移画布）
  if (isSpacePressed) {
    // 开始平移
    return;
  }
  
  const worldPos = screenToWorld(e.clientX, e.clientY);
  
  // 2. 检查工具类型
  if (currentTool === 'matrix') {
    if (!matrixFirstRow) {
      // 第一步：开始绘制第一排
      setDrawStart(worldPos);
      setIsDrawing(true);
    } else {
      // 第二步：开始垂直扩展
      setDrawStart(worldPos);
      setIsDrawing(true);
    }
  } else if (currentTool === 'single-row') {
    // 开始绘制单排
    setDrawStart(worldPos);
    setIsDrawing(true);
  } else if (currentTool === 'select') {
    // 3. 检查旋转手柄
    if (selectedSeatsBbox && isClickOnRotationHandle(worldPos, selectedSeatsBbox)) {
      // 开始旋转
      setIsRotating(true);
      return;
    }
    
    // 4. 开始框选
    setSelectionBoxStart(worldPos);
  }
}, [currentTool, matrixFirstRow, selectedSeatsBbox]);
```

**mouseMove**：
```typescript
const handleMouseMove = useCallback((e: React.MouseEvent) => {
  // 1. 平移画布
  if (isPanningRef.current) {
    // 更新滚动位置
    return;
  }
  
  const worldPos = screenToWorld(e.clientX, e.clientY);
  
  // 2. 旋转
  if (isRotating && rotationCenter) {
    const currentAngle = getAngle(rotationCenter, worldPos);
    setRotationAngle(currentAngle - rotationStartAngle);
  }
  // 3. 绘制
  else if (isDrawing && drawStart) {
    setDrawCurrent(worldPos);
  }
  // 4. 拖拽座位
  else if (draggingSeatIds.length > 0) {
    setDragCurrentWorld(worldPos);
  }
  // 5. 框选
  else if (selectionBoxStart) {
    setSelectionBoxCurrent(worldPos);
  }
}, [isRotating, isDrawing, draggingSeatIds, selectionBoxStart]);
```

**mouseUp**：
```typescript
const handleMouseUp = useCallback(() => {
  // 1. 完成旋转
  if (isRotating && rotationCenter) {
    const rotatedSeats = originalSeatsRef.current.map(seat =>
      rotateSeat(seat, rotationCenter, rotationAngle)
    );
    onUpdateSeats(rotatedSeats);
    setIsRotating(false);
    return;
  }
  
  // 2. 完成单排绘制
  if (isDrawing && currentTool === 'single-row') {
    // 计算座位并添加
    onAddSeats(newSeats);
  }
  // 3. 完成矩阵绘制
  else if (isDrawing && currentTool === 'matrix') {
    if (!matrixFirstRow) {
      // 第一步完成
      setMatrixFirstRow(firstRowSeats);
      onAddSeats(firstRowSeats);
    } else {
      // 第二步完成
      onAddSeats(newRows);
      setMatrixFirstRow(null);
    }
  }
  // 4. 完成拖拽
  else if (draggingSeatIds.length > 0) {
    // 更新座位位置
    onUpdateSeats(updatedSeats);
  }
  // 5. 完成框选
  else if (selectionBoxStart && selectionBoxCurrent) {
    // 扩展为整组并选中
    const expandedIds = expandToGroups(seatsInBox);
    onSelectSeats(expandedIds);
  }
  
  // 清理状态
  setIsDrawing(false);
  setDraggingSeatIds([]);
  setSelectionBoxStart(null);
}, [isRotating, isDrawing, draggingSeatIds, selectionBoxStart]);
```

### 键盘事件

**keyDown**：
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Space 键：平移画布
    if (e.code === 'Space') {
      e.preventDefault();
      setIsSpacePressed(true);
    }
    // ESC 键：取消操作
    else if (e.code === 'Escape') {
      if (isDrawing) {
        // 取消绘制
        setIsDrawing(false);
        setDrawStart(null);
      }
      if (matrixFirstRow) {
        // 取消矩阵第二步
        onDeleteSeats(matrixFirstRow.map(s => s.id));
        setMatrixFirstRow(null);
      }
      if (currentTool !== 'select') {
        // 切换回选择工具
        onToolChange('select');
      }
    }
    // Delete 键：删除座位
    else if (e.code === 'Delete' || e.code === 'Backspace') {
      if (selectedSeatIds.size > 0) {
        e.preventDefault();
        onDeleteSeats(Array.from(selectedSeatIds));
      }
    }
    // 工具切换
    else if (e.code === 'KeyV') {
      onToolChange('select');
    } else if (e.code === 'Digit1') {
      onToolChange('single-row');
    } else if (e.code === 'Digit2') {
      onToolChange('matrix');
    }
  };
  
  window.addEventListener('keydown', handleKeyDown, true);
  return () => window.removeEventListener('keydown', handleKeyDown, true);
}, [selectedSeatIds, isDrawing, matrixFirstRow, currentTool]);
```

**keyUp**：
```typescript
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
    setIsSpacePressed(false);
    isPanningRef.current = false;
  }
};
```

### 座位事件

**onClick**：
```typescript
const handleSeatClick = useCallback((e: React.MouseEvent, seatId: string) => {
  if (currentTool !== 'select') return;
  e.stopPropagation();
  
  if (e.ctrlKey) {
    // Ctrl+单击：切换组的选中状态
    const groupId = getGroupId(seatId);
    const groupSeatIds = getGroupSeatIds(groupId);
    
    const newSelection = new Set(selectedSeatIds);
    const isGroupSelected = groupSeatIds.some(id => newSelection.has(id));
    
    if (isGroupSelected) {
      groupSeatIds.forEach(id => newSelection.delete(id));
    } else {
      groupSeatIds.forEach(id => newSelection.add(id));
    }
    
    onSelectSeats(Array.from(newSelection));
  } else {
    // 单击：选中整组
    const expandedIds = expandToGroups([seatId]);
    onSelectSeats(expandedIds);
  }
}, [currentTool, selectedSeatIds, getGroupId, getGroupSeatIds, expandToGroups]);
```

**onMouseDown**：
```typescript
const handleSeatMouseDown = useCallback((e: React.MouseEvent, seatId: string) => {
  if (currentTool !== 'select') return;
  e.stopPropagation();
  
  // 只有当座位已经被选中时才允许拖拽
  if (selectedSeatIds.has(seatId)) {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setDraggingSeatIds(Array.from(selectedSeatIds));
    setDragStartWorld(worldPos);
    setDragCurrentWorld(worldPos);
    
    // 清除框选状态
    setSelectionBoxStart(null);
    setSelectionBoxCurrent(null);
  }
}, [currentTool, selectedSeatIds, screenToWorld]);
```

---

## 性能优化

### useMemo 缓存计算

**section 原点**：
```typescript
const sectionOrigin = useMemo(() => {
  const bbox = getBoundingBox(section.points);
  return { x: bbox.minX, y: bbox.minY };
}, [section.points]);
```

**边界框**：
```typescript
const selectedSeatsBbox = useMemo((): BoundingBox | null => {
  if (selectedSeatIds.size === 0) return null;
  const selectedSeats = seats.filter(s => selectedSeatIds.has(s.id));
  const seatPoints = selectedSeats.map(s => ({ x: s.x, y: s.y }));
  return getBoundingBox(seatPoints);
}, [selectedSeatIds, seats]);
```

**预览计算**：
```typescript
const singleRowPreview = useMemo(() => {
  if (!isDrawing || !drawStart || !drawCurrent) return null;
  // 复杂的预览计算
  return { seats, count, angle, midPoint };
}, [isDrawing, drawStart, drawCurrent, seatVisual]);
```

### useCallback 避免重复创建

```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  // 事件处理逻辑
}, [currentTool, matrixFirstRow, selectedSeatsBbox]);

const handleMouseMove = useCallback((e: React.MouseEvent) => {
  // 事件处理逻辑
}, [isRotating, isDrawing, draggingSeatIds]);

const handleMouseUp = useCallback(() => {
  // 事件处理逻辑
}, [isRotating, isDrawing, draggingSeatIds]);
```

### 函数式初始化

```typescript
const [seats, setSeats] = useState<Seat[]>(() => {
  // 只执行一次的初始化逻辑
  const savedSeats = section.seats || [];
  return savedSeats.map(seat => ({
    ...seat,
    x: seat.x + sectionOrigin.x,
    y: seat.y + sectionOrigin.y,
  }));
});
```

### 避免累积误差

**旋转时保存原始数据**：
```typescript
// 开始旋转时
originalSeatsRef.current = seats.filter(s => selectedSeatIds.has(s.id));

// 旋转过程中
const rotatedSeats = originalSeatsRef.current.map(seat =>
  rotateSeat(seat, rotationCenter, rotationAngle)
);

// 完成旋转时
onUpdateSeats(rotatedSeats);
originalSeatsRef.current = [];
```

### SVG 渲染优化

**使用 transform 而不是重新计算坐标**：
```tsx
<g transform={`translate(${x}, ${y}) rotate(${angle})`}>
  <rect />
</g>
```

**缩放自适应**：
```tsx
<rect
  strokeWidth={1 / canvasScale}
  fontSize={12 / canvasScale}
/>
```

---

## 工具函数

### 坐标转换（coordinate.ts）

```typescript
// 屏幕坐标 → 世界坐标
export function screenToWorld(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  offsetX: number,
  offsetY: number,
  scale: number
): Point;

// 世界坐标 → 局部坐标
export function worldToLocal(
  worldPoint: Point,
  sectionOrigin: Point
): Point;

// 局部坐标 → 世界坐标
export function localToWorld(
  localPoint: Point,
  sectionOrigin: Point
): Point;

// 计算角度
export function getAngle(
  center: Point,
  point: Point
): number;

// 旋转点
export function rotatePoint(
  point: Point,
  center: Point,
  angle: number
): Point;
```

### 选择工具（selection.ts）

```typescript
// 计算边界框
export function getBoundingBox(points: Point[]): BoundingBox;

// 点是否在多边形内
export function isPointInPolygon(
  point: Point,
  polygon: Point[]
): boolean;

// 点是否在边界框内
export function isPointInBox(
  point: Point,
  box: BoundingBox
): boolean;

// 边界框是否相交
export function doBoundingBoxesIntersect(
  box1: BoundingBox,
  box2: BoundingBox
): boolean;

// 创建选择框
export function createSelectionBox(
  start: Point,
  end: Point
): BoundingBox;
```

---

## 错误处理

### 编译时错误

**类型检查**：
- 使用 TypeScript 严格模式
- 所有接口和类型都有明确定义
- 避免使用 `any` 类型

**示例**：
```typescript
// ✅ 正确
const seat: Seat = {
  id: 'seat-1',
  x: 100,
  y: 100,
  row: 'A',
  number: 1,
  type: 'normal',
  angle: 0,
};

// ❌ 错误：缺少必需属性
const seat: Seat = {
  id: 'seat-1',
  x: 100,
  y: 100,
};
```

### 运行时错误

**空值检查**：
```typescript
if (!containerRef.current) return { x: 0, y: 0 };
if (!drawStart || !drawCurrent) return null;
if (selectedSeatIds.size === 0) return null;
```

**边界检查**：
```typescript
const seatCount = Math.max(1, Math.round(distance / cellWidth));
const rowCount = Math.max(1, Math.round(perpDistance / cellHeight));
```

**事件冲突防止**：
```typescript
// 防止 Delete 键冲突
if (e.code === 'Delete' && !sectionEditState.isActive) {
  // 只在主画布响应
}

// 防止事件冒泡
e.stopPropagation();
```

---

## 测试策略

### 单元测试

**坐标转换**：
```typescript
describe('coordinate conversion', () => {
  it('should convert world to local correctly', () => {
    const world = { x: 150, y: 150 };
    const origin = { x: 100, y: 100 };
    const local = worldToLocal(world, origin);
    expect(local).toEqual({ x: 50, y: 50 });
  });
  
  it('should convert local to world correctly', () => {
    const local = { x: 50, y: 50 };
    const origin = { x: 100, y: 100 };
    const world = localToWorld(local, origin);
    expect(world).toEqual({ x: 150, y: 150 });
  });
});
```

**组选择**：
```typescript
describe('group selection', () => {
  it('should extract group ID from single-row seat', () => {
    const id = 'seat-group-123-0';
    const groupId = getGroupId(id);
    expect(groupId).toBe('group-123');
  });
  
  it('should extract group ID from matrix seat', () => {
    const id = 'seat-group-456-0-1';
    const groupId = getGroupId(id);
    expect(groupId).toBe('group-456');
  });
});
```

### 集成测试

**绘制流程**：
```typescript
describe('seat drawing', () => {
  it('should draw single row seats', () => {
    // 1. 切换到单排工具
    // 2. 模拟拖拽
    // 3. 验证座位数量和位置
  });
  
  it('should draw matrix seats', () => {
    // 1. 切换到矩阵工具
    // 2. 模拟第一步拖拽
    // 3. 模拟第二步拖拽
    // 4. 验证矩阵结构
  });
});
```

**选择流程**：
```typescript
describe('seat selection', () => {
  it('should select entire group on click', () => {
    // 1. 绘制座位组
    // 2. 单击任意座位
    // 3. 验证整组被选中
  });
  
  it('should expand box selection to groups', () => {
    // 1. 绘制多个组
    // 2. 框选部分座位
    // 3. 验证扩展为整组
  });
});
```

---

## 部署和构建

### 构建命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 构建配置（vite.config.ts）

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### TypeScript 配置（tsconfig.json）

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 未来扩展

### 计划功能

1. **撤销/重做**
   - 实现命令模式
   - 维护操作历史栈
   - 支持 Ctrl+Z / Ctrl+Y

2. **座位模板**
   - 预定义常见布局
   - 支持导入导出
   - 模板市场

3. **Section 旋转**
   - 旋转整个 section
   - 座位自动跟随旋转
   - 保持相对位置

4. **Section 缩放**
   - 缩放整个 section
   - 座位自动缩放
   - 使用归一化坐标

5. **弧形座位工具**
   - 绘制弧形排列
   - 自动计算曲率
   - 座位朝向中心

6. **自动编号**
   - 智能识别行列
   - 批量重新编号
   - 自定义编号规则

### 技术债务

1. **测试覆盖率**
   - 添加单元测试
   - 添加集成测试
   - 添加 E2E 测试

2. **性能优化**
   - 虚拟化大量座位
   - Web Worker 计算
   - Canvas 渲染优化

3. **代码重构**
   - 提取公共逻辑
   - 减少组件复杂度
   - 改进类型定义

---

## 参考资料

### 外部资源

- [seats.io 官方网站](https://www.seats.io/)
- [SVG 规范](https://www.w3.org/TR/SVG2/)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)

### 内部文档

- `docs/section编辑功能与交互文档.md`
- `docs/座位绘制快速指南.md`
- `docs/座位坐标系统修复记录.md`
- `docs/矩阵座位两步绘制说明.md`
- `docs/座位选择边界框功能说明.md`

---

*文档结束*
