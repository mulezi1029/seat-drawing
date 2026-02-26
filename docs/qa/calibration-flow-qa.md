# 校准流程 Q&A

## Q1: 每次进入一个新的区域，都要进行一次参考图校准流程吗？

**A**: 不是的。校准是**一次性的**。

### 校准逻辑

```typescript
// 进入区域时的判断逻辑
const enterEditMode = (section: Section) => {
  const hasCalibration = section.calibrationData?.isCalibrated;
  
  if (hasCalibration) {
    // 已校准 → 直接进入编辑模式
    phase = 'editing';
    calibration = section.calibrationData;  // 恢复校准参数
  } else {
    // 未校准 → 进入校准向导
    phase = 'calibrating';
    calibration = DEFAULT_CALIBRATION;
  }
};
```

### 流程图

```
进入区域
  ↓
检查 section.calibrationData?.isCalibrated
  ↓
  ├─ false（未校准）→ 进入校准向导 → 完成校准 → 保存数据 → 编辑模式
  └─ true（已校准）→ 恢复校准参数 → 直接进入编辑模式 ✅
```

### 实际场景

**体育馆多个区域**：

```
区域A（VIP区）
├── 第1次进入 → 校准（座位35pt，间距15pt）→ 保存
├── 第2次进入 → 直接编辑 ✅
└── 第3次进入 → 直接编辑 ✅

区域B（普通区）
├── 第1次进入 → 校准（座位20pt，间距10pt）→ 保存
└── 第2次进入 → 直接编辑 ✅

区域C（站席区）
└── 第1次进入 → 校准（座位15pt，间距5pt）→ 保存
```

**关键点**：
- 每个区域的校准数据**独立保存**在 `section.calibrationData` 中
- 不同区域可能有**不同的座位尺寸和间距**
- 校准一次，永久使用

### 重新校准

如果需要重新校准（例如更换底图），可以提供"重新校准"入口：

```typescript
const handleRecalibrate = () => {
  updateCalibration({
    ...DEFAULT_CALIBRATION,
    isCalibrated: false,
  });
  setState(prev => ({ ...prev, phase: 'calibrating' }));
};
```

**UI 建议**：
```tsx
<header>
  <Button onClick={onBack}>返回</Button>
  <span>{section.name} - 编辑模式</span>
  <Button variant="outline" onClick={handleRecalibrate}>
    重新校准
  </Button>
</header>
```

---

## Q2: 校准的作用是什么？

**A**: 建立虚拟座位坐标系统与底图实际座位之间的映射关系。

### 核心作用

通过校准，系统获得：
1. **座位尺寸**：`size = 35pt`
2. **横向间距**：`gapX = 15pt`
3. **纵向间距**：`gapY = 25pt`
4. **画布缩放**：`canvasScale = 3.0`

### 实际应用

**场景**：体育馆座位图

```
底图（实际照片）：
┌─────────────────────────────┐
│  [座位][座位][座位][座位]   │  ← 底图上的座位
│  [座位][座位][座位][座位]   │
└─────────────────────────────┘

校准后（虚拟座位精确覆盖）：
┌─────────────────────────────┐
│  [▣][▣][▣][▣]              │  ← 虚拟座位对齐底图
│  [▣][▣][▣][▣]              │
└─────────────────────────────┘
```

### 后续好处

**1. 精确绘制**
```typescript
// 系统知道参数，可以快速绘制矩阵座位
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 20; col++) {
    座位位置 = {
      x: startX + col * (size + gapX),
      y: startY + row * (size + gapY)
    }
  }
}
```

**2. 容量估算**
```typescript
区域宽度 = 1000px
区域高度 = 800px

每列宽度 = size + gapX = 35 + 15 = 50px
每行高度 = size + gapY = 35 + 25 = 60px

列数 = 1000 / 50 = 20列
行数 = 800 / 60 = 13行

总容量 = 20 × 13 = 260座位
```

