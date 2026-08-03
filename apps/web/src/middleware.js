import { defineMiddleware } from 'astro:middleware';
import { unsign } from './lib/auth.js';

// ponytail: ยังไม่ใส่ CSP เพราะหน้าเว็บใช้ <script is:inline> อยู่ ต้องเดินสาย nonce ก่อน
// ceiling: เปิด experimental CSP ของ Astro เมื่อไหร่ ค่อยเพิ่ม Content-Security-Policy ตรงนี้
const HEADERS = {
  // uploads เสิร์ฟไฟล์ที่ user ส่งมา — nosniff กันเบราว์เซอร์เดาว่าเป็น HTML แล้วรัน
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
};

// ทั้งเว็บเป็นของส่วนตัว — ต้องล็อกอินก่อนถึงจะเห็นอะไรก็ตาม รวมถึงรูปใน /uploads
// allowlist ไม่ใช่ blocklist: หน้าใหม่ที่เพิ่มทีหลังจะถูกกันไว้เองโดยไม่ต้องจำมาแก้ที่นี่
// หมายเหตุ: ไฟล์ static (dist/client — ทั้ง /_astro/* และของใน public/) ถูกเสิร์ฟโดย
// handler ที่ทำงาน "ก่อน" middleware จึงไม่ผ่านด่านนี้เลย → อย่าวางอะไรที่เป็นความลับใน public/
const PUBLIC = new Set(['/login', '/logout']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.userId = unsign(ctx.cookies.get('session')?.value);

  const { pathname } = ctx.url;
  const open = PUBLIC.has(pathname);

  const res = !open && !ctx.locals.userId ? ctx.redirect('/login') : await next();

  for (const [name, value] of Object.entries(HEADERS)) res.headers.set(name, value);
  return res;
});
