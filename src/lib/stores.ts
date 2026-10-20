// Khang and Ngon: separate state and opening hours, shared application.

import type { Employee, Schedule } from "../types";
import { type WeekdayKey } from "./demand";
import { type DemandBand, type StaffingRule } from "./staffing";
import { DEFAULT_WORK_HOURS } from "./workHours";
import { khangEmployees, ngonEmployees } from "./restaurantData";
import { clip } from "./staffing";
import type { WorkHoursConfig } from "./workHours";

export type StoreConfig = {
  /** Schlüssel der Zeile in store_data – nach dem Anlegen NICHT mehr ändern. */
  id: string;
  name: string;
  /** Kurzname für den Umschalter in der Kopfzeile. */
  shortName: string;
  address: string;
  /** Belegschaft beim allerersten Öffnen. */
  sampleEmployees: () => Employee[];
  workHours?: WorkHoursConfig;
  notes?: string;
  demandProfile?: readonly DemandBand[];
  /** Welche Wochentage stark sind (Umsatz) – steuert die Stundenverteilung. */
  dayWeights: Record<WeekdayKey, number>;
  /** Wie viele Leute wann im Haus sein sollen. */
  staffingRules: readonly StaffingRule[];
};

// Chủ quán (10/2026): khách 11:30–15:00 và 17:00–22:00, 15:00–16:30 nghỉ thật.
// Giờ LÀM bắt đầu sớm 30 phút (11:00 / 16:30) để Vorbereitung; luật nhóm
// „ít nhất 1 Bếp + 1 Phục vụ" giữ 2 người trông quán ngay từ lúc đó.
export const LUNCH_BLOCK = { startMinutes: 660, endMinutes: 900 };
export const EVENING_BLOCK = { startMinutes: 990, endMinutes: 1320 };
const lunch = LUNCH_BLOCK;
const evening = EVENING_BLOCK;
function hours(ngon: boolean): WorkHoursConfig {
  return {
    perWeekday: { monday: [lunch, evening], tuesday: [lunch, evening], wednesday: [lunch, evening],
      thursday: [lunch, evening], friday: [lunch, evening], saturday: ngon ? [] : [evening],
      sunday: ngon ? [lunch, evening] : [evening] },
    holiday: [evening],
    closedWeekdays: { monday: false, tuesday: false, wednesday: false, thursday: false,
      friday: false, saturday: ngon, sunday: false },
  };
}
// Staffing counts were not supplied: retain only a minimum presence requirement.
const rules: readonly StaffingRule[] = [
  { label: "Trong giờ mở cửa", when: "suốt mỗi khung mở", minStaff: 1, maxStaff: Infinity,
    scaled: false, windows: blocks => blocks },
  { label: "Cao điểm trưa", when: "13:00–15:00", minStaff: 1, maxStaff: Infinity,
    scaled: false, windows: clip(780, 900) },
  { label: "Cao điểm tối", when: "18:00–21:00", minStaff: 1, maxStaff: Infinity,
    scaled: false, windows: clip(1080, 1260) },
];
// Khang (chủ quán, 10/2026): ít nhất 1 Phục vụ suốt giờ mở, 1 Bếp tới 22:00,
// Chủ nhật (chủ yếu giao hàng / mang về) phải có người lái xe giờ đông tối.
const isKitchen = (e: Employee) => e.station === "KITCHEN";
const isDriver = (e: Employee) => /xe/i.test(e.role ?? "");
// Beide Läden: immer mindestens 1 Phục vụ und 1 Bếp im Haus.
const groupRules: readonly StaffingRule[] = [
  ...rules,
  { label: "Phục vụ", when: "suốt mỗi khung mở", minStaff: 1, maxStaff: Infinity,
    scaled: false, who: (e) => !isKitchen(e), windows: blocks => blocks },
  { label: "Bếp", when: "suốt mỗi khung mở, tới 22:00", minStaff: 1, maxStaff: Infinity,
    scaled: false, who: isKitchen, windows: blocks => blocks },
];
const khangRules: readonly StaffingRule[] = [
  ...groupRules,
  { label: "Lái xe CN", when: "18:00–21:00 Chủ nhật", minStaff: 1, maxStaff: Infinity,
    scaled: false, weekdays: ["sunday"], onHolidays: false, who: isDriver, windows: clip(1080, 1260) },
];
export const STORES: StoreConfig[] = [
  { id: "khang", name: "Khang Restaurant", shortName: "Khang",
    address: "Einsteinstraße 179, 81677 München", sampleEmployees: khangEmployees,
    workHours: hours(false), staffingRules: khangRules,
    dayWeights: { monday: 1, tuesday: 1.5, wednesday: 1.5, thursday: 1.5, friday: 1, saturday: 1, sunday: 1 },
    notes: "Đông thứ 3/4/5. Chủ nhật chủ yếu giao hàng, mang về. Nghỉ trưa thứ 7, chủ nhật, ngày lễ. Khách 11:30–15:00 / 17:00–22:00; làm từ 11:00 / 16:30 (chuẩn bị); pause 15:00–16:30." },
  { id: "ngon", name: "Ngon Soulfood", shortName: "Ngon",
    address: "Ostpreußenstraße 35, 81827 München", sampleEmployees: ngonEmployees,
    workHours: hours(true), staffingRules: groupRules,
    demandProfile: [
      { startMinutes: 660, endMinutes: 690, level: 0.5, label: "Chuẩn bị" },
      { startMinutes: 690, endMinutes: 780, level: 1, label: "Mở cửa" },
      { startMinutes: 780, endMinutes: 900, level: 1.5, label: "Cao điểm trưa" },
      { startMinutes: 990, endMinutes: 1020, level: 0.5, label: "Chuẩn bị" },
      { startMinutes: 1020, endMinutes: 1080, level: 1, label: "Mở ca tối" },
      { startMinutes: 1080, endMinutes: 1260, level: 1.5, label: "Cao điểm tối" },
      { startMinutes: 1260, endMinutes: 1320, level: 0.8, label: "Cuối ca" },
    ],
    dayWeights: { monday: 1, tuesday: 1, wednesday: 1, thursday: 1.5, friday: 1.8, saturday: 0, sunday: 1.8 },
    notes: "Đông thứ 5/6/CN; doanh thu cao nhất thứ 6/CN. Cao điểm 13:00–15:00, 18:00–21:00. Nghỉ thứ 7, trưa lễ. Khách 11:30–15:00 / 17:00–22:00; làm từ 11:00 / 16:30 (chuẩn bị); pause 15:00–16:30." },
];

