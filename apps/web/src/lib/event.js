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

/**
 * "★★★☆☆" — กรองผ่าน parseRating ก่อนเสมอ
 * ถ้าเชื่อค่าใน DB ตรง ๆ แล้วเจอ rating = 6 จะได้ '☆'.repeat(-1) ซึ่ง throw RangeError
 * แล้วหน้าไทม์ไลน์ทั้งหน้าจะ 500 เพราะข้อมูลแถวเดียว
 * @param {unknown} raw
 */
export function starsText(raw) {
  const n = parseRating(raw);
  return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';
}
