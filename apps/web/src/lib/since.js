/**
 * ระยะเวลาแบบปฏิทินจาก `iso` ถึง `now` — ปี/เดือน/วัน
 * @param {string} iso YYYY-MM-DD
 * @param {Date} [now]
 */
export function since(iso, now = new Date()) {
  const from = new Date(`${iso}T00:00:00`);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // เดินถอยจนวันครบรอบเดือนที่ n ไม่เลย end — กัน JS Date ที่ม้วน "31 ก.พ." ไปเป็น 2 มี.ค.
  // แล้วทำให้จำนวนวันติดลบ
  let months =
    (end.getFullYear() - from.getFullYear()) * 12 + (end.getMonth() - from.getMonth()) + 1;
  let start;
  do {
    months -= 1;
    start = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  } while (start > end && months > 0);

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: Math.round((end.getTime() - start.getTime()) / 86400000),
  };
}

/** "3 ปี 6 เดือน 14 วัน" — หน่วยที่เป็นศูนย์ถูกตัดทิ้ง @param {string} iso @param {Date} [now] */
export function sinceThai(iso, now = new Date()) {
  const { years, months, days } = since(iso, now);
  const parts = [];
  if (years) parts.push(`${years} ปี`);
  if (months) parts.push(`${months} เดือน`);
  if (days || parts.length === 0) parts.push(`${days} วัน`);
  return parts.join(' ');
}
