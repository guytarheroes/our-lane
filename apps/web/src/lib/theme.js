export const THEME_COOKIE = 'theme';

/**
 * palette /168 มี 4 สี แต่วัด contrast แล้วมีแค่ 3 คู่ที่อ่านออก และทุกคู่ต้องมี Cherry Red
 * (ครีม/ฟ้า/ชมพู ตัดกันเองได้แค่ 1.3–1.8) ธีมจึงเหลือแค่สลับว่าเชอร์รี่เป็นพื้นหรือเป็นหมึก
 * normal = พื้นครีม หมึกเชอร์รี่ · invert = พื้นเชอร์รี่ หมึกครีม
 */
export const THEMES = /** @type {const} */ (['normal', 'invert']);

export const THEME_COOKIE_OPTIONS = /** @type {const} */ ({
  httpOnly: true, // ฝั่ง server เป็นคนอ่านคนเดียว ไม่มี JS ฝั่ง client แตะเลย
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
});

/** @param {unknown} raw @returns {'normal' | 'invert'} */
export function validTheme(raw) {
  const v = String(raw ?? '');
  return THEMES.includes(/** @type {any} */ (v)) ? /** @type {any} */ (v) : 'normal';
}

/**
 * เครื่องที่เปิดอยู่เป็นมือถือไหม — ใช้เลือกไอคอนของตัวเลือก "ตามเครื่อง"
 * ให้ตรงกับของจริง (มือถือโชว์รูปมือถือ คอมโชว์รูปจอ)
 * เช็คจาก User-Agent เพราะอ่านได้ตั้งแต่ฝั่ง server ไม่ต้องรอ JS
 * ไม่แม่น 100% (iPad รุ่นใหม่รายงานตัวเป็น Macintosh) แต่ผิดแค่ไอคอน ไม่กระทบการทำงาน
 * @param {string | null | undefined} ua
 */
export function isMobileUA(ua) {
  return /Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(String(ua ?? ''));
}
