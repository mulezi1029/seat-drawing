# 更新日志

## [2026-02-26 v1.5.2] 修复座位坐标系统

### 🐛 Bug 修复

#### 座位位置不跟随 section 移动

**问题描述**：
1. 在 section 编辑模式中绘制座位并保存
2. 返回主画布，拖动移动 section 到新位置
3. 再次进入 section 编辑模式
4. ❌ 座位仍在原位置，与 section 边界不匹配

**问题示例**：
```
初始状态：
  Section 位置: (100, 100) - (200, 200)
  座位位置: (150, 150) ✅ 在 section 内

移动 section 后：
  Section 位置: (300, 300) - (400, 400)  ← 移动了 (200, 200)
  座位位置: (150, 150) ❌ 仍在原位置，不在 section 内
```

**根本原因**：

座位坐标使用**世界坐标系**存储，而不是相对于 section 的**局部坐标系**：

```typescript
// 保存座位时（修复前）
onSaveSeats(section.id, seats);  // 直接保存世界坐标

// 加载座位时（修复前）
const [seats, setSeats] = useState(section.seats || []);  // 直接使用世界坐标
```

当 section 在主画布中移动时：
- ✅ Section 的顶点坐标会更新
- ❌ 座位的坐标不会更新（仍是旧的世界坐标）
- ❌ 导致座位和 section 分离

**解决方案**：

座位坐标应该相对于 section 的原点（边界框左上角）存储：

1. **保存时**：将世界坐标转换为局部坐标
2. **加载时**：将局部坐标转换为世界坐标

```typescript
// 计算 section 的原点（边界框左上角）
const sectionOrigin = useMemo(() => {
  const bbox = getBoundingBox(section.points);
  return { x: bbox.minX, y: bbox.minY };
}, [section.points]);

// 加载座位时：局部坐标 → 世界坐标
const [seats, setSeats] = useState(() => {
  const savedSeats = section.seats || [];
  return savedSeats.map(seat => ({
    ...seat,
    x: seat.x + sectionOrigin.x,  // 局部 x + 原点 x = 世界 x
    y: seat.y + sectionOrigin.y,  // 局部 y + 原点 y = 世界 y
  }));
});

// 保存座位时：世界坐标 → 局部坐标
const handleSave = useCallback(() => {
  const localSeats = seats.map(seat => ({
    ...seat,
    x: seat.x - sectionOrigin.x,  // 世界 x - 原点 x = 局部 x
    y: seat.y - sectionOrigin.y,  // 世界 y - 原点 y = 局部 y
  }));
  onSaveSeats(section.id, localSeats);
  onBack();
}, [section.id, seats, sectionOrigin, onSaveSeats, onBack]);
```

**坐标转换示例**：

```
Section 原点: (100, 100)
座位世界坐标: (150, 150)

保存时转换：
  局部 x = 150 - 100 = 50
  局部 y = 150 - 100 = 50
  保存: { x: 50, y: 50 }

移动 section 后：
  新原点: (300, 300)

加载时转换：
  世界 x = 50 + 300 = 350
  世界 y = 50 + 300 = 350
  加载: { x: 350, y: 350 } ✅ 正确跟随
```

**修改的文件**：
- `app/src/components/section-edit/EditMode.tsx`
  - 添加 `sectionOrigin` 计算
  - 修改 `seats` 初始化逻辑（加载时转换）
  - 修改 `handleSave` 逻辑（保存时转换）

**验证测试**：

```
测试步骤：
1. 绘制一个 section
2. 进入编辑模式，绘制一些座位
3. 保存并返回主画布
4. 拖动 section 到新位置
5. 再次进入编辑模式
6. ✅ 验证：座位位置正确，仍在 section 内
7. 再次移动 section
8. ✅ 验证：座位继续跟随 section 移动
```

**影响范围**：

修复后的行为：
- ✅ 座位位置相对于 section 固定
- ✅ 移动 section 时，座位自动跟随
- ✅ 旋转 section 时，座位保持相对位置（未来功能）
- ✅ 缩放 section 时，座位保持相对位置（未来功能）

**兼容性说明**：

⚠️ **重要**：此修复会影响已保存的座位数据

如果已有使用旧版本保存的座位数据：
- 旧数据：座位坐标是世界坐标
- 新逻辑：将其当作局部坐标加载
- 结果：座位位置会偏移

**迁移方案**（如果需要）：

