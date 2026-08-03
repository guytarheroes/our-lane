/**
 * ตัวอักษรบน avatar — ไม่มีชื่อก็เอาตัวแรกของอีเมล ไม่มีอะไรเลยก็ขีดกลาง
 * อยู่ที่เดียวเพราะทั้ง navbar และการ์ดในไทม์ไลน์ใช้ร่วมกัน
 * ถ้าแยกกันเขียนแล้ววันหนึ่งมีคนแก้ที่เดียว คนเดียวกันจะขึ้นคนละตัวอักษรใน 2 ที่
 * @param {{ name?: string | null, email?: string | null } | null | undefined} user
 */
export function initialOf(user) {
  return (user?.name?.trim() || user?.email || '—').trim().charAt(0).toUpperCase();
}

/** ชื่อที่เอาไว้อ่านให้คนฟัง — ไม่มีชื่อค่อยใช้อีเมล @param {typeof initialOf extends (u: infer U) => any ? U : never} user */
export function displayName(user) {
  return user?.name?.trim() || user?.email || '';
}
