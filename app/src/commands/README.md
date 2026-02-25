# Command Pattern 命令模式

基于完整设计方案中的命令模式设计，实现可撤销/重做的操作。

## 架构设计

### 核心概念

- **Command**: 命令接口，所有命令必须实现此接口
- **CommandManager**: 命令管理器，负责命令的执行、撤销、重做和历史记录
- **CommandContext**: 命令上下文，提供给命令访问编辑器状态和操作的能力
- **BatchCommand**: 批量命令，将多个命令组合为一个原子操作

### 命令接口

```typescript
interface Command {
  id: string;
  description: string;
  timestamp: number;

  execute(context: CommandContext): void;
  undo(context: CommandContext): void;
  redo?(context: CommandContext): void;
}
```

## 使用方式

### 1. 创建 CommandManager

```typescript
const commandManager = new CommandManager(context, 50); // 最大50条历史记录
```

### 2. 创建并执行命令

```typescript
const command: Command = {
  id: 'create-seat-123',
  description: 'Create seat at (100, 200)',
  timestamp: Date.now(),

  execute(context) {
    // 添加座位
    const section = context.venueMap.sections.find(s => s.id === sectionId);
    section?.seats.push(newSeat);
  },

  undo(context) {
    // 删除座位
    const section = context.venueMap.sections.find(s => s.id === sectionId);
    if (section) {
      section.seats = section.seats.filter(s => s.id !== seatId);
    }
  },
};

commandManager.execute(command);
```

### 3. 撤销/重做

```typescript
// 撤销
if (commandManager.canUndo()) {
  commandManager.undo();
}

// 重做
if (commandManager.canRedo()) {
  commandManager.redo();
}
```

### 4. 批量命令

```typescript
const commands: Command[] = [
  moveSeat1Command,
  moveSeat2Command,
  moveSeat3Command,
];

commandManager.executeBatch(commands, 'Move 3 seats');
```

### 5. 监听变更

```typescript
const unsubscribe = commandManager.onChange(() => {
  console.log('Can undo:', commandManager.canUndo());
  console.log('Can redo:', commandManager.canRedo());
});

// 取消监听
unsubscribe();
```

## 命令生命周期

1. **execute()**: 执行命令 (首次执行或重做时)
2. **undo()**: 撤销命令
3. **redo()**: 重做命令 (可选，默认调用 execute)

## 历史记录管理

CommandManager 自动管理历史记录:

- 最大历史记录数可配置 (默认 50)
- 执行新命令时，撤销栈中的命令会被清除
- 提供 `getHistory()` 方法获取历史记录 (用于 UI 显示)

## 扩展新命令

实现 `Command` 接口:

```typescript
export class CreateSeatCommand implements Command {
  id: string;
  description: string;
  timestamp: number;

  constructor(
    private sectionId: string,
    private seatData: SeatData
  ) {
    this.id = `create-seat-${Date.now()}`;
    this.description = `Create seat ${seatData.label}`;
    this.timestamp = Date.now();
  }

  execute(context: CommandContext): void {
    const section = context.venueMap.sections.find(s => s.id === this.sectionId);
    section?.seats.push({ ...this.seatData, id: generateId() });
  }

  undo(context: CommandContext): void {
    const section = context.venueMap.sections.find(s => s.id === this.sectionId);
    if (section) {
      section.seats = section.seats.filter(s => s.label !== this.seatData.label);
    }
  }
}
```

## 与 Tool System 集成

工具通过回调通知外部执行命令:

```typescript
const drawSeatTool = new DrawSeatTool(context);
drawSeatTool.onDrawingComplete = (command) => {
  // 创建命令并执行
  const createCommand: Command = {
    id: `create-seat-${Date.now()}`,
    description: `Create seat at (${command.position.x}, ${command.position.y})`,
    timestamp: Date.now(),
    execute: () => { /* ... */ },
    undo: () => { /* ... */ },
  };
  commandManager.execute(createCommand);
};
```
