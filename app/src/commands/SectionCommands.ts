/**
 * Section 相关命令
 *
 * 包含创建、删除、更新区域的命令
 */

import type { Command, CommandContext } from './types';
import type { Section, Point } from '@/types';

/**
 * 创建区域命令
 */
export class CreateSectionCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private section: Section;

  constructor(section: Section) {
    this.id = `create-section-${Date.now()}`;
    this.description = `Create section "${section.name}"`;
    this.timestamp = Date.now();
    this.section = section;
  }

  execute(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: [...context.venueMap.sections, this.section],
    });
  }

  undo(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.filter(s => s.id !== this.section.id),
    });
  }
}

/**
 * 删除区域命令
 */
export class DeleteSectionCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private section: Section | null = null;

  constructor(sectionId: string) {
    this.id = `delete-section-${Date.now()}`;
    this.description = 'Delete section';
    this.timestamp = Date.now();
    this.sectionId = sectionId;
  }

  execute(context: CommandContext): void {
    const section = context.getSection(this.sectionId);
    if (section) {
      this.section = section;
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.filter(s => s.id !== this.sectionId),
      });
      // 如果当前选中的是被删除的区域，清除选择
      if (context.editorState.selectedSectionId === this.sectionId) {
        context.setSelectedSectionId(null);
      }
    }
  }

  undo(context: CommandContext): void {
    if (this.section) {
      context.setVenueMap({
        ...context.venueMap,
        sections: [...context.venueMap.sections, this.section],
      });
    }
  }
}

/**
 * 更新区域命令
 */
export class UpdateSectionCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private updates: Partial<Section>;
  private originalSection: Section | null = null;

  constructor(sectionId: string, updates: Partial<Section>) {
    this.id = `update-section-${Date.now()}`;
    this.description = 'Update section';
    this.timestamp = Date.now();
    this.sectionId = sectionId;
    this.updates = updates;
  }

  execute(context: CommandContext): void {
    const section = context.getSection(this.sectionId);
    if (section) {
      this.originalSection = { ...section };
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(s =>
          s.id === this.sectionId ? { ...s, ...this.updates } : s
        ),
      });
    }
  }

  undo(context: CommandContext): void {
    if (this.originalSection) {
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(s =>
          s.id === this.sectionId ? this.originalSection! : s
        ),
      });
    }
  }
}

/**
 * 移动区域命令
 * 用于拖拽移动 Section 位置
 */
export class MoveSectionCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private sectionId: string;
  private deltaX: number;
  private deltaY: number;
  private originalPoints: Point[] | null = null;

  constructor(sectionId: string, deltaX: number, deltaY: number) {
    this.id = `move-section-${Date.now()}`;
    this.description = 'Move section';
    this.timestamp = Date.now();
    this.sectionId = sectionId;
    this.deltaX = deltaX;
    this.deltaY = deltaY;
  }

  execute(context: CommandContext): void {
    const section = context.getSection(this.sectionId);
    if (section) {
      this.originalPoints = [...section.points];
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(s =>
          s.id === this.sectionId
            ? {
                ...s,
                points: s.points.map(p => ({
                  x: p.x + this.deltaX,
                  y: p.y + this.deltaY,
                })),
              }
            : s
        ),
      });
    }
  }

  undo(context: CommandContext): void {
    if (this.originalPoints) {
      context.setVenueMap({
        ...context.venueMap,
        sections: context.venueMap.sections.map(s =>
          s.id === this.sectionId ? { ...s, points: this.originalPoints! } : s
        ),
      });
    }
  }

  /**
   * 更新移动增量（用于拖拽预览时更新最终位置）
   */
  updateDelta(deltaX: number, deltaY: number): void {
    this.deltaX = deltaX;
    this.deltaY = deltaY;
  }
}

/**
 * 批量更新区域命令
 */
export class BatchUpdateSectionsCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private updates: Map<string, Partial<Section>>;
  private originalSections: Map<string, Section> = new Map();

  constructor(updates: Map<string, Partial<Section>>) {
    this.id = `batch-update-sections-${Date.now()}`;
    this.description = 'Update multiple sections';
    this.timestamp = Date.now();
    this.updates = updates;
  }

  execute(context: CommandContext): void {
    this.originalSections.clear();
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(s => {
        const update = this.updates.get(s.id);
        if (update) {
          this.originalSections.set(s.id, { ...s });
          return { ...s, ...update };
        }
        return s;
      }),
    });
  }

  undo(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      sections: context.venueMap.sections.map(s => {
        const original = this.originalSections.get(s.id);
        if (original) {
          return original;
        }
        return s;
      }),
    });
  }
}
