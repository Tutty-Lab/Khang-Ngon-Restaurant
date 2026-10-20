// ============================================================================
// Thu Vân Nguyễn kommt in den GESPEICHERTEN Stand – nicht nur in die
// Startbelegschaft. Der Betrieb hat seine Daten längst in Supabase; ohne diese
// Nachträge sähe er die neue Minijobberin im Nieu nie.
// ============================================================================

import { describe, expect, it } from "vitest";
import type { Employee, Schedule } from "../../types";
import { applyMigrations, MIGRATION_DEMO_SEED, MIGRATION_THU_VAN_NIEU, MIGRATION_VAN_SATURDAY_OFF, MIGRATION_HOURS_1130_1700, MIGRATION_HA_LY_NO_SURCHARGE } from "../migrations";
import { makeEmployee } from "../sampleData";
import { DEFAULT_WORK_HOURS } from "../workHours";

const stand = (employees: Schedule["employees"], migrations?: string[]): Schedule => ({
  companyName: "x",
  address: "y",
  year: 2026,
  month: 9,
  workHours: structuredClone(DEFAULT_WORK_HOURS),
  dateOverrides: [],
  employees,
  shifts: [],
  migrations,
});

describe("Thu Vân: Coco + Nieu", () => {
  it("verknüpft die vorhandene Person im Coco und begrenzt sie auf 5 Tage je Woche", () => {
    const out = applyMigrations("coco", stand([
      makeEmployee("coco-1", "Nguyen Thu Van", "VOLLZEIT", 173),
      makeEmployee("coco-2", "Nguyen Thi Minh Tam", "VOLLZEIT", 173),
    ]));
    expect(out.employees[0]).toMatchObject({ personKey: "nguyen-thu-van", maxDaysPerWeek: 5, targetMinutes: 173 * 60 });
    expect(out.employees[1].personKey).toBeUndefined();
    expect(out.migrations).toContain(MIGRATION_THU_VAN_NIEU);
  });

  it("lässt eine schon gesetzte Tagesgrenze im Coco stehen", () => {
    const out = applyMigrations("coco", stand([
      { ...makeEmployee("coco-1", "Nguyễn Thu Vân", "VOLLZEIT", 173), maxDaysPerWeek: 4 },
    ]));
    expect(out.employees[0]).toMatchObject({ personKey: "nguyen-thu-van", maxDaysPerWeek: 4 });
  });

  it("legt sie im Nieu als Minijob 43 h an – genau einmal", () => {
    const nieu = [makeEmployee("nieu-1", "Cong Danh Bui", "VOLLZEIT", 151.8)];
    const once = applyMigrations("nieu", stand(nieu));
    const thuVan = once.employees.filter((e) => e.personKey === "nguyen-thu-van");
    expect(thuVan).toHaveLength(1);
    expect(thuVan[0]).toMatchObject({ name: "Thu Van Nguyen", employmentType: "MINIJOB", targetMinutes: 43 * 60 });
    expect(applyMigrations("nieu", once)).toBe(once); // schon erledigt: nichts mehr ändern
  });

  it("legt sie NICHT erneut an, wenn der Betrieb sie nach dem Nachtrag gelöscht hat", () => {
    const out = applyMigrations("nieu", stand([], [MIGRATION_THU_VAN_NIEU]));
    expect(out.employees).toHaveLength(0);
  });

  it("verdoppelt sie nicht, wenn sie im Nieu schon von Hand angelegt wurde", () => {
    const out = applyMigrations("nieu", stand([makeEmployee("emp-1", "Thu Van Nguyen", "MINIJOB", 40)]));
    expect(out.employees).toHaveLength(1);
    expect(out.employees[0]).toMatchObject({ id: "emp-1", personKey: "nguyen-thu-van", targetMinutes: 40 * 60 });
  });

  it("weicht auf eine andere Id aus, wenn nieu-7 schon vergeben ist", () => {
    const out = applyMigrations("nieu", stand([makeEmployee("nieu-7", "Jemand Anders", "MINIJOB", 10)]));
    expect(out.employees.map((e) => e.id)).toEqual(["nieu-7", "nieu-thu-van"]);
  });

  it("ändert im Shin nichts an der Belegschaft", () => {
    const shin = [makeEmployee("shin-2", "Quoc Tu Tran", "VOLLZEIT", 173)];
    expect(applyMigrations("shin", stand(shin)).employees).toEqual(shin);
  });
});

