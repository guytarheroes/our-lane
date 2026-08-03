/** ค่าตั้งต้นจาก palette /168 — ใช้เมื่อยังไม่เคยตั้งสีเอง หรือกดรีเซ็ต */
export const DEFAULT_ACCENT = /** @type {const} */ ({ light: '#852936', dark: '#b03a4c' });

/** พื้นหลังของแต่ละโหมด ใช้เป็นตัวเทียบ contrast */
/** ตัวอักษรบนพื้น accent (ทั้งสองโหมดใช้สีเดียวกัน) */
export const ON_ACCENT = '#faf7ea';

export const THEME_BG = /** @type {const} */ ({ light: '#faf7ea', dark: '#1a1114' });

/** WCAG AA: ตัวอักษรขนาดปกติ 4.5 · องค์ประกอบ UI ที่ไม่ใช่ตัวอักษร 3.0 */
export const MIN_TEXT = 4.5;
export const MIN_UI = 3;

/** `<input type="color">` ส่ง #rrggbb มาเสมอ แต่ form ปลอมได้ ต้องกรองก่อน @param {unknown} raw */
export function validHex(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}

/** @param {string} hex */
function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * อัตราส่วน contrast ตามสูตร WCAG (1–21)
 *
 * ค่านี้สมมาตร — เช็คครั้งเดียวได้สองเรื่องพร้อมกัน:
 * ตัวอักษรสี accent บนพื้นหลัง กับ ตัวอักษรสีพื้นหลังบนปุ่มสี accent
 * @param {string} a @param {string} b
 */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * สีนี้ใช้เป็นสีหลักของโหมดนี้ได้ไหม — เกณฑ์ต่างกันเพราะบทบาทต่างกัน
 *
 * โหมดสว่าง: accent เป็นทั้งพื้นปุ่มและสีตัวอักษรของลิงก์/หัวข้อ → ต้องผ่านเกณฑ์ตัวอักษร
 * โหมดมืด: accent เป็นพื้นปุ่มกับจุดเท่านั้น (ลิงก์ใช้ --accent-ink สีอ่อนแยกต่างหาก)
 *          → ต้องเห็นชัดบนพื้น (UI 3.0) และตัวอักษรบนปุ่มต้องอ่านออก (4.5 เทียบ on-accent)
 * @param {string} hex @param {'light' | 'dark'} mode
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function accentFits(hex, mode) {
  if (mode === 'light') {
    const c = contrast(hex, THEME_BG.light);
    return c >= MIN_TEXT
      ? { ok: true }
      : { ok: false, reason: `อ่อนเกินไป contrast กับพื้นครีมได้ ${c.toFixed(1)} ต้องได้อย่างน้อย ${MIN_TEXT}` };
  }

  const onBg = contrast(hex, THEME_BG.dark);
  if (onBg < MIN_UI) {
    return { ok: false, reason: `เข้มเกินไป แทบมองไม่เห็นบนพื้นมืด (${onBg.toFixed(1)} ต้องได้อย่างน้อย ${MIN_UI})` };
  }
  const onButton = contrast(hex, ON_ACCENT);
  if (onButton < MIN_TEXT) {
    return { ok: false, reason: `สว่างเกินไป ตัวหนังสือบนปุ่มจะอ่านไม่ออก (${onButton.toFixed(1)} ต้องได้อย่างน้อย ${MIN_TEXT})` };
  }
  return { ok: true };
}