**3. 批量操作**
- 矩阵工具：一次绘制整块座位
- 单排工具：快速绘制一排座位
- 所有座位自动对齐底图

**类比**：就像调整打印机的纸张设置，确保打印内容准确落在纸张上。校准就是调整虚拟座位的"打印设置"，确保它们准确落在底图座位上。

---

## Q3: 为什么座位改为正方形？

**A**: 与 seats.io 保持一致，简化参数。

### 设计理由

1. **简化参数**：从 `width + height` 简化为 `size`
2. **符合实际**：大多数座位是正方形或接近正方形
3. **统一标准**：与 seats.io 一致

### 类型变化

**修改前**：
```typescript
interface SeatVisualParams {
  width: number;   // 宽度
  height: number;  // 高度
  gapX: number;
  gapY: number;
}
```

**修改后**：
```typescript
interface SeatVisualParams {
  size: number;    // 边长（正方形）
  gapX: number;
  gapY: number;
}
```

---

## Q4: 为什么单位使用 pt 而不是 px？

**A**: 与 seats.io 保持一致。

### pt vs px

- **pt (point)**：印刷单位，1pt = 1/72 英寸，与设备无关
- **px (pixel)**：屏幕单位，与设备分辨率相关

### seats.io 的选择

seats.io 使用 pt 作为座位尺寸单位，因为：
1. 与印刷行业标准一致
2. 跨设备一致性更好
3. 更适合场馆座位图的专业场景

### 在代码中的体现

```tsx
// 步进器显示
<span>{seatVisual.size} pt</span>
<span>{seatVisual.gapX} pt</span>
<span>{seatVisual.gapY} pt</span>
```

---

## Q5: 为什么要拖拽高亮副本而不是直接拖拽原始座位？

**A**: 保留原始位置作为参照，更直观地定义行间距。

### 设计理由

**方案A（直接拖拽原始座位）**：
```
第一排：  ▢ ▢ ▢ ▢ ▢
            ↓ 拖拽
          ▢ ▢ ▢ ▢ ▢  （移动后）

问题：看不到原始位置，难以判断拖拽距离
```

**方案B（拖拽高亮副本）**：
```
原始位置：  ▢ ▢ ▢ ▢ ▢  （固定，半透明）
              ↓ 拖拽
高亮副本：  ▣ ▣ ▣ ▣ ▣  （移动，蓝色）
              ↓
行间距 = 高亮副本Y - 原始位置Y

优点：
1. 原始位置可见，作为参照
2. 拖拽距离清晰可见
3. 更直观，更易理解
```

### seats.io 的实现

seats.io 也是使用这种方案，用户体验更好。

---

## Q6: 自动计算座位尺寸的算法是什么？

**A**: 基于相邻座位的平均间距计算。

### 算法逻辑

```typescript
function calculateSeatSize(seats: PlacedCalibrationSeat[]): number {
  if (seats.length < 2) return 20;
  
  // 1. 计算相邻座位的距离
  const distances: number[] = [];
  for (let i = 0; i < seats.length - 1; i++) {
    const dx = seats[i + 1].x - seats[i].x;
    const dy = seats[i + 1].y - seats[i].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    distances.push(distance);
  }
  
  // 2. 计算平均距离
  const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  
  // 3. 座位尺寸约为间距的 70%
  const calculatedSize = avgDistance * 0.7;
  
  return Math.round(calculatedSize * 10) / 10;
}
```

### 示例

```
用户放置4个座位：
座位1 ←→ 座位2 ←→ 座位3 ←→ 座位4
  50px    50px    50px

平均间距 = (50 + 50 + 50) / 3 = 50px
座位尺寸 = 50 × 0.7 = 35px
```

### 为什么是 70%？

经验值，假设：
- 座位占据空间的 70%
- 间隙占据空间的 30%

用户可以在步骤3手动调整这个计算结果。

---

## Q7: 如何识别第一排座位？

**A**: 找到 Y 坐标最小的一组座位。

### 算法逻辑

