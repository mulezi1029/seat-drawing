# 未使用状态变量分析

## 概述

代码中存在以下以 `_` 开头标记的未使用状态变量，本文档分析它们的潜在使用场景与作用。

| 变量名 | 位置 | 类型 | 当前状态 |
|--------|------|------|----------|
| `_isShiftPressed` | App.tsx | boolean | 接收但未使用 |
| `_isCtrlPressed` | App.tsx | boolean | 接收但未使用 |
| `_mousePosition` | Canvas.tsx | Point \| null | 设置但未读取 |
| `_snapResult` | Canvas.tsx | SnapResult \| null | 设置但未读取 |

---

## 1. `_isShiftPressed` / `_isCtrlPressed`

### 当前数据流

```
用户按键
    ↓
Canvas.tsx: setIsShiftPressed(true)  →  内部使用（约束矩形/角度）
    ↓
onShiftPressedChange?.(true)  →  回调传出
    ↓
App.tsx: setIsShiftPressed(true)  →  保存到 _isShiftPressed（未使用）
```

### 潜在使用场景

#### 1.1 状态栏显示
在底部状态栏实时显示当前按键状态，帮助用户了解可用的快捷键操作。

```typescript
// StatusBar.tsx
<StatusBar>
  <KeyIndicator active={_isShiftPressed}>SHIFT</KeyIndicator>
  <KeyIndicator active={_isCtrlPressed}>CTRL</KeyIndicator>
  <Hint>按住 Shift 可约束为正方形</Hint>
</StatusBar>
```

#### 1.2 快捷键提示系统
当 Shift 按下时，UI 高亮显示当前可用的约束操作。

```typescript
// 在绘制模式下显示
{activeTool === 'section' && _isShiftPressed && (
  <Tooltip>当前约束: 正方形绘制</Tooltip>
)}
```

#### 1.3 全局快捷键处理
App 层处理全局快捷键（保存、撤销、重做等）。

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (_isCtrlPressed && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (_isCtrlPressed && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
  };
}, [_isCtrlPressed]);
```

#### 1.4 属性面板联动
在选择工具下，显示多选提示。

```typescript
// PanelRight.tsx
<SelectionHelp>
  {_isShiftPressed
    ? "点击元素添加到选择"
    : "按住 Shift 可多选"}
</SelectionHelp>
```

---

## 2. `_mousePosition` / `_snapResult`

### 当前数据流

```
鼠标移动
    ↓
Canvas.tsx: 计算 worldPoint, snap, alignment
    ↓
setMousePosition(finalMousePosition)  →  保存到 state（未读取）
setSnapResult(snapWithAlignment)      →  保存到 state（未读取）
    ↓
onMousePositionChange?.(finalMousePosition)  →  传给 App
onSnapResultChange?.(snapWithAlignment)      →  传给 App
```

### 潜在使用场景

#### 2.1 调试面板
开发模式下显示实时坐标、吸附类型、对齐状态，便于调试吸附系统。

```typescript
// DebugOverlay.tsx (仅在 process.env.NODE_ENV === 'development' 显示)
<DebugPanel>
  <Row>鼠标世界坐标: ({_mousePosition?.x.toFixed(2)}, {_mousePosition?.y.toFixed(2)})</Row>
  <Row>吸附类型: {_snapResult?.type}</Row>
  <Row>水平对齐: {_snapResult?.alignment?.isHorizontalAligned ? '是' : '否'}</Row>
  <Row>垂直对齐: {_snapResult?.alignment?.isVerticalAligned ? '是' : '否'}</Row>
</DebugPanel>
```

#### 2.2 本地缓存优化
避免频繁回调导致的父组件重渲染，先本地聚合再批量传出。

```typescript
// 使用 throttle 优化
const throttledPositionChange = useThrottle(onMousePositionChange, 100);

// 本地 state 实时更新，回调节流
setMousePosition(finalMousePosition);  // 本地立即更新（用于调试/UI）
throttledPositionChange(finalMousePosition);  // 回调节流传出
```

#### 2.3 操作日志记录
记录用户操作轨迹用于分析或回放功能。

```typescript
useEffect(() => {
  if (_mousePosition) {
    logger.log({
      type: 'mouse_move',
      position: _mousePosition,
      snap: _snapResult,
      timestamp: Date.now(),
    });
  }
}, [_mousePosition, _snapResult]);
```

#### 2.4 Canvas 内部其他 Hook 依赖
未来可能有其他 hook 或 useEffect 依赖这些值。

```typescript
// 例如：自动保存草稿
useEffect(() => {
  if (isDrawing && _mousePosition) {
    autoSaveDraft({
      points: drawingPoints,
      currentPosition: _mousePosition,
    });
  }
}, [_mousePosition, isDrawing, drawingPoints]);
```

---

## 3. 建议

### 方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **保持现状** | 下划线标记 + eslint-disable | 保留扩展性，代码清晰 | 有轻微的代码噪音 |
| **删除未使用变量** | 仅保留 setter，删除 state | 代码更简洁 | 失去扩展性，需要时再添加 |
| **实现状态栏** | 立即赋予实际用途 | 提升用户体验 | 需要额外开发工作 |
| **开发调试面板** | 仅在 dev 模式显示 | 便于调试，生产无影响 | 需要额外开发工作 |

### 推荐做法

**短期**：保持现状（方案1）
- 这些变量作为"预埋接口"存在
- 下划线命名明确表示"有意保留"
- eslint-disable 注释避免警告

**中期**：实现调试面板（方案4）
- 在开发模式下显示坐标和吸附状态
- 帮助调试吸附系统的行为
- 不影响生产环境

**长期**：根据功能需求决定
- 如果需要状态栏，使用 `_isShiftPressed` / `_isCtrlPressed`
- 如果需要操作回放，使用 `_mousePosition` 记录轨迹
- 如果始终不需要，可以考虑删除

---

## 4. 相关代码位置

| 变量 | 定义位置 | 设置位置 | 传出回调 |
|------|----------|----------|----------|
| `_isShiftPressed` | App.tsx:65 | Canvas.tsx:810 | `onShiftPressedChange` |
| `_isCtrlPressed` | App.tsx:67 | Canvas.tsx:816 | `onCtrlPressedChange` |
| `_mousePosition` | Canvas.tsx:153 | Canvas.tsx:547 | `onMousePositionChange` |
| `_snapResult` | Canvas.tsx:155 | Canvas.tsx:548 | `onSnapResultChange` |
