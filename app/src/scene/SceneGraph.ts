/**
 * SceneGraph - 场景图
 *
 * 管理所有图形对象（区域、座位）的层次结构。
 * 提供高效的查询、遍历和修改操作。
 * 支持空间索引用于快速的命中测试。
 */

import type { Section, Seat, Point, BoundingBox } from '@/types';
import { Geometry } from '@/utils/geometry';

/**
 * 命中测试结果
 */
export interface HitResult {
  /** 命中的类型 */
  type: 'section' | 'seat' | 'none';
  /** 命中的区域 */
  section?: Section;
  /** 命中的座位 */
  seat?: Seat;
}

/**
 * 场景图配置
 */
export interface SceneGraphConfig {
  /** 是否启用空间索引 */
  enableSpatialIndex: boolean;
  /** 网格大小（用于空间索引） */
  gridSize: number;
}

/**
 * 场景图类
 */
export class SceneGraph {
  private sections: Map<string, Section> = new Map();
  private seats: Map<string, Seat> = new Map();
  private sectionSeats: Map<string, Set<string>> = new Map(); // sectionId -> seatIds

  // 空间索引
  private spatialGrid: Map<string, Set<string>> = new Map(); // grid key -> seatIds
  private readonly gridSize: number;
  private readonly enableSpatialIndex: boolean;

  constructor(config: Partial<SceneGraphConfig> = {}) {
    this.enableSpatialIndex = config.enableSpatialIndex ?? true;
    this.gridSize = config.gridSize ?? 100;
  }

  // ==================== Section 操作 ====================

  /**
   * 添加区域
   */
  addSection(section: Section): void {
    this.sections.set(section.id, section);
    this.sectionSeats.set(section.id, new Set());

    // 添加区域内的所有座位
    for (const seat of section.seats) {
      this.seats.set(seat.id, seat);
      this.sectionSeats.get(section.id)?.add(seat.id);

      if (this.enableSpatialIndex) {
        this.addToSpatialIndex(seat);
      }
    }
  }

  /**
   * 移除区域
   */
  removeSection(id: string): Section | null {
    const section = this.sections.get(id);
    if (!section) return null;

    // 移除区域内的所有座位
    const seatIds = this.sectionSeats.get(id);
    if (seatIds) {
      for (const seatId of seatIds) {
        const seat = this.seats.get(seatId);
        if (seat && this.enableSpatialIndex) {
          this.removeFromSpatialIndex(seat);
        }
        this.seats.delete(seatId);
      }
    }

    this.sections.delete(id);
    this.sectionSeats.delete(id);

    return section;
  }

  /**
   * 更新区域
   */
  updateSection(id: string, updates: Partial<Section>): Section | null {
    const section = this.sections.get(id);
    if (!section) return null;

    Object.assign(section, updates);
    return section;
  }

  /**
   * 获取区域
   */
  getSection(id: string): Section | null {
    return this.sections.get(id) ?? null;
  }

  /**
   * 获取所有区域
   */
  getAllSections(): Section[] {
    return Array.from(this.sections.values());
  }

  /**
   * 获取区域数量
   */
  getSectionCount(): number {
    return this.sections.size;
  }

  // ==================== Seat 操作 ====================

  /**
   * 添加座位
   */
  addSeat(seat: Seat, sectionId: string): void {
    this.seats.set(seat.id, seat);

    const sectionSeatSet = this.sectionSeats.get(sectionId);
    if (sectionSeatSet) {
      sectionSeatSet.add(seat.id);
    }

    if (this.enableSpatialIndex) {
      this.addToSpatialIndex(seat);
    }
  }

  /**
   * 移除座位
   */
  removeSeat(id: string): Seat | null {
    const seat = this.seats.get(id);
    if (!seat) return null;

    // 从区域集合中移除
    for (const [_sectionId, seatIds] of this.sectionSeats) {
      if (seatIds.has(id)) {
        seatIds.delete(id);
        break;
      }
    }

    if (this.enableSpatialIndex) {
      this.removeFromSpatialIndex(seat);
    }

    this.seats.delete(id);
    return seat;
  }