```typescript
// 检测旧数据并转换
const migrateOldSeats = (seats: Seat[], sectionOrigin: Point): Seat[] => {
  // 如果座位坐标远大于 section 尺寸，可能是旧的世界坐标
  const bbox = getBoundingBox(section.points);
  const sectionWidth = bbox.maxX - bbox.minX;
  const sectionHeight = bbox.maxY - bbox.minY;
  
  const needsMigration = seats.some(seat => 
    Math.abs(seat.x) > sectionWidth * 2 || 
    Math.abs(seat.y) > sectionHeight * 2
  );
  
  if (needsMigration) {
    // 转换为局部坐标
    return seats.map(seat => ({
      ...seat,
      x: seat.x - sectionOrigin.x,
      y: seat.y - sectionOrigin.y,
    }));
  }
  
  return seats;
};
```

---

## [2026-02-26 v1.5.1] 修复矩阵座位组选择

### 🐛 Bug 修复

#### 矩阵座位组选择失效

**问题**：
- 矩阵工具绘制的座位无法以组为单位选中
- 单击矩阵中的座位只能选中单个座位
- 框选矩阵部分座位无法扩展为整个矩阵

**原因分析**：

矩阵工具的座位ID格式与单排工具不同：
```typescript
// 单排工具 ID 格式
seat-group-123-0      // 第 0 个座位
seat-group-123-1      // 第 1 个座位
seat-group-123-2      // 第 2 个座位

// 矩阵工具 ID 格式
seat-group-456-0-0    // 第 0 行第 0 列
seat-group-456-0-1    // 第 0 行第 1 列
seat-group-456-1-0    // 第 1 行第 0 列
seat-group-456-1-1    // 第 1 行第 1 列
```

原有的 `getGroupId` 函数使用的正则表达式：
```typescript
/^seat-(group-\d+)-\d+$/
```

这个正则只能匹配单排格式（以一个数字结尾），无法匹配矩阵格式（以两个数字结尾）。

**修复方案**：

修改正则表达式，支持两种格式：
```typescript
// 修复前
const groupMatch = seatId.match(/^seat-(group-\d+)-\d+$/);

// 修复后
const groupMatch = seatId.match(/^seat-(group-\d+)-/);
```

新的正则表达式：
- 匹配 `seat-` 开头
- 捕获 `group-数字` 部分
- 后面可以是任意内容（单个数字或多个数字）

**验证测试**：

```typescript
// 单排工具 ID
getGroupId('seat-group-123-0')      // ✅ 返回 'group-123'
getGroupId('seat-group-123-5')      // ✅ 返回 'group-123'

// 矩阵工具 ID
getGroupId('seat-group-456-0-0')    // ✅ 返回 'group-456'
getGroupId('seat-group-456-2-5')    // ✅ 返回 'group-456'
```

**修改的文件**：
- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 修改 `getGroupId()` 函数的正则表达式

**影响范围**：

修复后，以下功能恢复正常：
1. ✅ 单击矩阵中任意座位 → 选中整个矩阵
2. ✅ 框选矩阵部分座位 → 自动扩展为整个矩阵
3. ✅ Ctrl+单击矩阵座位 → 切换整个矩阵的选中状态
4. ✅ 删除矩阵座位 → 删除整个矩阵
5. ✅ 拖拽矩阵座位 → 移动整个矩阵
6. ✅ 旋转矩阵座位 → 旋转整个矩阵

---

## [2026-02-26 v1.5] 矩阵座位两步绘制（seats.io 风格）

### ✨ 新功能

#### 矩阵座位工具 - 两步绘制交互

完全模仿 seats.io 的矩阵绘制交互方式：

**第一步：绘制第一排**
```
1. 选择矩阵座位工具（按 2 键）
2. 拖拽绘制第一排座位
3. 实时预览：蓝色正方形座位 + 数量标签
4. 释放鼠标完成第一排
```

**第二步：垂直扩展为矩阵**
```
1. 第一排座位已固定在画布上
2. 在垂直方向拖拽
3. 实时预览：整个矩阵的座位布局
4. 第一排显示为深蓝色（已固定）
5. 新增的行显示为浅蓝色（预览）
6. 释放鼠标完成矩阵绘制
```

**视觉反馈**：
- 📐 第一步：类似单排工具的预览（连接线 + 座位 + 数量）
- 🔷 第二步：
  - 第一排：深蓝色 `rgba(59, 130, 246, 0.5)`（已固定）
  - 新增行：浅蓝色 `rgba(59, 130, 246, 0.3)`（预览）
  - 矩阵尺寸标签：显示 "行数 × 列数"

