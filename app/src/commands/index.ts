/**
 * Command Pattern 命令模式
 *
 * 基于完整设计方案中的命令模式设计，实现可撤销/重做的操作。
 * 每个命令封装一个操作及其逆操作，支持撤销重做功能。
 */

// Types
export type {
  Command,
  CommandContext,
  CommandHistoryEntry,
  ICommandManager,
} from './types';

// Classes
export { BatchCommand } from './types';

// Command Manager
export { CommandManager } from './CommandManager';

// Venue Commands
export {
  UploadSvgCommand,
  ImportDataCommand,
  UpdateVenueNameCommand,
} from './VenueCommands';

// Section Commands
export {
  CreateSectionCommand,
  DeleteSectionCommand,
  UpdateSectionCommand,
  BatchUpdateSectionsCommand,
  MoveSectionCommand,
} from './SectionCommands';

// Seat Commands
export {
  AddSeatCommand,
  AddSeatsCommand,
  DeleteSeatCommand,
  UpdateSeatCommand,
  MoveSeatsCommand,
  AlignSeatsCommand,
} from './SeatCommands';