  /**
   * 更新座位
   */
  updateSeat(id: string, updates: Partial<Seat>): Seat | null {
    const seat = this.seats.get(id);
    if (!seat) return null;

    // 如果位置改变，需要更新空间索引
    if ((updates.x !== undefined && updates.x !== seat.x) ||
        (updates.y !== undefined && updates.y !== seat.y)) {
      if (this.enableSpatialIndex) {
        this.removeFromSpatialIndex(seat);
      }

      Object.assign(seat, updates);

      if (this.enableSpatialIndex) {
        this.addToSpatialIndex(seat);
      }
    } else {
      Object.assign(seat, updates);
    }

    return seat;
  }

  /**
   * 获取座位
   */
  getSeat(id: string): Seat | null {
    return this.seats.get(id) ?? null;
  }

  /**
   * 获取所有座位
   */
  getAllSeats(): Seat[] {
    return Array.from(this.seats.values());
  }

  /**
   * 获取区域内的座位
   */
  getSeatsInSection(sectionId: string): Seat[] {
    const seatIds = this.sectionSeats.get(sectionId);
    if (!seatIds) return [];

    return Array.from(seatIds)
      .map(id => this.seats.get(id))
      .filter((seat): seat is Seat => seat !== undefined);
  }

  /**
   * 获取座位数量
   */
  getSeatCount(): number {
    return this.seats.size;
  }

  // ==================== 命中测试 ====================

  /**
   * 在指定点进行命中测试
   */
  hitTest(point: Point): HitResult {
    // 首先测试座位（优先级更高）
    const seat = this.getSeatAtPoint(point);
    if (seat) {
      return { type: 'seat', seat };
    }

    // 然后测试区域
    const section = this.getSectionAtPoint(point);
    if (section) {
      return { type: 'section', section };
    }

    return { type: 'none' };
  }

  /**
   * 获取指定点上的座位
   */
  getSeatAtPoint(point: Point, threshold: number = 10): Seat | null {
    if (this.enableSpatialIndex) {
      // 使用空间索引加速
      const nearbySeats = this.getNearbySeats(point, threshold);
      for (const seat of nearbySeats) {
        const dist = Geometry.distance(point, { x: seat.x, y: seat.y });
        if (dist <= threshold) {
          return seat;
        }
      }
    } else {
      // 线性搜索
      for (const seat of this.seats.values()) {
        const dist = Geometry.distance(point, { x: seat.x, y: seat.y });
        if (dist <= threshold) {
          return seat;
        }
      }
    }

    return null;
  }

  /**
   * 获取指定点上的区域
   */
  getSectionAtPoint(point: Point): Section | null {
    // 从后向前遍历（后绘制的在上层）
    const sections = this.getAllSections();
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (Geometry.pointInPolygon(point, section.points)) {
        return section;
      }
    }

