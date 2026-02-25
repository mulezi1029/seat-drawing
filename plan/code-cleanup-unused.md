# 代码清理计划 - 移除未使用的代码

## 目标
梳理 `/Users/cy/Downloads/座位绘制功能/app/src/` 文件夹下所有文件中定义的函数、变量、类型等，找出未被使用的代码，确保安全移除。

## 代码库结构概览

```
app/src/
├── main.tsx                    # 应用入口
├── App.tsx                     # 根组件
├── App.css                     # 应用样式
├── index.css                   # 全局样式
├── types/index.ts              # 类型定义
├── lib/utils.ts                # 工具函数 (仅 cn 函数)
├── hooks/
│   ├── index.ts                # hooks 导出
│   └── useSimpleViewer.ts      # 画布状态管理
└── components/
    ├── ui/
    │   ├── button.tsx          # 按钮组件
    │   └── tooltip.tsx         # 工具提示组件
    ├── canvas/
    │   ├── index.ts            # canvas 导出
    │   ├── Canvas.tsx          # 画布容器
    │   └── SVGRenderer.tsx     # SVG 渲染器
    └── panels/
        ├── index.ts            # panels 导出
        ├── PanelTop.tsx        # 顶部工具栏
        ├── PanelLeft.tsx       # 左侧工具栏
        ├── PanelRight.tsx      # 右侧属性面板
        └── FloatingControls.tsx # 悬浮控件
```

---

## 未使用的代码清单

### 1. types/index.ts - 大量未使用的类型定义

**未使用的接口（当前代码中无引用）：**

| 名称 | 类型 | 说明 |
|------|------|------|
| `Seat` | interface | 座位接口，但 SVGRenderer.tsx 中使用了局部定义 |
| `SeatGroup` | interface | 座位组接口，完全未使用 |
| `Section` | interface | 区域接口，但 SVGRenderer.tsx 中使用了局部定义 |
| `VenueMap` | interface | 场馆地图接口，完全未使用 |
| `EditorState` | interface | 编辑器状态接口，完全未使用 |
| `DrawConfig` | interface | 绘制配置接口，完全未使用 |
| `ViewConfig` | interface | 视图配置接口，完全未使用 |
| `Category` | interface | 类别接口，完全未使用 |
| `ClipboardData` | interface | 剪贴板数据接口，完全未使用 |
| `SectionCanvas` | interface | Section 局部画布状态，完全未使用 |

**未使用的类型别名：**

| 名称 | 类型 | 说明 |
|------|------|------|
| `EditorMode` | type | 编辑器模式，完全未使用 |
| `SectionDrawMode` | type | 区域绘制模式，完全未使用 |
| `SeatTool` | type | 座位工具，完全未使用 |
| `CanvasTool` | type | 画布工具，完全未使用 |
| `AlignType` | type | 对齐类型，完全未使用 |

**当前仅使用的类型：**
- `CANVAS_CONFIG` - 被多处使用 ✓
- `ViewportState` - 被 useSimpleViewer.ts 使用 ✓
- `Point` - 被多个接口引用（但接口本身未使用）
- `BoundingBox` - 被 SectionCanvas 引用（但 SectionCanvas 未使用）

---

### 2. components/ui/tooltip.tsx - 未使用的导出

**未使用的导出：**
- `TooltipArrow` - 导出了但项目中没有任何地方使用

---

### 3. components/panels/FloatingControls.tsx - 未使用的组件

**未使用的组件：**
- `FloorPicker` - 组件实现完整，但在 FloatingControls 中被注释掉

```tsx
// FloatingControls.tsx 第 184 行
{/* <FloorPicker /> */}
```

---

### 4. components/panels/index.ts - 导出未使用的组件

**导出未使用的组件：**
```typescript
export { FloatingControls, NavigationHUD, FloorPicker, StatusBar } from './FloatingControls';
```
- `FloorPicker` - 虽然被导出，但实际未使用

---

### 5. SVGRenderer.tsx - 局部定义替代了全局类型

**问题：**
- 文件内定义了局部的 `Section` 和 `Seat` 接口，与 types/index.ts 中的全局定义重复
- 全局的 `Seat` 和 `Section` 接口未被使用

---

## 清理方案

### 方案一：保守清理（推荐）

只移除确定未使用的代码，保留可能未来会使用的类型定义。

**需要移除的代码：**

1. **tooltip.tsx** - 移除 `TooltipArrow` 导出
2. **FloatingControls.tsx** - 移除 `FloorPicker` 组件（或取消注释使用）
3. **panels/index.ts** - 从导出中移除 `FloorPicker`

### 方案二：全面清理

移除所有当前未使用的类型定义和代码。

**需要移除的代码：**

1. **types/index.ts** - 移除以下未使用的类型：
   - 接口：`Seat`, `SeatGroup`, `Section`, `VenueMap`, `EditorState`, `DrawConfig`, `ViewConfig`, `Category`, `ClipboardData`, `SectionCanvas`
   - 类型别名：`EditorMode`, `SectionDrawMode`, `SeatTool`, `CanvasTool`, `AlignType`
   - 保留：`CANVAS_CONFIG`, `ViewportState`, `Point`, `BoundingBox`（后两个可能被未来使用）

2. **tooltip.tsx** - 移除 `TooltipArrow` 导出

3. **FloatingControls.tsx** - 移除 `FloorPicker` 组件

4. **panels/index.ts** - 从导出中移除 `FloorPicker`

---

## 用户决策结果

| 问题 | 决策 | 说明 |
|------|------|------|
| **FloorPicker 组件** | ✅ 保留并启用 | 取消注释，在 FloatingControls 中显示 |
| **types/index.ts 中的类型定义** | ⏳ 待定 | 等待用户决策 |
| **TooltipArrow** | ⏳ 待定 | 等待用户决策 |

---

## 安全移除验证方法

1. **TypeScript 编译检查**：运行 `tsc --noEmit` 检查类型错误
2. **ESLint 检查**：运行 ESLint 检查未使用的导出
3. **手动检查**：确保移除的代码没有被任何文件引用

---

## 实施步骤

1. 根据用户决策选择清理方案
2. 移除未使用的代码
3. 运行 TypeScript 编译验证
4. 运行应用验证功能正常