**取消操作**：
- 第一步绘制中：按 ESC 取消
- 第二步绘制中：按 ESC 删除第一排并重置
- 切换工具：自动删除第一排并重置

### 🎯 使用场景

#### 场景 1：绘制标准矩阵座位
```
1. 按 2 切换到矩阵工具
2. 从左到右拖拽，绘制 10 个座位的第一排
3. 释放鼠标，第一排固定
4. 向下拖拽，扩展为 5 排
5. 释放鼠标，完成 5×10 的矩阵
```

#### 场景 2：绘制倾斜的矩阵
```
1. 按 2 切换到矩阵工具
2. 斜向拖拽，绘制倾斜的第一排
3. 释放鼠标，第一排固定（带旋转角度）
4. 垂直于第一排方向拖拽
5. 矩阵自动保持第一排的旋转角度
```

#### 场景 3：取消矩阵绘制
```
1. 绘制第一排后，发现位置不对
2. 按 ESC 键
3. 第一排座位被删除
4. 重新开始绘制
```

### 🔧 技术实现

#### 状态管理
```typescript
// 保存第一步绘制的第一排座位
const [matrixFirstRow, setMatrixFirstRow] = useState<Seat[] | null>(null);
```

#### 第一步：绘制第一排
```typescript
// 类似单排工具的逻辑
const distance = getDistance(drawStart, drawCurrent);
const cellWidth = seatVisual.size + seatVisual.gapX;
const seatCount = Math.max(1, Math.round(distance / cellWidth));

// 沿拖拽方向均匀分布座位
for (let i = 0; i < seatCount; i++) {
  const t = seatCount === 1 ? 0 : i / (seatCount - 1);
  firstRowSeats.push({
    x: drawStart.x + dx * t,
    y: drawStart.y + dy * t,
    angle: angle * 180 / Math.PI,  // 保持旋转角度
  });
}

// 保存第一排，进入第二步
setMatrixFirstRow(firstRowSeats);
onAddSeats(firstRowSeats);
```

#### 第二步：垂直扩展
```typescript
// 计算第一排的方向向量
const rowDx = lastSeat.x - firstSeat.x;
const rowDy = lastSeat.y - firstSeat.y;
const rowLength = Math.sqrt(rowDx * rowDx + rowDy * rowDy);
const rowUnitX = rowDx / rowLength;
const rowUnitY = rowDy / rowLength;

// 垂直方向单位向量（逆时针旋转90度）
const perpUnitX = -rowUnitY;
const perpUnitY = rowUnitX;

// 计算拖拽点到第一排的垂直距离
const dragDx = drawCurrent.x - firstSeat.x;
const dragDy = drawCurrent.y - firstSeat.y;
const perpDistance = Math.abs(dragDx * perpUnitX + dragDy * perpUnitY);

// 根据垂直距离计算行数
const cellHeight = seatVisual.size + seatVisual.gapY;
const rowCount = Math.max(1, Math.round(perpDistance / cellHeight));

// 生成多排座位
for (let r = 1; r < rowCount; r++) {
  for (let c = 0; c < matrixFirstRow.length; c++) {
    const baseSeat = matrixFirstRow[c];
    allSeats.push({
      x: baseSeat.x + perpUnitX * cellHeight * r,
      y: baseSeat.y + perpUnitY * cellHeight * r,
      angle: baseSeat.angle,  // 保持第一排的角度
    });
  }
}
```

#### 预览渲染
```typescript
const matrixPreview = useMemo(() => {
  if (!matrixFirstRow) {
    // 第一步：显示类似单排的预览
    return {
      step: 1,
      seats: previewSeats,
      count: seatCount,
      angle: angle * 180 / Math.PI,
      midPoint: { x, y },
    };
  } else {
    // 第二步：显示矩阵预览
    return {
      step: 2,
      seats: previewSeats,  // 包含所有行的座位
      rows: rowCount,
      cols: matrixFirstRow.length,
      angle: matrixFirstRow[0].angle,
    };
  }
}, [isDrawing, drawStart, drawCurrent, matrixFirstRow]);
```

### 📝 修改的文件

- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 添加 `matrixFirstRow` 状态
  - 修改 `handleMouseDown()` 支持两步交互
  - 修改 `handleMouseUp()` 分别处理两步完成
  - 修改 `matrixPreview` 计算逻辑
  - 修改预览渲染，区分两步显示
  - 添加 ESC 键取消第二步逻辑
  - 添加工具切换时重置状态

### 🎨 视觉设计

**第一步预览**：
- 蓝色正方形座位
- 蓝色虚线连接线
- 黑色数量标签（中点位置）

**第二步预览**：
- 第一排：深蓝色 `rgba(59, 130, 246, 0.5)`
- 新增行：浅蓝色 `rgba(59, 130, 246, 0.3)`
- 矩阵尺寸标签：黑色背景 + 白色文字 "行数 × 列数"
- 标签位置：第一排第一个座位上方

### 🚀 用户体验提升

1. **直观的两步操作**：先定义方向，再定义范围
2. **清晰的视觉区分**：第一排和新增行颜色不同
3. **灵活的方向控制**：第一排可以是任意方向
4. **自动垂直对齐**：第二步自动垂直于第一排
5. **保持旋转角度**：整个矩阵保持第一排的角度
6. **容错机制**：ESC 键随时取消，工具切换自动清理

### 📊 对比

#### 之前（一步矩形绘制）
```
1. 拖拽矩形区域
2. 自动计算行列数
3. ❌ 只能绘制水平/垂直矩阵
4. ❌ 无法控制精确方向
```

#### 现在（两步绘制）
```
1. 第一步：拖拽定义第一排（方向+数量）
2. 第二步：垂直拖拽扩展为矩阵
3. ✅ 支持任意角度的矩阵
4. ✅ 精确控制每一步
5. ✅ 完全符合 seats.io 交互
```

### 🎯 参考

- **seats.io 官方演示**：矩阵工具的两步绘制交互
- **用户提供截图**：展示了 "2 × 4" 的矩阵预览效果

---

## [2026-02-26 v1.4] 座位选择边界框和旋转功能

### ✨ 新功能

#### 选中座位的边界框显示
当选中座位后，会显示一个蓝色虚线矩形框，包围所有选中的座位：

**视觉效果**：
- 🔵 蓝色虚线矩形框：清晰显示选中范围
- 🎯 旋转手柄：矩形框顶部中心位置
- 📐 角度显示：旋转时实时显示旋转角度

**功能特性**：
1. **边界框拖拽**：在边界框内任意位置拖拽，移动整组座位
2. **旋转手柄**：点击并拖拽顶部圆形手柄，旋转整组座位
3. **实时预览**：旋转时座位实时跟随旋转，显示最终效果

#### 旋转功能详解

**操作方式**：
```
1. 选中座位（单击或框选）
2. 边界框顶部出现旋转手柄（蓝色圆点）
3. 点击并拖拽旋转手柄
4. 座位实时旋转预览
5. 释放鼠标完成旋转
```

**视觉反馈**：
- 旋转手柄：蓝色圆点（半径 6px）+ 白色边框
- 连接线：从边界框顶部到旋转手柄
- 角度文本：显示当前旋转角度（如 "45°"）
- 座位预览：半透明显示旋转后的位置

**技术实现**：
```typescript
// 旋转座位计算
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

### 🎯 使用场景

#### 场景 1：调整座位角度
```
1. 绘制一排水平座位
2. 选中整排座位
3. 拖拽旋转手柄调整角度
4. 座位自动旋转到新角度
```

#### 场景 2：边界框拖拽
```
1. 选中多组座位
2. 在边界框内任意位置按住鼠标
3. 拖拽移动所有选中座位
4. 比逐个拖拽座位更方便
```

### 🔧 技术实现

#### 边界框计算
```typescript
const selectedSeatsBbox = useMemo((): BoundingBox | null => {
  if (selectedSeatIds.size === 0) return null;
  
  const selectedSeats = seats.filter((s) => selectedSeatIds.has(s.id));
  if (selectedSeats.length === 0) return null;
  
  const seatPoints = selectedSeats.map((s) => ({ x: s.x, y: s.y }));
  return getBoundingBox(seatPoints);
}, [selectedSeatIds, seats]);
```

#### 旋转手柄检测
```typescript
const isClickOnRotationHandle = (worldPos: Point, bbox: BoundingBox): boolean => {
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const handleY = bbox.minY - 20 / canvasScale;
  const handleRadius = 10 / canvasScale;
  
  const dx = worldPos.x - centerX;
  const dy = worldPos.y - handleY;
  return Math.sqrt(dx * dx + dy * dy) <= handleRadius;
};
```

#### 旋转状态管理
```typescript
// 旋转状态
const [isRotating, setIsRotating] = useState(false);
const [rotationAngle, setRotationAngle] = useState(0);
const [rotationCenter, setRotationCenter] = useState<Point | null>(null);
const [rotationStartAngle, setRotationStartAngle] = useState(0);
const originalSeatsRef = useRef<Seat[]>([]);
```

### 📝 修改的文件

- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 添加旋转状态管理
  - 添加边界框计算 `selectedSeatsBbox`
  - 添加旋转手柄检测 `isClickOnRotationHandle()`
  - 添加旋转计算 `rotateSeat()`
  - 修改 `handleMouseDown()` 支持旋转手柄点击
  - 修改 `handleMouseMove()` 支持旋转拖拽
  - 修改 `handleMouseUp()` 完成旋转操作
  - 添加边界框和旋转手柄渲染
  - 修改座位渲染支持旋转预览

### 🎨 视觉设计

**边界框**：
- 颜色：蓝色 `#3b82f6`
- 样式：虚线 `strokeDasharray="4,2"`
- 宽度：1px（缩放自适应）

