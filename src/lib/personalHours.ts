// ============================================================================
// „Không Zuschlag" (Employee.noSurcharge): kein Sonntag, kein Feiertag,
// Dienstende spätestens 20:00. An EINER Stelle, damit Planung, Prüfung und
// Tests dieselben Grenzen ziehen.
// ============================================================================

import type { Employee } from "../types";
import type { DayBlocks } from "./workHours";
import { parseIsoDate, weekdayKeyOf } from "./demand";

/** Ab 20:00 fällt Nachtzuschlag an – „Không Zuschlag" endet spätestens dann. */
export const NO_SURCHARGE_END = 20 * 60;

/** Darf die Person an diesem Datum überhaupt? (Zuschlag: kein Sonntag, kein Feiertag) */
export function surchargeFree(employee: Employee, isoDate: string, holidays: Set<string>): boolean {
  if (!employee.noSurcharge) return true;
  return weekdayKeyOf(parseIsoDate(isoDate)) !== "sunday" && !holidays.has(isoDate);
}

/** Die Blöcke, in denen DIESE Person arbeiten darf: mit „Không Zuschlag" endet jeder spätestens 20:00. */
export function personalBlocks(employee: Employee, blocks: DayBlocks): DayBlocks {
  if (!employee.noSurcharge) return blocks;
  return blocks
    .map((block) => ({ ...block, endMinutes: Math.min(block.endMinutes, NO_SURCHARGE_END) }))
    .filter((block) => block.endMinutes > block.startMinutes);
}

/**
 * „Thiếu giờ thì đến sớm" (Chủ quán 10/2026): reicht die normale Arbeitszeit
 * nicht für das Soll, darf ein Dienst früher beginnen – mittags ab 10:00
 * (zuerst 10:30), abends ab 16:00. Nur dann, nie als Normalfall.
 */
export const EARLY_LUNCH_START = 10 * 60;
export const EARLY_EVENING_START = 16 * 60;

/** Frühester Beginn in diesem Block, wenn Stunden fehlen. */
export function earliestStartIn(block: { startMinutes: number }): number {
  const early = block.startMinutes < 14 * 60 ? EARLY_LUNCH_START : EARLY_EVENING_START;
  return Math.min(block.startMinutes, early);
}