```typescript
function identifyFirstRow(seats: PlacedCalibrationSeat[]): PlacedCalibrationSeat[] {
  if (seats.length === 0) return [];
  
  // 1. 按 Y 坐标排序
  const sorted = [...seats].sort((a, b) => a.y - b.y);
  
  // 2. 找到 Y 坐标最小的一组（阈值 50px）
  const firstY = sorted[0].y;
  const threshold = 50;
  const firstRow = sorted.filter(seat => Math.abs(seat.y - firstY) < threshold);
  
  // 3. 按 X 坐标排序
  return firstRow.sort((a, b) => a.x - b.x);
}
```

### 示例

```
用户放置的座位：
座位1(100, 200)  座位2(150, 200)  座位3(200, 205)  ← 第一排（Y≈200）
座位4(100, 300)  座位5(150, 295)                   ← 第二排（Y≈300）

识别结果：
第一排 = [座位1, 座位2, 座位3]  // Y坐标在 200±50 范围内
按 X 坐标排序 = [座位1(100), 座位2(150), 座位3(200)]
```

### 阈值说明

- `threshold = 50`：Y坐标差异在 50px 以内视为同一排
- 可根据实际情况调整

---

## Q8: 校准数据保存在哪里？

**A**: 保存在 `section.calibrationData` 中。

### 数据结构

```typescript
interface Section {
  id: string;
  name: string;
  points: Point[];
  color: string;
  seats: Seat[];
  opacity: number;
  calibrationData?: CalibrationData;  // 校准数据
}

interface CalibrationData {
  canvasScale: number;      // 画布缩放
  anchorScale: number;      // 锚点缩放
  seatVisual: {
    size: number;           // 座位边长 (pt)
    gapX: number;           // 横向间距 (pt)
    gapY: number;           // 纵向间距 (pt)
  };
  isCalibrated: boolean;    // 是否已完成校准
}
```

### 保存时机

```typescript
// 用户点击"完成"按钮
const handleComplete = () => {
  const calibrationData: CalibrationData = {
    canvasScale: 3.0,
    anchorScale: 3.0,
    seatVisual: {
      size: 35,
      gapX: 15,
      gapY: 25,
    },
    isCalibrated: true,  // 标记为已校准
  };
  
  // 保存到 Section
  onSaveCalibration(sectionId, calibrationData);
};
```

### 持久化

```typescript
// 保存到状态管理
const updateSection = (sectionId: string, updates: Partial<Section>) => {
  setSections(prev => prev.map(s => 
    s.id === sectionId ? { ...s, ...updates } : s
  ));
};

// 再次进入时恢复
const calibration = section.calibrationData ?? DEFAULT_CALIBRATION;
```

---

## Q9: 为什么要求至少放置 4 个座位？

**A**: 确保计算的准确性和可靠性。

### 原因分析

**座位数量与计算准确性**：

| 座位数量 | 计算准确性 | 说明 |
|---------|-----------|------|
| 1个 | ❌ 无法计算 | 无法计算间距 |
| 2个 | ⚠️ 不可靠 | 只有1个间距样本 |
| 3个 | ⚠️ 较低 | 只有2个间距样本 |
| 4个+ | ✅ 可靠 | 有3个以上间距样本 |

### 计算示例

**3个座位**：
```
座位1 ←→ 座位2 ←→ 座位3
  50px    52px

平均间距 = (50 + 52) / 2 = 51px
误差较大，不够准确
```

**4个座位**：
```
座位1 ←→ 座位2 ←→ 座位3 ←→ 座位4
  50px    52px    49px

平均间距 = (50 + 52 + 49) / 3 = 50.3px
样本更多，结果更准确
```

### seats.io 的选择

seats.io 也要求至少 4 个座位，这是行业最佳实践。

---

## Q10: 校准向导可以跳过某些步骤吗？

**A**: 不建议跳过，但技术上可以实现。

### 当前设计

