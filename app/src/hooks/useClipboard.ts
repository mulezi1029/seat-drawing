/**
 * useClipboard Hook
 *
 * 剪贴板管理 Hook，负责复制、剪切、粘贴功能。
 *
 * 功能：
 * - 复制选中的座位
 * - 剪切选中的座位
 * - 粘贴座位（带偏移量避免重叠）
 * - 支持多次粘贴，每次偏移量增加
 */

import { useState, useCallback, useRef } from 'react';
import type { Seat, Point } from '@/types';

/** 剪贴板数据 */
export interface ClipboardData {
  /** 复制的数据类型 */
  type: 'seats';
  /** 源区域 ID */
  sourceSectionId: string;
  /** 复制的座位数据（深拷贝） */
  seats: Seat[];
  /** 原始位置的中心点 */
  centerPoint: Point;
}

export interface UseClipboardReturn {
  /** 当前剪贴板数据 */
  clipboard: ClipboardData | null;
  /** 是否可以粘贴 */
  canPaste: boolean;
  /** 复制座位 */
  copySeats: (seats: Seat[], sectionId: string) => void;
  /** 剪切座位 */
  cutSeats: (seats: Seat[], sectionId: string, onDelete: (seatIds: string[]) => void) => void;
  /** 粘贴座位 */
  pasteSeats: (targetSectionId: string) => Seat[] | null;
  /** 清空剪贴板 */
  clearClipboard: () => void;
}

/** 粘贴偏移量 */
const PASTE_OFFSET = 30;

export function useClipboard(): UseClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const pasteCountRef = useRef(0);

  /**
   * 计算座位组的中心点
   */
  const calculateCenterPoint = useCallback((seats: Seat[]): Point => {
    if (seats.length === 0) return { x: 0, y: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const seat of seats) {
      minX = Math.min(minX, seat.x);
      maxX = Math.max(maxX, seat.x);
      minY = Math.min(minY, seat.y);
      maxY = Math.max(maxY, seat.y);
    }

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
  }, []);

  /**
   * 复制座位到剪贴板
   */
  const copySeats = useCallback((seats: Seat[], sectionId: string) => {
    if (seats.length === 0) return;

    // 深拷贝座位数据
    const copiedSeats: Seat[] = seats.map(seat => ({
      ...seat,
      id: crypto.randomUUID(), // 生成新 ID
    }));

    const centerPoint = calculateCenterPoint(seats);

    setClipboard({
      type: 'seats',
      sourceSectionId: sectionId,
      seats: copiedSeats,
      centerPoint,
    });

    // 重置粘贴计数
    pasteCountRef.current = 0;
  }, [calculateCenterPoint]);

  /**
   * 剪切座位
   */
  const cutSeats = useCallback((
    seats: Seat[],
    sectionId: string,
    onDelete: (seatIds: string[]) => void
  ) => {
    if (seats.length === 0) return;

    // 先复制
    copySeats(seats, sectionId);

    // 再删除原座位
    onDelete(seats.map(s => s.id));
  }, [copySeats]);

  /**
   * 粘贴座位
   */
  const pasteSeats = useCallback((targetSectionId: string): Seat[] | null => {
    if (!clipboard || clipboard.seats.length === 0) return null;

    pasteCountRef.current += 1;
    const offset = PASTE_OFFSET * pasteCountRef.current;

    // 创建新的座位数据，带偏移
    const pastedSeats: Seat[] = clipboard.seats.map(seat => ({
      ...seat,
      id: crypto.randomUUID(), // 生成新 ID
      sectionId: targetSectionId,
      x: seat.x + offset,
      y: seat.y + offset,
    }));

    return pastedSeats;
  }, [clipboard]);

  /**
   * 清空剪贴板
   */
  const clearClipboard = useCallback(() => {
    setClipboard(null);
    pasteCountRef.current = 0;
  }, []);

  return {
    clipboard,
    canPaste: clipboard !== null && clipboard.seats.length > 0,
    copySeats,
    cutSeats,
    pasteSeats,
    clearClipboard,
  };
}
