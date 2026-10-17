import type { StoreConfig } from "../lib/stores";
import { minutesToTime } from "../lib/time";
import { WEEKDAY_LABELS_VI, type WeekdayKey } from "../lib/demand";
export function DocsTab({ stores }: { stores: StoreConfig[] }) {
  return <div className="space-y-4">
    {stores.map(store => <section key={store.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h2 className="font-semibold">{store.name}</h2><p>{store.address}</p><p className="text-sm">{store.notes}</p>
      <ul className="text-sm space-y-2">{(Object.keys(store.workHours!.perWeekday) as WeekdayKey[]).map(day =>
        <li key={day}>{WEEKDAY_LABELS_VI[day]}: {store.workHours!.closedWeekdays[day] ? "Nghỉ" : store.workHours!.perWeekday[day].map(b => `${minutesToTime(b.startMinutes)}–${minutesToTime(b.endMinutes)}`).join(" / ")}</li>)}</ul>
      <p className="text-sm">Ngày lễ: 17:30–22:00; Ngon nghỉ cả thứ 7 kể cả trùng lễ. Ngày lễ theo München, Bayern, gồm Mariä Himmelfahrt (15/8).</p>
    </section>)}
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-2">
      <h2 className="font-semibold">Lương và giờ tham khảo</h2>
      <p>Lương tháng ÷ lương giờ = giờ mục tiêu. Mặc định 13,90 €/h. 2.500 € ÷ 15 €/h = 166,67 giờ, lưu 10.000 phút. Không thay thế chấm công thực tế.</p>
      <p>Dữ liệu gốc: 09/2026, 15 người. Hình thức hợp đồng tạm suy từ giờ, cần kiểm tra theo hợp đồng thực tế.</p>
      <p>Chia lương Trần Thanh Vân 1.500 €/quán, tổng 3.000 €. Liên kết cùng người để tránh trùng ngày. Phạm Quốc Trung thuộc Ngon sau chuyển từ Khang, 166 giờ tổng.</p>
      <p>Chưa có định mức số người mỗi ca: chỉ yêu cầu tối thiểu 1 người trong giờ mở cửa. Kiểm tra cảnh báo thiếu giờ khi tạo lịch; giờ tham khảo có thể vượt sức chứa lịch.</p>
    </section>
  </div>;
}