describe("Demo: 10 nhân viên mẫu", () => {
  const empty = (employees: Employee[] = []): Schedule => ({
    companyName: "Demo Restaurant",
    address: "",
    year: 2026,
    month: 10,
    workHours: DEFAULT_WORK_HOURS,
    dateOverrides: [],
    employees,
    shifts: [],
    migrations: [],
  });

  it("điền 10 người khi quán demo chưa có ai", () => {
    const out = applyMigrations("demo", empty());
    expect(out.employees).toHaveLength(10);
    expect(out.employees.filter((e) => e.station === "KITCHEN")).toHaveLength(4);
    expect(out.migrations).toContain(MIGRATION_DEMO_SEED);
  });

  it("không đụng vào danh sách đã có người, và chỉ chạy một lần", () => {
    const own = [{ id: "x", name: "X", employmentType: "VOLLZEIT" as const, targetMinutes: 600 }];
    expect(applyMigrations("demo", empty(own)).employees).toEqual(own);
    const once = applyMigrations("demo", empty());
    const cleared = applyMigrations("demo", { ...once, employees: [] });
    expect(cleared.employees).toEqual([]);
  });
});

describe("Trần Thanh Vân: Betriebsleiterin Khang + Ngon, samstags frei, 18 €/h", () => {
  it("trägt den freien Samstag in beiden Läden nach, genau einmal", () => {
    for (const store of ["khang", "ngon"]) {
      const van = { ...makeEmployee(`${store}-van`, "Trần Thanh Vân", "TEILZEIT", 108), role: "Quản lý", personKey: "tran-thanh-van", monthlySalary: 1500, hourlyRate: 13.9 };
      const once = applyMigrations(store, stand([van]));
      expect(once.employees[0].availableWeekdays).toEqual(["monday", "tuesday", "wednesday", "thursday", "friday", "sunday"]);
      expect(once.employees[0].role).toBe("Quản lý (Betriebsleiter)");
      expect(once.employees[0].hourlyRate).toBe(18);
      expect(once.employees[0].longShifts).toBe(true);
      expect(once.employees[0].targetMinutes).toBe(5000); // 1.500 € ÷ 18 € = 83,3 h
      expect(once.migrations).toContain(MIGRATION_VAN_SATURDAY_OFF);
      // Danach wieder Samstag erlaubt → bleibt so (läuft nur einmal).
      const edited = { ...once, employees: [{ ...once.employees[0], availableWeekdays: undefined }] };
      expect(applyMigrations(store, edited).employees[0].availableWeekdays).toBeUndefined();
    }
  });
});

describe("Giờ làm 11:00 / 16:30 và Hà, Lý không Zuschlag", () => {
  it("verschiebt nur unveränderte Blöcke in Khang/Ngon", () => {
    const old = { ...stand([]), workHours: { ...structuredClone(DEFAULT_WORK_HOURS),
      perWeekday: { ...structuredClone(DEFAULT_WORK_HOURS).perWeekday,
        monday: [{ startMinutes: 720, endMinutes: 900 }, { startMinutes: 1050, endMinutes: 1320 }],
        tuesday: [{ startMinutes: 660, endMinutes: 900 }] },
      holiday: [{ startMinutes: 1050, endMinutes: 1320 }] } };
    const next = applyMigrations("khang", old);
    expect(next.workHours.perWeekday.monday).toEqual([{ startMinutes: 660, endMinutes: 900 }, { startMinutes: 990, endMinutes: 1320 }]);
    expect(next.workHours.perWeekday.tuesday).toEqual([{ startMinutes: 660, endMinutes: 900 }]);
    expect(next.workHours.holiday).toEqual([{ startMinutes: 990, endMinutes: 1320 }]);
    expect(next.migrations).toContain(MIGRATION_HOURS_1130_1700);
    expect(applyMigrations("demo", old).workHours).toEqual(old.workHours);
  });
  it("setzt Không Zuschlag nur für Hà (Khang) und Lý (Ngon)", () => {
    const ha = makeEmployee("k1", "Nguyễn Mạnh Hà", "TEILZEIT", 154);
    const other = makeEmployee("k2", "Vũ Văn Toàn", "VOLLZEIT", 176);
    const k = applyMigrations("khang", stand([ha, other]));
    expect(k.employees[0].noSurcharge).toBe(true);
    expect(k.employees[1].noSurcharge).toBeUndefined();
    expect(k.migrations).toContain(MIGRATION_HA_LY_NO_SURCHARGE);
    const n = applyMigrations("ngon", stand([makeEmployee("n1", "Phạm Văn Lý", "VOLLZEIT", 160)]));
    expect(n.employees[0].noSurcharge).toBe(true);
  });
});
