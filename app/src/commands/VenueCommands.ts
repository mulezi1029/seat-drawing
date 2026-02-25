/**
 * Venue 相关命令
 *
 * 包含上传 SVG、导入数据等全局操作命令
 */

import type { Command, CommandContext } from './types';
import type { VenueMap } from '@/types';

/**
 * 上传 SVG 命令
 */
export class UploadSvgCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private svgUrl: string;
  private svgContent: string;
  private originalUrl: string | null = null;
  private originalContent: string | null = null;

  constructor(svgUrl: string, svgContent: string) {
    this.id = `upload-svg-${Date.now()}`;
    this.description = 'Upload SVG background';
    this.timestamp = Date.now();
    this.svgUrl = svgUrl;
    this.svgContent = svgContent;
  }

  execute(context: CommandContext): void {
    this.originalUrl = context.venueMap.svgUrl;
    this.originalContent = context.venueMap.svgContent;
    context.setVenueMap({
      ...context.venueMap,
      svgUrl: this.svgUrl,
      svgContent: this.svgContent,
    });
  }

  undo(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      svgUrl: this.originalUrl,
      svgContent: this.originalContent,
    });
  }
}

/**
 * 导入数据命令
 */
export class ImportDataCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private newData: VenueMap;
  private originalData: VenueMap | null = null;

  constructor(data: VenueMap) {
    this.id = `import-data-${Date.now()}`;
    this.description = 'Import venue data';
    this.timestamp = Date.now();
    this.newData = data;
  }

  execute(context: CommandContext): void {
    this.originalData = { ...context.venueMap };
    context.setVenueMap(this.newData);
  }

  undo(context: CommandContext): void {
    if (this.originalData) {
      context.setVenueMap(this.originalData);
    }
  }
}

/**
 * 更新场馆名称命令
 */
export class UpdateVenueNameCommand implements Command {
  id: string;
  description: string;
  timestamp: number;
  private newName: string;
  private originalName: string = '';

  constructor(name: string) {
    this.id = `update-name-${Date.now()}`;
    this.description = 'Update venue name';
    this.timestamp = Date.now();
    this.newName = name;
  }

  execute(context: CommandContext): void {
    this.originalName = context.venueMap.name;
    context.setVenueMap({
      ...context.venueMap,
      name: this.newName,
    });
  }

  undo(context: CommandContext): void {
    context.setVenueMap({
      ...context.venueMap,
      name: this.originalName,
    });
  }
}
