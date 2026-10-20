// ============================================================================
// Einmalige Datenänderungen am GESPEICHERTEN Stand (LocalStorage und Supabase).
//
// Die Startbelegschaft in sampleData.ts greift nur beim allerersten Öffnen.
// Kommt später jemand dazu, muss das hier nachgetragen werden – sonst sieht der
// Betrieb die Person nie. Jede Änderung läuft genau EINMAL je Filiale (Merker in
// schedule.migrations); löscht der Betrieb die Person danach wieder, wird sie
// nicht erneut angelegt.
// ============================================================================

import type { Employee, Schedule } from "../types";
import { demoEmployees, makeEmployee } from "./sampleData";
import { salaryToMinutes } from "./payroll";
import type { DayBlocks } from "./workHours";
import { EVENING_BLOCK, LUNCH_BLOCK } from "./stores";
import { NO_SURCHARGE } from "./restaurantData";

/** Thu Vân Nguyễn: Vollzeit im Coco, ab September 2026 zusätzlich Minijob 43 h im Nieu. */
export const MIGRATION_THU_VAN_NIEU = "2026-10-thu-van-nieu";
const THU_VAN_KEY = "nguyen-thu-van";

/** Name ohne Akzente, Reihenfolge egal: „Nguyễn Thu Vân" = „Thu Van Nguyen". */
function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

const isThuVan = (employee: Employee) =>
  employee.personKey === THU_VAN_KEY || nameKey(employee.name) === nameKey("Nguyen Thu Van");

function thuVanNieu(storeId: string, employees: Employee[]): Employee[] {
  if (storeId === "coco") {
    // Vorhandene Person im Coco verknüpfen und auf 5 Tage je Woche begrenzen,
    // damit im Nieu Tage frei bleiben (wie Bá Việt im Shin).
    return employees.map((employee) =>
      isThuVan(employee)
        ? { ...employee, personKey: THU_VAN_KEY, maxDaysPerWeek: employee.maxDaysPerWeek ?? 5 }
        : employee,
    );
  }
  if (storeId === "nieu") {
    if (employees.some(isThuVan)) {
      return employees.map((employee) => (isThuVan(employee) ? { ...employee, personKey: THU_VAN_KEY } : employee));
    }
    const id = employees.some((employee) => employee.id === "nieu-7") ? "nieu-thu-van" : "nieu-7";
    return [...employees, { ...makeEmployee(id, "Thu Van Nguyen", "MINIJOB", 43), personKey: THU_VAN_KEY }];
  }
  return employees;
}

/**
 * Kunden-Demo: die Zeile „demo" existiert schon (leer angelegt, bevor es
 * Beispieldaten gab) – sampleEmployees greift dort nie mehr. Ist die Liste noch
 * LEER, die 10 Demo-Personen einsetzen. Hat jemand schon Leute angelegt, bleibt
 * alles unverändert.
 */
export const MIGRATION_DEMO_SEED = "2026-10-demo-seed-10";

/**
 * Trần Thanh Vân ist Betriebsleiterin von Khang UND Ngon, hat samstags immer
 * frei, bekommt 18 €/h (1.500 € je Laden → 83,3 h statt 107,9 h bei 13,90 €) und
 * darf notfalls 9-h-Tage durch die Mittagsschließung machen.
 * Bereits gespeicherte Stände bekommen freien Samstag, Stundenlohn, Soll und
 * Rollenbezeichnung nachgetragen; andere Wochentagssperren bleiben erhalten.
 */
export const MIGRATION_VAN_SATURDAY_OFF = "2026-10-van-betriebsleiter-sat-off";
const VAN_KEY = "tran-thanh-van";
const VAN_RATE = 18;