export const DEFAULT_STORE_ID = STORES[0].id;

/** Merkt sich die zuletzt gewählte Filiale auf diesem Gerät. */
const STORE_KEY = "khang-ngon-app:store";

export function loadStoreId(): string {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && STORES.some((s) => s.id === saved)) return saved;
  } catch {
    /* ignorieren */
  }
  return DEFAULT_STORE_ID;
}

export function saveStoreId(id: string): void {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    /* ignorieren */
  }
}

export function storeById(id: string): StoreConfig {
  return STORES.find((s) => s.id === id) ?? STORES[0];
}

/**
 * Ältere Stände (gespeichert, bevor Nieu 37 dazukam) kennen noch keinen
 * personKey. Dann erkennt „Tạo lịch làm việc" nicht, dass Bá Việt Nguyen im
 * Shin und im Nieu derselbe Mensch ist, und plant ihn am selben Tag in beiden
 * Läden. Fehlt der personKey, übernimmt ein Mitarbeiter mit derselben id und
 * demselben Namen wie in der Startbelegschaft personKey und – nur in diesem
 * einen Schritt – auch maxDaysPerWeek. Danach steht der personKey im Stand, und
 * ein später geleertes „tối đa … ngày/tuần" bleibt leer. Löst man die
 * Verbindung im Tab Nhân viên, steht dort "" statt nichts.
 */
export function withSharedPersonDefaults(employees: Employee[], store: StoreConfig): Employee[] {
  const starters = new Map(store.sampleEmployees().map((e) => [e.id, e]));
  return employees.map((employee) => {
    const starter = starters.get(employee.id);
    // "" = im Tab Nhân viên bewusst gelöst – dann nicht wieder verbinden.
    if (employee.personKey !== undefined || !starter?.personKey || starter.name !== employee.name) return employee;
    return {
      ...employee,
      personKey: starter.personKey,
      maxDaysPerWeek: employee.maxDaysPerWeek ?? starter.maxDaysPerWeek,
    };
  });
}

/** Startstand einer Filiale: September 2026 mit der Belegschaft aus der Angabe. */
export function initialScheduleFor(store: StoreConfig): Schedule {
  return {
    companyName: store.name,
    address: store.address,
    year: 2026,
    month: 9,
    workHours: structuredClone(store.workHours ?? DEFAULT_WORK_HOURS),
    dateOverrides: [],
    employees: store.sampleEmployees(),
    shifts: [],
  };
}
