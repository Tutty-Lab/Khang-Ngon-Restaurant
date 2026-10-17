import { describe, it, expect } from "vitest";
import { STORES, initialScheduleFor } from "../stores";
import { publicHolidays } from "../holidays";
import { resolveDay } from "../workHours";
import { salaryToMinutes } from "../payroll";
import { generateSchedule } from "../scheduler";

describe("Khang / Ngon", () => {
  it("converts salary without rounding to whole hours", () => {
    expect(salaryToMinutes(2500, 15)).toBe(10000);
    expect(salaryToMinutes(3000, 13.9)).toBe(12950);
    for (const [amount, rate] of [[-1, 15], [100, 0], [100, -1], [Infinity, 15], [100, NaN]])
      expect(() => salaryToMinutes(amount, rate)).toThrow();
  });
  it("has 15 unique people, separate records and one shared manager", () => {
    expect(STORES.map(s => s.id)).toEqual(["khang", "ngon"]);
    const employees = STORES.flatMap(s => initialScheduleFor(s).employees);
    expect(new Set(employees.map(e => e.personKey ?? e.id)).size).toBe(15);
    expect(employees.filter(e => e.personKey).reduce((sum, e) => sum + (e.monthlySalary ?? 0), 0)).toBe(3000);
  });
  it("resolves weekends and Munich holidays", () => {
    const [k, n] = STORES.map(initialScheduleFor);
    const h = publicHolidays(2026);
    expect(h.has("2026-08-15")).toBe(true);
    expect(resolveDay(k.workHours, "2026-09-05", h, {}).blocks).toEqual([{ startMinutes: 1050, endMinutes: 1320 }]);
    expect(resolveDay(n.workHours, "2026-09-05", h, {}).closed).toBe(true);
    expect(resolveDay(k.workHours, "2026-09-06", h, {}).blocks).toHaveLength(1);
    expect(resolveDay(n.workHours, "2026-09-06", h, {}).blocks).toHaveLength(2);
    expect(resolveDay(n.workHours, "2026-12-25", h, {}).blocks).toEqual([{ startMinutes: 1050, endMinutes: 1320 }]);
    expect(resolveDay(n.workHours, "2026-10-03", h, {}).closed).toBe(true);
  });
  it("generates within opening blocks, keeps shared manager off overlapping days", () => {
    const busy: string[] = [];
    for (const store of STORES) {
      const schedule = initialScheduleFor(store);
      const manager = schedule.employees.find(e => e.personKey)!;
      const shifts = generateSchedule({ ...schedule, rules: store.staffingRules, weights: store.dayWeights,
        storeTag: store.id, blockedDays: { [manager.id]: [...busy] } });
      for (const shift of shifts) {
        const day = resolveDay(schedule.workHours, shift.date, publicHolidays(2026), {});
        expect(day.closed).toBe(false);
        expect(day.blocks.some(b => shift.startMinutes >= b.startMinutes && shift.endMinutes <= b.endMinutes)).toBe(true);
        if (shift.employeeId === manager.id) expect(busy).not.toContain(shift.date);
      }
      busy.push(...shifts.filter(s => s.employeeId === manager.id).map(s => s.date));
    }
  });
});
