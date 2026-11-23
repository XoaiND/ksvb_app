import type { SignSlot } from '../../../shared/api/types';

/** 1 mm theo point (đơn vị toạ độ ô ký). */
export const PT_PER_MM = 72 / 25.4;

/** Ô ký theo từng tệp cần ký (khoá = id tệp đính kèm). */
export type SlotMap = Record<number, SignSlot[]>;

export interface SlotCheck {
  ok: boolean;
  /** Số thứ tự người ký chưa có ô. */
  missing: number[];
  /** Số ô lớn hơn số người ký. */
  extra: number[];
}

/** Cùng luật với backend (SignSlot.requireMatch): mỗi người ký 1..n có ≥1 ô, không có ô số > n. */
export function checkSlots(map: SlotMap, signerCount: number): SlotCheck {
  const orders = new Set(Object.values(map).flatMap((l) => l.map((s) => s.orderNo)));
  const missing: number[] = [];
  for (let k = 1; k <= signerCount; k++) if (!orders.has(k)) missing.push(k);
  const extra = [...orders].filter((k) => k > signerCount).sort((a, b) => a - b);
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

export function slotMessage(c: SlotCheck, signerCount: number): string {
  const parts: string[] = [];
  if (c.missing.length) parts.push(`Thiếu ô cho người ký số ${c.missing.join(', ')}.`);
  if (c.extra.length) parts.push(`Có ô số ${c.extra.join(', ')} nhưng văn bản chỉ có ${signerCount} người ký.`);
  return parts.join(' ');
}