**强制顺序流程**：
```
介绍页 → 缩放 → 放置座位 → 确认尺寸 → 定义行间距 → 完成
```

每个步骤都有其作用，跳过会影响校准质量。

### 可选的优化

**快速校准模式**（未来扩展）：
```typescript
// 提供"快速校准"选项
const quickCalibration = {
  skipIntro: true,           // 跳过介绍页
  skipZoom: false,           // 保留缩放
  skipPlace: false,          // 保留放置（核心）
  skipAdjust: true,          // 跳过调整（使用计算值）
  skipSpacing: true,         // 跳过行间距（使用默认值）
};
```

**建议**：
- 保留完整流程作为默认
- 提供"快速模式"作为高级选项
- 新手用户使用完整流程
- 熟练用户可以选择快速模式

---

## Q11: 不同区域的座位尺寸可以不同吗？

**A**: 可以，而且应该不同。

### 设计理念

每个区域独立校准，支持不同的座位参数。

### 实际场景

**体育馆分区**：

```
VIP区（区域A）
├── 座位尺寸：40pt（大座位）
├── 横向间距：20pt（宽敞）
└── 纵向间距：30pt（舒适）

普通区（区域B）
├── 座位尺寸：25pt（标准座位）
├── 横向间距：10pt（紧凑）
└── 纵向间距：15pt（标准）

站席区（区域C）
├── 座位尺寸：15pt（小座位）
├── 横向间距：5pt（密集）
└── 纵向间距：8pt（紧密）
```

### 数据隔离

```typescript
// 每个区域独立保存校准数据
sections = [
  {
    id: 'section-a',
    name: 'VIP区',
    calibrationData: { seatVisual: { size: 40, gapX: 20, gapY: 30 } }
  },
  {
    id: 'section-b',
    name: '普通区',
    calibrationData: { seatVisual: { size: 25, gapX: 10, gapY: 15 } }
  },
  {
    id: 'section-c',
    name: '站席区',
    calibrationData: { seatVisual: { size: 15, gapX: 5, gapY: 8 } }
  }
];
```

---

## Q12: 校准向导的步骤可以返回吗？

**A**: 可以，支持前后导航。

### 导航逻辑

```typescript
// useCalibrationWizard.ts

const nextStep = () => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex < STEP_ORDER.length - 1) {
    setCurrentStep(STEP_ORDER[currentIndex + 1]);
  }
};

const prevStep = () => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex > 0) {
    setCurrentStep(STEP_ORDER[currentIndex - 1]);
  }
};
```

### UI 实现

```tsx
// 每个步骤都提供返回按钮
<Button variant="ghost" onClick={onBack}>
  ‹ 返回
</Button>
```

### 数据保留

返回上一步时，已输入的数据会保留：
- 步骤2放置的座位 → 保留在 `placedSeats` 中
- 步骤3调整的尺寸 → 保留在 `confirmedSize` 中
- 步骤4定义的行间距 → 保留在 `calculatedRowSpacing` 中

---

## Q13: 校准完成后可以修改参数吗？

**A**: 可以，提供"重新校准"功能。

### 实现方案

```typescript
// 编辑模式顶部栏
<header>
  <Button onClick={onBack}>返回</Button>
  <span>{section.name} - 编辑模式</span>
  
  {/* 重新校准入口 */}
  <Button variant="outline" onClick={handleRecalibrate}>
    重新校准
  </Button>
</header>

// 重新校准处理
const handleRecalibrate = () => {
  // 重置校准状态
  updateCalibration({
    ...DEFAULT_CALIBRATION,
    isCalibrated: false,
  });
  
  // 切换到校准阶段
  setState(prev => ({
    ...prev,
    phase: 'calibrating',
  }));
};
```

### 使用场景

1. **底图更换**：上传新的底图后需要重新校准
2. **参数不准**：发现校准参数不准确
3. **座位调整**：场馆座位布局发生变化

---

**文档版本**：v1.0  
**创建日期**：2026-02-26  
**状态**：已完成
