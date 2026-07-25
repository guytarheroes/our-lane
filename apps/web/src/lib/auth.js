import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-only-insecure-secret';

export const COOKIE = /** @type {const} */ ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
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

// ponytail: cookie ที่เซ็น HMAC *คือ* session เอง — ไม่มีตาราง session ไม่มีอะไรต้องหมดอายุ
// ceiling: ถ้าต้อง revoke session ทันที (เครื่องหาย) ค่อยเพิ่มคอลัมน์ token_version ใน user
/** @param {number} userId */
export function sign(userId) {
  const body = String(userId);
  return `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
}

/** @param {string | undefined} cookie @returns {number | null} */
export function unsign(cookie) {
  const [body, mac] = String(cookie ?? '').split('.');
  if (!body || !mac || !/^\d+$/.test(body)) return null;
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(body);
}