**旋转手柄**：
- 形状：圆形（半径 6px）
- 颜色：蓝色填充 `#3b82f6`
- 边框：白色 2px
- 位置：边界框顶部中心上方 20px
- 光标：`grab` / `grabbing`

**旋转时视觉**：
- 边界框：跟随旋转角度旋转
- 座位：实时显示旋转后位置（半透明）
- 角度文本：蓝色粗体，显示在旋转手柄上方

### 🚀 用户体验提升

1. **清晰的选中反馈**：边界框明确显示选中范围
2. **直观的旋转操作**：拖拽手柄即可旋转
3. **实时预览效果**：旋转时立即看到最终效果
4. **灵活的拖拽方式**：
   - 点击座位拖拽：移动已选中的座位
   - 点击边界框拖拽：移动整组座位
   - 点击旋转手柄：旋转整组座位

### 📊 交互优先级

```
鼠标按下检测顺序：
1. 旋转手柄 → 开始旋转
2. 已选中的座位 → 开始拖拽
3. 空白区域 → 开始框选
```

### ⚙️ 技术细节

**坐标系统**：
- 使用世界坐标系进行旋转计算
- 旋转中心：边界框的几何中心
- 角度计算：使用 `getAngle()` 工具函数

**性能优化**：
- 使用 `useMemo` 缓存边界框计算
- 使用 `useRef` 存储原始座位数据，避免累积误差
- 旋转时只计算选中的座位

**事件处理**：
- 旋转手柄优先级最高
- 使用 `e.stopPropagation()` 防止事件冲突
- 清除框选状态避免混淆

---

## [2026-02-26 v1.3.1] 优化拖拽交互

### 🔧 交互优化

#### 禁止单击拖拽
**问题**：单击座位的瞬间长按会触发拖拽，导致意外移动座位

**修复**：只有已选中的座位才能被拖拽

**修复前行为**：
```
1. 单击座位（mouseDown）
2. 立即开始拖拽
3. ❌ 座位被意外移动
```

**修复后行为**：
```
1. 单击座位（mouseDown）
   → 不触发拖拽
2. 座位被选中（onClick）
   → 整组显示蓝色边框
3. 再次按住拖拽
   → ✅ 现在可以拖拽移动
```

### 🎯 新的拖拽流程

```
步骤 1：选中座位
  单击座位 → 选中整组 → 显示蓝色边框

步骤 2：拖拽移动
  按住已选中的座位 → 拖拽 → 移动整组
```

### 📝 修改的文件

- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 修改 `handleSeatMouseDown()`
  - 添加 `selectedSeatIds.has(seatId)` 检查
  - 只有已选中的座位才能开始拖拽

### ✅ 验证测试

#### 测试 1：单击不触发拖拽
```
1. 单击未选中的座位 ✓
2. 保持按住鼠标 ✓
3. 预期：不触发拖拽 ✅
4. 释放鼠标 ✓
5. 预期：座位被选中 ✅
```

#### 测试 2：选中后可拖拽
```
1. 单击选中座位组 ✓
2. 再次按住座位 ✓
3. 拖拽移动 ✓
4. 预期：整组座位移动 ✅
```

---

## [2026-02-26 v1.3] 统一组选择行为

### ✨ 新功能

