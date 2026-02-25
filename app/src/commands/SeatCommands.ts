/**
 * Seat 相关命令
 *
 * 包含创建、删除、更新座位以及移动座位的命令
 */

import type { Command, CommandContext } from './types';
import type { Seat } from '@/types';

/**
 * 添加座位命令
 */
export class AddSeatCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private seat: Seat;

  constructor(sectionId: string, seat: Seat) {
    this.id = `add-seat-${Date.now()}`;
    this.description = `Add seat ${seat.row}-${seat.number}`;
    this.timestamp = Date.now();
    this.sectionId = sectionId;
    this.seat = seat;
  }

  execute(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section =>
        section.id === this.sectionId
          ? { ...section, seats: [...section.seats, this.seat] }
          : section
      ),
    });
  }

  undo(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section =>
        section.id === this.sectionId
          ? { ...section, seats: section.seats.filter(s => s.id !== this.seat.id) }
          : section
      ),
    });
  }
}

/**
 * 批量添加座位命令
 */
export class AddSeatsCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private seats: Seat[];

  constructor(sectionId: string, seats: Seat[]) {
    this.id = `add-seats-${Date.now()}`;
    this.description = `Add ${seats.length} seats`;
    this.timestamp = Date.now();
    this.sectionId = sectionId;
    this.seats = seats;
  }

  execute(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section =>
        section.id === this.sectionId
          ? { ...section, seats: [...section.seats, ...this.seats] }
          : section
      ),
    });
  }

  undo(context: CommandContext): void {
    const seatIds = new Set(this.seats.map(s => s.id));
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section =>
        section.id === this.sectionId
          ? { ...section, seats: section.seats.filter(s => !seatIds.has(s.id)) }
          : section
      ),
    });
  }
}

/**
 * 删除座位命令
 */
export class DeleteSeatCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private seatId: string;
  private seat: Seat | null = null;

  constructor(sectionId: string, seatId: string) {
    this.id = `delete-seat-${Date.now()}`;
    this.description = 'Delete seat';
    this.timestamp = Date.now();
    this.sectionId = sectionId;
    this.seatId = seatId;
  }

  execute(context: CommandContext): void {
    const section = context.getSection(this.sectionId);
    if (section) {
      const seat = section.seats.find(s => s.id === this.seatId);
      if (seat) {
        this.seat = seat;
        context.setVenueMap({
          ...context.venueMap,
          sections: context.venueMap.sections.map(s =>
            s.id === this.sectionId
              ? { ...s, seats: s.seats.filter(seat => seat.id !== this.seatId) }
              : s
          ),
        });
        // 从选中列表中移除
        context.setSelectedSeatIds(prev => prev.filter(id => id !== this.seatId));
      }
    }
  }

  undo(context: CommandContext): void {
    if (this.seat) {
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(section =>
          section.id === this.sectionId
            ? { ...section, seats: [...section.seats, this.seat!] }
            : section
        ),
      });
    }
  }
}

/**
 * 更新座位命令
 */
export class UpdateSeatCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private seatId: string;
  private updates: Partial<Seat>;
  private originalSeat: Seat | null = null;

  constructor(sectionId: string, seatId: string, updates: Partial<Seat>) {
    this.id = `update-seat-${Date.now()}`;
    this.description = 'Update seat';
    this.timestamp = Date.now();
    this.sectionId = sectionId;
    this.seatId = seatId;
    this.updates = updates;
  }

  execute(context: CommandContext): void {
    const seat = context.getSeat(this.sectionId, this.seatId);
    if (seat) {
      this.originalSeat = { ...seat };
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(section =>
          section.id === this.sectionId
            ? {
                ...section,
                seats: section.seats.map(s =>
                  s.id === this.seatId ? { ...s, ...this.updates } : s
                ),
              }
            : section
        ),
      });
    }
  }

  undo(context: CommandContext): void {
    if (this.originalSeat) {
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(section =>
          section.id === this.sectionId
            ? {
                ...section,
                seats: section.seats.map(s =>
                  s.id === this.seatId ? this.originalSeat! : s
                ),
              }
            : section
        ),
      });
    }
  }
}

