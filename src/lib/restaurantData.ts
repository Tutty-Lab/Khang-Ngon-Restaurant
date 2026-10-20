import type { Employee } from "../types";
import { makeEmployee } from "./sampleData";
import { DEFAULT_HOURLY_RATE, salaryToMinutes } from "./payroll";

function staff(id: string, name: string, hours: number, role: string, days?: number): Employee {
  return { ...makeEmployee(id, name, hours <= 45 ? "MINIJOB" : hours >= 150 ? "VOLLZEIT" : "TEILZEIT", hours),
    station: /Bếp|bếp|Sushi/.test(role) ? "KITCHEN" : "SERVICE", role, referenceDays: days,
    hourlyRate: DEFAULT_HOURLY_RATE };
}
function salary(id: string, name: string, amount: number, rate: number, role: string): Employee {
  return { ...staff(id, name, amount / rate, role), monthlySalary: amount, hourlyRate: rate,
    targetMinutes: salaryToMinutes(amount, rate), referenceEstimated: true };
}
/** Betriebsleiterin beider Läden (18 €/h): je Laden höchstens 3 Tage, samstags immer frei, notfalls Tage bis 9 h. */
const VAN = {
  personKey: "tran-thanh-van",
  maxDaysPerWeek: 3,
  longShifts: true,
  availableWeekdays: ["monday", "tuesday", "wednesday", "thursday", "friday", "sunday"],
} satisfies Partial<Employee>;
/** Hà (Khang) und Lý (Ngon): „chỉ làm đến 20h, không Zuschlag" – kein Sonntag, kein Feiertag, Ende 20:00. */
export const NO_SURCHARGE = { noSurcharge: true } satisfies Partial<Employee>;
export function khangEmployees(): Employee[] {
  return [
    staff("khang-khanh", "Phạm H. N. Khanh", 42, "Phục vụ", 14),
    staff("khang-son", "Trịnh Hoàng Sơn", 106, "Xe/Phụ bếp", 22),
    staff("khang-chat", "Phạm Văn Chất", 172, "Sushi/Bar", 28),
    { ...staff("khang-ha", "Nguyễn Mạnh Hà", 154, "Phục vụ", 22), ...NO_SURCHARGE },
    staff("khang-toan", "Vũ Văn Toàn", 176, "Bếp", 25),
    { ...salary("khang-van", "Trần Thanh Vân", 1500, 18, "Quản lý (Betriebsleiter)"), ...VAN },
    salary("khang-hoa", "Nguyễn Hữu Hòa", 1500, 13.9, "Phụ bếp"),
    salary("khang-duong-khanh", "Dương Thị Khánh", 603, 13.9, "Phục vụ"),
  ];
}
export function ngonEmployees(): Employee[] {
  return [
    staff("ngon-tung", "Nguyễn Đức Tùng", 102, "Bếp", 17),
    staff("ngon-lang", "Nguyễn Thị Lang", 102, "Bếp", 17),
    staff("ngon-truong", "Hồ Thái D. Trường", 114, "Sushi", 19),
    { ...staff("ngon-ly", "Phạm Văn Lý", 160, "Bếp", 20), ...NO_SURCHARGE },
    staff("ngon-trung", "Phạm Quốc Trung", 166, "Bếp (K → N)", 26),
    { ...staff("ngon-anh", "Đặng Việt Anh", 110, "Phục vụ", 22), referenceEstimated: true },
    { ...salary("ngon-van", "Trần Thanh Vân", 1500, 18, "Quản lý (Betriebsleiter)"), ...VAN },
    salary("ngon-duy", "Nguyễn Đức Duy", 2500, 15, "Bar"),
  ];
}