    return null;
  }

  /**
   * 获取指定区域内的所有对象
   */
  getObjectsInArea(area: BoundingBox): { sections: Section[]; seats: Seat[] } {
    const sections: Section[] = [];
    const seats: Seat[] = [];

    // 检查区域
    for (const section of this.sections.values()) {
      const sectionBounds = Geometry.getBoundingBox(section.points);
      if (Geometry.boundingBoxesIntersect(sectionBounds, area)) {
        sections.push(section);
      }
    }

    // 检查座位
    if (this.enableSpatialIndex) {
      const nearbySeats = this.getSeatsInBoundingBox(area);
      seats.push(...nearbySeats);
    } else {
      for (const seat of this.seats.values()) {
        if (Geometry.pointInBoundingBox({ x: seat.x, y: seat.y }, area)) {
          seats.push(seat);
        }
      }
    }

    return { sections, seats };
  }

  // ==================== 空间索引 ====================

  /**
   * 获取网格键
   */
  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  /**
   * 添加到空间索引
   */
  private addToSpatialIndex(seat: Seat): void {
    const key = this.getGridKey(seat.x, seat.y);
    let set = this.spatialGrid.get(key);
    if (!set) {
      set = new Set();
      this.spatialGrid.set(key, set);
    }
    set.add(seat.id);
  }

  /**
   * 从空间索引移除
   */
  private removeFromSpatialIndex(seat: Seat): void {
    const key = this.getGridKey(seat.x, seat.y);
    const set = this.spatialGrid.get(key);
    if (set) {
      set.delete(seat.id);
      if (set.size === 0) {
        this.spatialGrid.delete(key);
      }
    }
  }

  /**
   * 获取附近的座位
   */
  private getNearbySeats(point: Point, radius: number): Seat[] {
    const results: Seat[] = [];
    const radiusInGrids = Math.ceil(radius / this.gridSize);

    const centerGridX = Math.floor(point.x / this.gridSize);
    const centerGridY = Math.floor(point.y / this.gridSize);

    for (let dx = -radiusInGrids; dx <= radiusInGrids; dx++) {
      for (let dy = -radiusInGrids; dy <= radiusInGrids; dy++) {
        const key = `${centerGridX + dx},${centerGridY + dy}`;
        const seatIds = this.spatialGrid.get(key);
        if (seatIds) {
          for (const id of seatIds) {
            const seat = this.seats.get(id);
            if (seat) {
              results.push(seat);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * 获取边界框内的座位
   */
  private getSeatsInBoundingBox(box: BoundingBox): Seat[] {
    const results: Seat[] = [];

    const minGridX = Math.floor(box.minX / this.gridSize);
    const maxGridX = Math.floor(box.maxX / this.gridSize);
    const minGridY = Math.floor(box.minY / this.gridSize);
    const maxGridY = Math.floor(box.maxY / this.gridSize);

    for (let gx = minGridX; gx <= maxGridX; gx++) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const key = `${gx},${gy}`;
        const seatIds = this.spatialGrid.get(key);
        if (seatIds) {
          for (const id of seatIds) {
            const seat = this.seats.get(id);
            if (seat) {
              results.push(seat);
            }
          }
        }
      }
    }

    return results;
  }

  // ==================== 批量操作 ====================

  /**
   * 批量移动座位
   */
  moveSeats(seatIds: string[], deltaX: number, deltaY: number): void {
    for (const id of seatIds) {
      const seat = this.seats.get(id);
      if (seat) {
        this.updateSeat(id, {
          x: seat.x + deltaX,
          y: seat.y + deltaY,
        });
      }
    }
  }

  /**
   * 批量删除座位
   */
  deleteSeats(seatIds: string[]): Seat[] {
    const deleted: Seat[] = [];
    for (const id of seatIds) {
      const seat = this.removeSeat(id);
      if (seat) {
        deleted.push(seat);
      }
    }
    return deleted;
  }

  /**
   * 清空场景
   */
  clear(): void {
    this.sections.clear();
    this.seats.clear();
    this.sectionSeats.clear();
    this.spatialGrid.clear();
  }

  // ==================== 序列化 ====================

  /**
   * 从 VenueMap 数据加载
   */
  fromJSON(data: { sections: Section[] }): void {
    this.clear();
    for (const section of data.sections) {
      this.addSection(section);
    }
  }

  /**
   * 导出为 VenueMap 数据
   */
  toJSON(): { sections: Section[] } {
    return {
      sections: this.getAllSections(),
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): { sections: number; seats: number } {
    return {
      sections: this.sections.size,
      seats: this.seats.size,
    };
  }
}

/**
 * 创建场景图
 */
export function createSceneGraph(config?: Partial<SceneGraphConfig>): SceneGraph {
  return new SceneGraph(config);
}