/**
 * 移动座位命令
 */
export class MoveSeatsCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private seatIds: string[];
  private deltaX: number;
  private deltaY: number;
  private originalPositions: Map<string, { x: number; y: number }> = new Map();

  constructor(seatIds: string[], deltaX: number, deltaY: number) {
    this.id = `move-seats-${Date.now()}`;
    this.description = `Move ${seatIds.length} seat(s)`;
    this.timestamp = Date.now();
    this.seatIds = seatIds;
    this.deltaX = deltaX;
    this.deltaY = deltaY;
  }

  execute(context: CommandContext): void {
    this.originalPositions.clear();
    const seatIdSet = new Set(this.seatIds);

    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section => ({
        ...section,
        seats: section.seats.map(seat => {
          if (seatIdSet.has(seat.id)) {
            this.originalPositions.set(seat.id, { x: seat.x, y: seat.y });
            return { ...seat, x: seat.x + this.deltaX, y: seat.y + this.deltaY };
          }
          return seat;
        }),
      })),
    });
  }

  undo(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section => ({
        ...section,
        seats: section.seats.map(seat => {
          const original = this.originalPositions.get(seat.id);
          if (original) {
            return { ...seat, x: original.x, y: original.y };
          }
          return seat;
        }),
      })),
    });
  }
}

/**
 * 对齐座位命令
 */
export class AlignSeatsCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private seatIds: string[];
  private alignType: string;
  private originalPositions: Map<string, { x: number; y: number }> = new Map();

  constructor(seatIds: string[], alignType: string) {
    this.id = `align-seats-${Date.now()}`;
    this.description = `Align ${seatIds.length} seat(s) ${alignType}`;
    this.timestamp = Date.now();
    this.seatIds = seatIds;
    this.alignType = alignType;
  }

  execute(context: CommandContext): void {
    // 收集要对其的座位
    const seatsToAlign: Seat[] = [];
    for (const section of context.venueMap.sections) {
      for (const seat of section.seats) {
        if (this.seatIds.includes(seat.id)) {
          seatsToAlign.push(seat);
        }
      }
    }

    if (seatsToAlign.length < 2) return;

    // 保存原始位置
    this.originalPositions.clear();
    seatsToAlign.forEach(seat => {
      this.originalPositions.set(seat.id, { x: seat.x, y: seat.y });
    });

    // 计算对齐值
    let targetX: number | null = null;
    let targetY: number | null = null;

    switch (this.alignType) {
      case 'left':
        targetX = Math.min(...seatsToAlign.map(s => s.x));
        break;
      case 'right':
        targetX = Math.max(...seatsToAlign.map(s => s.x));
        break;
      case 'center':
        targetX = (Math.min(...seatsToAlign.map(s => s.x)) + Math.max(...seatsToAlign.map(s => s.x))) / 2;
        break;
      case 'top':
        targetY = Math.min(...seatsToAlign.map(s => s.y));
        break;
      case 'bottom':
        targetY = Math.max(...seatsToAlign.map(s => s.y));
        break;
      case 'middle':
        targetY = (Math.min(...seatsToAlign.map(s => s.y)) + Math.max(...seatsToAlign.map(s => s.y))) / 2;
        break;
    }

    const seatIdSet = new Set(this.seatIds);
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section => ({
        ...section,
        seats: section.seats.map(seat => {
          if (seatIdSet.has(seat.id)) {
            return {
              ...seat,
              x: targetX !== null ? targetX : seat.x,
              y: targetY !== null ? targetY : seat.y,
            };
          }
          return seat;
        }),
      })),
    });
  }

  undo(context: CommandContext): void {
    const seatIdSet = new Set(this.seatIds);
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(section => ({
        ...section,
        seats: section.seats.map(seat => {
          const original = this.originalPositions.get(seat.id);
          if (original && seatIdSet.has(seat.id)) {
            return { ...seat, x: original.x, y: original.y };
          }
          return seat;
        }),
      })),
    });
  }
}