#### 统一的组选择逻辑
现在所有选择操作都以**绘制的组为单位**进行：

**1. 单击选择**
- 单击任意座位 → 自动选中整组
- 无需手动框选整组

**2. 框选选择**
- 框选部分座位 → 自动扩展为完整的组
- 即使只框选到组内一个座位，也会选中整组

**3. Ctrl+单击**
- Ctrl+单击座位 → 切换整组的选中状态
- 如果组已选中 → 取消选中整组
- 如果组未选中 → 选中整组

### 🎯 使用场景

#### 场景 1：快速选中多组
```
1. 绘制 3 排座位（3 个组）
2. 框选前两排的部分区域
3. ✅ 自动选中完整的前两组
4. 可以批量移动或删除
```

#### 场景 2：Ctrl 多选组
```
1. 单击第一排 → 选中第一组
2. Ctrl+单击第三排 → 添加第三组
3. Ctrl+单击第一排 → 取消第一组
4. ✅ 现在只选中第三组
```

#### 场景 3：部分框选
```
1. 绘制一排 10 个座位
2. 框选只覆盖前 3 个座位
3. ✅ 自动选中全部 10 个座位
```

### 🔧 技术实现

#### 核心函数

**1. 获取组 ID**
```typescript
const getGroupId = (seatId: string): string | null => {
  const groupMatch = seatId.match(/^seat-(group-\d+)-\d+$/);
  return groupMatch ? groupMatch[1] : null;
};
```

**2. 获取组内所有座位**
```typescript
const getGroupSeatIds = (groupId: string): string[] => {
  return seats
    .filter((s) => s.id.includes(groupId))
    .map((s) => s.id);
};
```

**3. 扩展为整组**
```typescript
const expandToGroups = (seatIds: string[]): string[] => {
  const groupIds = new Set<string>();
  const allSelectedIds = new Set<string>();

  // 收集所有涉及的组 ID
  seatIds.forEach((seatId) => {
    const groupId = getGroupId(seatId);
    if (groupId) {
      groupIds.add(groupId);
    } else {
      allSelectedIds.add(seatId);
    }
  });

  // 添加所有组内的座位
  groupIds.forEach((groupId) => {
    getGroupSeatIds(groupId).forEach((id) => allSelectedIds.add(id));
  });

  return Array.from(allSelectedIds);
};
```

#### 应用场景

**单击选择**
```typescript
const handleSeatClick = (seatId: string) => {
  if (!e.ctrlKey) {
    // 单击：扩展为整组
    const expandedIds = expandToGroups([seatId]);
    onSelectSeats(expandedIds);
  }
};
```

**框选选择**
```typescript
// 找到框选范围内的座位
const seatsInBox = seats
  .filter((s) => isInBox(s))
  .map((s) => s.id);

// 扩展为整组
const expandedIds = expandToGroups(seatsInBox);
onSelectSeats(expandedIds);
```

### 📝 修改的文件

- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 添加 `getGroupId()` 函数
  - 添加 `getGroupSeatIds()` 函数
  - 添加 `expandToGroups()` 函数
  - 修改 `handleSeatClick()` 使用组扩展
  - 修改框选逻辑使用组扩展

### 🎨 用户体验提升

1. **更直观**：不需要精确框选整组
2. **更高效**：部分框选自动扩展
3. **更一致**：单击和框选行为统一
4. **更智能**：Ctrl+单击切换整组状态

### 📊 行为对比

| 操作 | v1.2 | v1.3 |
|------|------|------|
| 单击座位 | ✅ 选中整组 | ✅ 选中整组 |
| 框选部分组 | ❌ 只选中框内座位 | ✅ 选中完整组 |
| Ctrl+单击 | ❌ 单个座位多选 | ✅ 整组切换 |

---

## [2026-02-26 v1.2.1] 修复 Delete 键冲突

### 🐛 Bug 修复

#### Delete 键事件冲突修复
**问题**：在区域编辑模式内按 Delete 键，会触发主画布的删除区域逻辑，导致：
- 退出区域编辑模式
- 删除正在编辑的区域
- 座位数据丢失

**修复**：
1. **主画布 Delete 键**：添加 `!sectionEditState.isActive` 检查
   - 只在非区域编辑模式下响应 Delete 键
   - 避免与编辑模式内的 Delete 冲突

2. **SectionEditModal ESC 键**：添加 `state.phase === 'calibrating'` 检查
   - 只在校准模式下，ESC 键退出整个模态框
   - 编辑模式下，ESC 由 EditModeCanvas 处理（取消绘制/切换工具）

