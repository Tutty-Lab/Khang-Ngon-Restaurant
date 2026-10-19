import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { STORES, initialScheduleFor } from "../stores";
import { generateSchedule } from "../scheduler";
import { validateSchedule } from "../validation";
import { analyzeSchedule } from "../analyze";
import { publicHolidays } from "../holidays";
import { resolveDay } from "../workHours";
import { maxConsecutiveRun } from "../consecutive";
import { weekStartOf } from "../weeks";
import { allowsLongDays, EARLY_START_MINUTES } from "../longShifts";

describe("Real restaurant input: full year audit", () => {
  it("checks both stores together across all 2026 months", () => {
    const reports: unknown[] = [];
    for (let month = 1; month <= 12; month++) {
      const busy = new Map<string, Set<string>>();
      const personShifts = new Map<string, { date: string; start: number; end: number; paid: number; long: boolean }[]>();
      for (const config of STORES) {
        const s = { ...initialScheduleFor(config), month };
        const blockedDays = Object.fromEntries(s.employees.map(e => [e.id, [...(busy.get(e.personKey ?? e.id) ?? [])]]));
        const shifts = generateSchedule({ ...s, blockedDays, rules: config.staffingRules, weights: config.dayWeights, demandProfile: config.demandProfile, storeTag: config.id });
        const analysis = analyzeSchedule({ ...s, shifts, rules: config.staffingRules, weights: config.dayWeights });
        const openDates = analysis.days.filter(d => !d.closed).map(d => d.date);
        const validation = validateSchedule(s.employees, shifts, 2026, openDates, s.workHours);
        const hardErrors = validation.errors.filter(e => e.severity !== "warning");
        expect(hardErrors, `${config.id}/${month}`).toEqual([]);
        expect(analysis.peakViolations.map(d => d.date), `coverage ${config.id}/${month}`).toEqual([]);
        const averageHours = (busy: boolean) => {
          const days = analysis.days.filter(d => !d.closed && (config.dayWeights[d.weekday] > 1) === busy);
          return days.reduce((sum, d) => sum + d.paidHours, 0) / days.length;
        };
        expect(averageHours(true), `busy days ${config.id}/${month}`).toBeGreaterThan(averageHours(false) * 1.1);
        for (const summary of validation.summaries) expect(summary.assignedMinutes).toBeLessThanOrEqual(summary.targetMinutes);
        for (const shift of shifts) {
          const day = resolveDay(s.workHours, shift.date, publicHolidays(2026), {});
          expect(day.closed).toBe(false);
          const inBlock = (m: number) => day.blocks.some(b => m >= b.startMinutes && m <= b.endMinutes);
          if (allowsLongDays(s.employees.find(e => e.id === shift.employeeId)) && !day.blocks.some(b => shift.startMinutes >= b.startMinutes && shift.endMinutes <= b.endMinutes)) {
            // „Ca dài": Beginn ab 11:00, Ende in Öffnungszeit, Pause ganz in der Mittagsschließung.
            expect(shift.startMinutes >= EARLY_START_MINUTES && shift.startMinutes < day.blocks[0].endMinutes && inBlock(shift.endMinutes), `${shift.date} long`).toBe(true);
            const pause = shift.pauseStartMinutes ?? -1;
            expect(day.blocks.some((b, i) => day.blocks[i + 1] && pause >= b.endMinutes && pause + shift.pauseMinutes <= day.blocks[i + 1].startMinutes), `${shift.date} pause`).toBe(true);
          } else {
            expect(day.blocks.some(b => shift.startMinutes >= b.startMinutes && shift.endMinutes <= b.endMinutes)).toBe(true);
          }
          expect(shift.startMinutes % 30).toBe(0);
          expect(shift.endMinutes % 30).toBe(0);
        }
        for (const e of s.employees) {
          const own = shifts.filter(t => t.employeeId === e.id);
          const key = e.personKey ?? e.id;
          const dates = busy.get(key) ?? new Set<string>();
          for (const date of new Set(own.map(t => t.date))) expect(dates.has(date), `${key}/${date}`).toBe(false);
          for (const date of own.map(t => t.date)) dates.add(date);
          busy.set(key, dates);
          personShifts.set(key, [...(personShifts.get(key) ?? []), ...own.map(t => ({ date: t.date, start: t.startMinutes, end: t.endMinutes, paid: t.paidMinutes, long: allowsLongDays(e) }))]);
        }
        reports.push({ month, store: config.id, targetHours: s.employees.reduce((sum,e) => sum+e.targetMinutes,0)/60,
          assignedHours: analysis.totalPaidHours, warnings: validation.errors.filter(e => e.severity === "warning"),
          employees: validation.summaries.map(e => ({ name: e.employee.name, target: e.targetMinutes/60, assigned: e.assignedMinutes/60, difference: e.diffMinutes/60,
            days: new Set(shifts.filter(t => t.employeeId === e.employee.id).map(t => t.date)).size })),
          weekdayFit: analysis.weekdayFit });
      }
      for (const [person, shifts] of personShifts) {
        expect(maxConsecutiveRun(new Set(shifts.map(s => s.date))), `${person}/${month} consecutive`).toBeLessThanOrEqual(6);
        const daily = new Map<string, number>();
        const long = shifts.some(s => s.long);
        const weekly = new Map<string, Set<string>>();
        for (const s of shifts) {
          daily.set(s.date, (daily.get(s.date) ?? 0) + s.paid);
          const week = weekStartOf(s.date);
          weekly.set(week, (weekly.get(week) ?? new Set()).add(s.date));
        }
        for (const paid of daily.values()) expect(paid).toBeLessThanOrEqual(long ? 540 : 480);
        for (const days of weekly.values()) expect(days.size).toBeLessThanOrEqual(6);
      }
    }
    if (process.env.AUDIT_OUTPUT) writeFileSync(process.env.AUDIT_OUTPUT, JSON.stringify(reports, null, 2));
  }, 120000);
});
