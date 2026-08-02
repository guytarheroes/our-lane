import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-only-insecure-secret';

/** อายุ session — บังคับที่ฝั่ง server ด้วย ไม่ใช่เชื่อ maxAge ของ browser อย่างเดียว */
export const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export const COOKIE = /** @type {const} */ ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE_SEC,
});

/** @param {string} password */
export function hash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

/**
 * @param {string} password
 * @param {string} stored `salt:key`
 */
export function verify(password, stored) {
  const [salt, key] = String(stored).split(':');
  if (!salt || !key) return false;
  const a = Buffer.from(key, 'hex');
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** @param {string} body */
const mac = (body) => createHmac('sha256', SECRET).update(body).digest('base64url');

// ponytail: cookie ที่เซ็น HMAC *คือ* session เอง — ไม่มีตาราง session
// เวลาที่ออก token ถูกเซ็นไปด้วย เพื่อให้ cookie ที่หลุดออกไปหมดอายุเองแม้ browser จะเก็บไว้ข้ามปี
// ceiling: ถ้าต้อง revoke ทันที (เครื่องหาย) ต้องเพิ่มคอลัมน์ token_version ใน user
/** @param {number} userId @param {number} [now] */
export function sign(userId, now = Date.now()) {
  const body = `${userId}.${Math.floor(now / 1000)}`;
  return `${body}.${mac(body)}`;
}

/** @param {string | undefined} cookie @param {number} [now] @returns {number | null} */
export function unsign(cookie, now = Date.now()) {
  const [id, issued, sig] = String(cookie ?? '').split('.');
  if (!/^\d+$/.test(id ?? '') || !/^\d+$/.test(issued ?? '') || !sig) return null;

  const expected = mac(`${id}.${issued}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const age = Math.floor(now / 1000) - Number(issued);
  if (age < 0 || age > MAX_AGE_SEC) return null;

  return Number(id);
}