**修改的文件**：
- `app/src/App.tsx`：添加 `!sectionEditState.isActive` 条件
- `app/src/components/section-edit/SectionEditModal.tsx`：添加 `state.phase === 'calibrating'` 条件

### ✅ 验证步骤
```
1. 进入区域编辑模式
2. 绘制一些座位
3. 选中座位
4. 按 Delete 键
5. ✓ 只删除座位，不退出编辑模式
6. ✓ 区域不会被删除
```

---

## [2026-02-26 v1.2] 座位组选择和交互优化

### ✨ 新功能

#### 1. 正方形座位预览
- 拖拽绘制时显示**正方形座位预览**（而不是圆圈）
- 座位自动旋转对齐拖拽方向
- 更符合最终效果的视觉预览

#### 2. ESC 键快捷操作
- **ESC 键取消绘制**：在拖拽过程中按 ESC 取消当前绘制
- **ESC 键切换工具**：按 ESC 自动切换回选择工具
- 提供快速退出绘制模式的方式

#### 3. 座位组选择
- **单击选中整组**：单击一个座位时，自动选中同时创建的所有座位
- **组 ID 标识**：每次绘制的座位自动分配唯一组 ID
- **Ctrl+单击**：保持原有的单个座位多选功能

### 🎯 使用场景

#### 场景 1：绘制并选中座位组
```
1. 按 1 切换到单排座位工具
2. 拖拽绘制一排座位（实时看到正方形预览）
3. 按 ESC 切换回选择工具
4. 单击任意一个座位
5. 整组座位被选中（可以批量移动、删除或编辑）
```

#### 场景 2：取消绘制
```
1. 按 1 切换到单排座位工具
2. 开始拖拽绘制
3. 发现位置不对，按 ESC 取消
4. 自动切换回选择工具，无座位被创建
```

### 🔧 技术实现

#### 座位组 ID 生成
```typescript
const groupId = `group-${Date.now()}`;
for (let i = 0; i < seatCount; i++) {
  seats.push({
    id: `seat-${groupId}-${i}`,  // 包含组 ID
    // ... 其他属性
  });
}
```

#### 组选择逻辑
```typescript
// 提取组 ID
const groupMatch = seatId.match(/^seat-(group-\d+)-\d+$/);

if (groupMatch) {
  // 选中整组
  const groupId = groupMatch[1];
  const groupSeats = seats
    .filter((s) => s.id.includes(groupId))
    .map((s) => s.id);
  onSelectSeats(groupSeats);
}
```

#### ESC 键处理
```typescript
if (e.code === 'Escape') {
  // 取消绘制
  if (isDrawing) {
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }
  // 切换回选择工具
  if (currentTool !== 'select') {
    onToolChange('select');
  }
}
```

### 📝 修改的文件

- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 修改预览渲染：圆圈 → 正方形
  - 添加 ESC 键处理逻辑
  - 添加组 ID 生成逻辑
  - 修改座位点击逻辑：支持组选择

### 🎨 视觉改进

**预览座位（正方形）**：
- 形状：正方形（与最终效果一致）
- 颜色：蓝色半透明 `rgba(59, 130, 246, 0.3)`
- 旋转：自动对齐拖拽方向
- 边框：蓝色实线 `#3b82f6`

### 🚀 用户体验提升

1. **视觉一致性**：预览效果与最终效果完全一致（正方形）
2. **快速退出**：ESC 键快速取消绘制或切换工具
3. **批量操作**：单击选中整组，便于批量编辑
4. **灵活选择**：
   - 单击 = 选中整组
   - Ctrl+单击 = 单个座位多选
   - 框选 = 区域多选

---

## [2026-02-26 v1.1] 座位绘制功能 - seats.io 风格交互

### ✨ 新功能

#### 单排座位工具 - 拖拽绘制（参照 seats.io）

实现了完全模仿 seats.io 的拖拽绘制交互：

**交互方式**：
- 按住鼠标拖拽定义座位排列方向和长度
- 实时预览座位位置、连接线和数量

**视觉反馈**：
- 🔵 蓝色半透明圆圈：预览座位位置
- 📏 蓝色虚线：连接起点和终点
- 🏷️ 黑色方块标签：显示座位数量

**智能计算**：
- 根据拖拽距离自动计算座位数量
- 座位自动对齐拖拽方向（自动旋转）
- 使用校准的座位尺寸和间距

