/**
 * ดาวจากฟอร์ม → 1–5 หรือ null (ไม่ให้ดาว) — pure ไว้ให้ test.mjs เรียก
 * ค่าที่เกินช่วง/ไม่ใช่ตัวเลข ต้องกลายเป็น null ไม่ใช่หลุดลง DB
 * แล้วไปทำให้หน้าเว็บ render ดาว 9,999 ดวง
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseRating(raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}