function vanSaturdayOff(storeId: string, employees: Employee[]): Employee[] {
  if (storeId !== "khang" && storeId !== "ngon") return employees;
  const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
  return employees.map((employee) => {
    if (employee.personKey !== VAN_KEY && nameKey(employee.name) !== nameKey("Tran Thanh Van")) return employee;
    const days = employee.availableWeekdays?.length ? employee.availableWeekdays : [...allDays];
    return {
      ...employee,
      personKey: VAN_KEY,
      role: employee.role === "Quản lý" || !employee.role ? "Quản lý (Betriebsleiter)" : employee.role,
      availableWeekdays: days.filter((day) => day !== "saturday"),
      hourlyRate: VAN_RATE,
      longShifts: true,
      ...(employee.monthlySalary != null ? { targetMinutes: salaryToMinutes(employee.monthlySalary, VAN_RATE) } : {}),
    };
  });
}

/**
 * Arbeitszeiten beider Läden neu (Chủ quán 10/2026): Gäste 11:30 / 17:00,
 * Arbeit 30 min früher zum Vorbereiten → 11:00–15:00 und 16:30–22:00 statt
 * 12:00–15:00 / 17:30–22:00. Nur Blöcke, die noch genau
 * auf den alten Werten stehen, werden verschoben – selbst geänderte bleiben.
 */
export const MIGRATION_HOURS_1130_1700 = "2026-10-hours-1100-1630";
function shiftOpening(storeId: string, workHours: Schedule["workHours"]): Schedule["workHours"] {
  if (storeId !== "khang" && storeId !== "ngon") return workHours;
  const move = (blocks: DayBlocks): DayBlocks => blocks.map((block) =>
    block.startMinutes === 720 && block.endMinutes === 900 ? { ...LUNCH_BLOCK }
      : block.startMinutes === 1050 && block.endMinutes === 1320 ? { ...EVENING_BLOCK }
        : block);
  return {
    ...workHours,
    perWeekday: Object.fromEntries(
      Object.entries(workHours.perWeekday).map(([day, blocks]) => [day, move(blocks)]),
    ) as Schedule["workHours"]["perWeekday"],
    holiday: move(workHours.holiday),
  };
}

/** Hà (Khang) und Lý (Ngon): „Không Zuschlag" (kein CN/Feiertag, Ende 20:00). */
export const MIGRATION_HA_LY_NO_SURCHARGE = "2026-10-ha-ly-no-surcharge";
function haLyNoSurcharge(storeId: string, employees: Employee[]): Employee[] {
  const who = storeId === "khang" ? "Nguyen Manh Ha" : storeId === "ngon" ? "Pham Van Ly" : null;
  if (!who) return employees;
  return employees.map((employee) => nameKey(employee.name) === nameKey(who)
    ? { ...employee, ...NO_SURCHARGE }
    : employee);
}

/** Wendet alle noch offenen Änderungen auf den Stand einer Filiale an. */
export function applyMigrations(storeId: string, schedule: Schedule): Schedule {
  let next = schedule;
  const done = () => next.migrations ?? [];
  if (!done().includes(MIGRATION_THU_VAN_NIEU)) {
    next = { ...next, employees: thuVanNieu(storeId, next.employees), migrations: [...done(), MIGRATION_THU_VAN_NIEU] };
  }
  if (!done().includes(MIGRATION_DEMO_SEED)) {
    const seed = storeId === "demo" && next.employees.length === 0;
    next = { ...next, employees: seed ? demoEmployees() : next.employees, migrations: [...done(), MIGRATION_DEMO_SEED] };
  }
  if (!done().includes(MIGRATION_HOURS_1130_1700)) {
    next = { ...next, workHours: shiftOpening(storeId, next.workHours), migrations: [...done(), MIGRATION_HOURS_1130_1700] };
  }
  if (!done().includes(MIGRATION_HA_LY_NO_SURCHARGE)) {
    next = { ...next, employees: haLyNoSurcharge(storeId, next.employees), migrations: [...done(), MIGRATION_HA_LY_NO_SURCHARGE] };
  }
  if (!done().includes(MIGRATION_VAN_SATURDAY_OFF)) {
    next = { ...next, employees: vanSaturdayOff(storeId, next.employees), migrations: [...done(), MIGRATION_VAN_SATURDAY_OFF] };
  }
  return next;
}