**使用方法**：
1. 按 `1` 切换到单排座位工具
2. 在画布上按住鼠标拖拽
3. 实时看到蓝色圆圈预览和数量标签
4. 释放鼠标完成绘制

### 🔧 技术实现

#### 核心算法

```typescript
// 计算拖拽距离和角度
const dx = drawCurrent.x - drawStart.x;
const dy = drawCurrent.y - drawStart.y;
const distance = Math.hypot(dx, dy);
const angle = Math.atan2(dy, dx);

// 根据距离计算座位数量
const cellWidth = seatVisual.size + seatVisual.gapX;
const seatCount = Math.max(1, Math.round(distance / cellWidth));

// 沿着拖拽方向均匀分布座位
for (let i = 0; i < seatCount; i++) {
  const t = seatCount === 1 ? 0 : i / (seatCount - 1);
  seats.push({
    x: drawStart.x + dx * t,
    y: drawStart.y + dy * t,
    angle: angle * 180 / Math.PI,  // 自动旋转
  });
}
```

#### 实时预览渲染

```typescript
// 预览座位圆圈
{singleRowPreview.seats.map((pos, i) => (
  <circle
    cx={pos.x}
    cy={pos.y}
    r={seatVisual.size / 2}
    fill="rgba(59, 130, 246, 0.3)"
    stroke="#3b82f6"
  />
))}

// 数量标签（黑色方块）
<rect
  x={-20 / canvasScale}
  y={-15 / canvasScale}
  width={40 / canvasScale}
  height={30 / canvasScale}
  fill="#1e293b"
  rx={4 / canvasScale}
/>
<text fill="white">{singleRowPreview.count}</text>
```

### 📝 修改的文件

- `app/src/components/section-edit/EditModeCanvas.tsx`
  - 移除点击放置逻辑
  - 添加拖拽绘制逻辑
  - 添加实时预览计算
  - 添加预览渲染（圆圈、连接线、标签）

### 🎨 视觉设计

**预览座位**：
- 颜色：蓝色半透明 `rgba(59, 130, 246, 0.3)`
- 形状：圆圈（半径 = 座位尺寸 / 2）
- 边框：蓝色实线 `#3b82f6`

**连接线**：
- 颜色：蓝色 `#3b82f6`
- 样式：虚线 `strokeDasharray="5,5"`
- 宽度：2px（缩放自适应）

**数量标签**：
- 背景：深灰色 `#1e293b`
- 文字：白色，16px，粗体
- 形状：圆角矩形（40×30px）
- 位置：拖拽线段中点

### 🚀 用户体验提升

1. **直观的方向控制**：拖拽方向即座位排列方向
2. **实时视觉反馈**：立即看到座位位置和数量
3. **精确的数量控制**：拖拽距离决定座位数量
4. **自动旋转对齐**：座位自动朝向拖拽方向
5. **符合行业标准**：完全模仿 seats.io 的交互体验

### 📊 对比

#### 之前（点击放置）
```
1. 点击画布
2. 固定生成 5 个座位
3. 座位居中于点击位置
4. 无法控制方向和数量
```

#### 现在（拖拽绘制）
```
1. 拖拽定义方向和长度
2. 自动计算座位数量
3. 实时预览座位位置
4. 座位自动对齐方向
5. 完全符合 seats.io 体验
```

### 🎯 参考

- **seats.io 官方演示**：[https://www.seats.io/](https://www.seats.io/)
- **用户提供截图**：展示了拖拽绘制的实时预览效果

---

## 📚 完整文档

### 功能文档
- [Section 编辑功能与交互文档](./docs/section编辑功能与交互文档.md)
- [座位绘制快速指南](./docs/座位绘制快速指南.md)
- [座位选择边界框功能说明](./docs/座位选择边界框功能说明.md)
- [矩阵座位两步绘制说明](./docs/矩阵座位两步绘制说明.md)

### 技术文档
- [Section 编辑技术实现文档](./docs/section编辑技术实现文档.md)
- [座位坐标系统修复记录](./docs/座位坐标系统修复记录.md)
- [矩阵座位组选择修复记录](./docs/矩阵座位组选择修复记录.md)
- [座位交互行为说明](./docs/座位交互行为说明.md)
- [组选择功能说明](./docs/组选择功能说明.md)

---

*更新日期: 2026-02-26*
*版本: v1.5.2*
