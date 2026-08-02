/** เดือนของวันนี้ในรูปแบบ YYYY-MM @param {Date} [now] */
export function thisMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** รับเฉพาะ 'YYYY-MM' ที่เป็นเดือนจริง — query string เชื่อไม่ได้ @param {unknown} ym */
export function validMonth(ym) {
  const s = String(ym ?? '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return null;
  return s;
}

/**
 * ช่องปฏิทินของเดือน `ym` เริ่มวันอาทิตย์ — null คือช่องว่างหัว/ท้ายสัปดาห์
 * ความยาวหาร 7 ลงตัวเสมอ pure ไว้ให้ test.mjs เรียก
 * @param {string} ym 'YYYY-MM'
 * @returns {(string | null)[]} รายการวันที่ 'YYYY-MM-DD'
 */
export function monthGrid(ym) {
  const [y, m] = ym.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay(); // 0 = อาทิตย์
  const days = new Date(y, m, 0).getDate();    // วันที่ 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้

  /** @type {(string | null)[]} */
  const cells = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** @param {string} ym @param {number} delta */
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
