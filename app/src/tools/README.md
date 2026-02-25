# Tool System 工具系统

基于完整设计方案中的交互模型设计，实现工具驱动的编辑器架构。

## 架构设计

### 核心概念

- **Tool**: 工具接口，所有工具必须实现此接口
- **ToolManager**: 工具管理器，负责工具的注册、切换和事件分发
- **ToolContext**: 工具上下文，提供给工具访问编辑器状态和操作的能力
- **ToolEvent**: 工具事件对象，包含所有坐标系下的点位置和修饰键状态

### 工具列表

| 工具 | ID | 功能 |
|------|-----|------|
| ViewTool | `view` | 默认工具，负责画布平移、缩放、点击选中 |
| SelectTool | `select` | 选择工具，负责框选、多选、套索选择 |
| DrawSectionTool | `draw-section` | 区域绘制工具，绘制多边形或矩形区域 |
| DrawSeatTool | `draw-seat` | 座位绘制工具，在选中区域内添加座位 |
| MoveTool | `move` | 移动工具，拖拽移动选中的座位或区域 |

## 使用方式

### 1. 创建 ToolManager

```typescript
const toolManager = new ToolManager(context);
```

### 2. 注册工具

```typescript
toolManager.registerTool(new ViewTool(context), 'view', 'v');
toolManager.registerTool(new SelectTool(context), 'edit', 's');
toolManager.registerTool(new DrawSectionTool(context), 'create', 'd');
// ...
```

### 3. 切换工具

```typescript
toolManager.setTool('select');
```

### 4. 事件分发

在画布组件中，将浏览器事件分发给 ToolManager:

```typescript
const handleMouseDown = (e: MouseEvent) => {
  toolManager.handleMouseDown(e, containerRef.current!);
};

const handleMouseMove = (e: MouseEvent) => {
  toolManager.handleMouseMove(e, containerRef.current!);
};

const handleMouseUp = (e: MouseEvent) => {
  toolManager.handleMouseUp(e, containerRef.current!);
};
```

### 5. 渲染 Overlay

```typescript
const overlay = toolManager.getCurrentTool()?.renderOverlay?.();
```

## 工具生命周期

1. **onActivate()**: 工具被激活时调用
2. **onDeactivate()**: 工具被停用时调用
3. **onMouseDown/Move/Up()**: 鼠标事件
4. **onKeyDown/Up()**: 键盘事件
5. **onWheel()**: 滚轮事件
6. **onDoubleClick()**: 双击事件
7. **renderOverlay()**: 渲染工具相关的预览/辅助图形

## 坐标系统

ToolEvent 提供三个坐标系下的点位置:

- **worldPoint**: 世界坐标 (数据存储和几何计算使用)
- **screenPoint**: 屏幕坐标 (浏览器事件)
- **viewportPoint**: 视口坐标 (画布容器内)

坐标转换公式:
```
worldX = (screenX - offsetX) / scale
screenX = worldX * scale + offsetX
```

## 扩展新工具

继承 `BaseTool` 并实现所需方法:

```typescript
export class MyTool extends BaseTool {
  id = 'my-tool';
  name = 'My Tool';
  icon = SomeIcon;
  cursor = 'pointer';

  onMouseDown(e: ToolEvent): void {
    // 处理鼠标按下
  }

  onMouseMove(e: ToolEvent): void {
    // 处理鼠标移动
  }

  onMouseUp(e: ToolEvent): void {
    // 处理鼠标释放
  }

  renderOverlay(): React.ReactNode {
    // 返回 SVG 元素
    return React.createElement('circle', {
      cx: 0, cy: 0, r: 10, fill: 'red'
    });
  }
}
```
