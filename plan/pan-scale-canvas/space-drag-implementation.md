# 空格键拖拽功能实现方案

## 问题描述

当前按下空格键会触发页面垂直滚动条向下滚动，需要实现与 seats.io 一致的空格拖拽功能：
- 按下空格键：选中 PanelLeft 的 Hand/Pan 工具，光标变为抓取样式
- 拖拽：平移画布
- 释放空格键：恢复到之前的工具

## 当前代码分析

### Canvas.tsx
已处理空格键事件，使用 `e.preventDefault()` 阻止默认滚动，但状态与 PanelLeft 不共享。

### PanelLeft.tsx
Hand 工具状态在组件内部管理，与 Canvas 无连接。

## 功能需求

1. **空格键临时平移**：按住空格键临时切换到 Hand 工具，释放后恢复
2. **Hand 工具主动选中**：点击左侧工具栏的 Hand 工具，也能进入平移模式

## 问题根因

1. **状态孤岛**：Canvas 的 `isSpacePressed` 状态与 PanelLeft 的 `activeTool` 状态相互独立
2. **无工具状态共享**：空格键按下时无法通知 PanelLeft 高亮 Hand 工具
3. **平移逻辑单一**：Canvas 只响应 `isSpacePressed`，不响应 Hand 工具选中状态

## 实现方案

将 `activeTool` 和 `isSpacePressed` 状态提升到 App.tsx，通过 props 传递给 Canvas 和 PanelLeft。

### 修改文件列表

| 文件 | 修改内容 |
|------|---------|
| App.tsx | 添加工具状态和空格键事件处理，传递 `activeTool` 和 `isSpacePressed` 给 Canvas |
| PanelLeft.tsx | 移除内部状态，改为接收 props |
| Canvas.tsx | 接收 `isSpacePressed` 和 `activeTool`，两者任一激活时都可平移 |

### 关键逻辑

1. 空格键按下时：保存当前工具到 `previousTool`，切换到 'hand' 工具
2. 空格键释放时：从 `previousTool` 恢复之前的工具
3. 阻止默认事件：防止页面滚动
4. Hand 工具选中：Canvas 接收 `activeTool` prop，当 `activeTool === 'hand'` 时也能平移

### Canvas 平移触发条件

```typescript
// 判断是否应触发平移
const shouldPan = useCallback(
  (e: React.MouseEvent | MouseEvent) => {
    return e.button === 1 || ((isSpacePressed || isHandToolActive) && e.button === 0);
  },
  [isSpacePressed, isHandToolActive]
);
```

平移触发条件：
- 鼠标中键拖拽 (`e.button === 1`)
- 空格键按下 + 左键拖拽 (`isSpacePressed && e.button === 0`)
- Hand 工具选中 + 左键拖拽 (`isHandToolActive && e.button === 0`)
