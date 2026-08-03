import { db } from './db.js';
import { DEFAULT_ACCENT, validHex } from './color.js';

const read = db.prepare('SELECT value FROM setting WHERE key = ?');
const write = db.prepare(
  'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
);

/** @param {string} key @param {string} fallback */
export function getSetting(key, fallback) {
  return read.get(key)?.value ?? fallback;
}

/** @param {string} key @param {string} value */
export function setSetting(key, value) {
  write.run(key, value);
}

/**
 * ค่าที่หน้าเว็บใช้ ลำดับ: DB → env → ค่าตั้งต้น
 *
 * **gotcha:** พอกดบันทึกในหน้า /settings ครั้งแรก แถวใน DB จะชนะตลอดไป
 * ใครไปแก้ `.env` บน Pi ทีหลังแล้วงงว่าทำไมหน้าเว็บไม่เปลี่ยน — สาเหตุอยู่ตรงนี้
 * ถ้าอยากกลับไปใช้ค่าจาก env ต้อง `DELETE FROM setting WHERE key = ...`
 */
export function siteSettings() {
  return {
    coupleName: getSetting(
      'couple_name',
      process.env.COUPLE_NAME || 'ทางเดินความทรงจำของเราสองคน',
    ),
    startDate: getSetting('start_date', process.env.START_DATE || '2023-01-11'),
  };
}

const drop = db.prepare('DELETE FROM setting WHERE key = ?');

/** @param {string} key */
export function clearSetting(key) {
  drop.run(key);
}

/**
 * สีหลักที่ผู้ใช้ตั้งเอง — คืน null ถ้ายังไม่เคยตั้ง เพื่อให้ Base.astro รู้ว่าไม่ต้อง override
 * ผ่าน validHex อีกชั้นเผื่อค่าใน DB ถูกแก้มือจนเพี้ยน จะได้ไม่หลุดลง <style>
 * @returns {{ light: string, dark: string } | null}
 */
export function accentColors() {
  const light = validHex(getSetting('accent_light', ''));
  const dark = validHex(getSetting('accent_dark', ''));
  if (!light && !dark) return null;
  return { light: light ?? DEFAULT_ACCENT.light, dark: dark ?? DEFAULT_ACCENT.dark };
}
