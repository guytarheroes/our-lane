import { defineMiddleware } from 'astro:middleware';
import { unsign } from './lib/auth.js';
import { db } from './lib/db.js';

// ponytail: prepare ครั้งเดียวที่ module scope — เพิ่ม lookup ด้วย PK ต่อ request
// (รวมถึงตอนโหลดรูปใน /uploads ซึ่งหน้าเดียวยิงหลายสิบครั้ง) ระดับไมโครวินาที ไม่ต้องทำ cache
const findUser = db.prepare('SELECT id, email, name, token_version FROM user WHERE id = ?');

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
const PUBLIC = new Set(['/login', '/register', '/logout']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  const token = unsign(ctx.cookies.get('session')?.value);
  const user = token ? findUser.get(token.id) : null;

  // token_version ไม่ตรง = รหัสผ่านถูกเปลี่ยนหลังจาก cookie ใบนี้ถูกออก → ถือว่าไม่ได้ล็อกอิน
  ctx.locals.user = user && user.token_version === token.version ? user : null;
  ctx.locals.userId = ctx.locals.user?.id ?? null;

  const open = PUBLIC.has(ctx.url.pathname);
  const res = !open && !ctx.locals.userId ? ctx.redirect('/login') : await next();

  for (const [name, value] of Object.entries(HEADERS)) res.headers.set(name, value);
  return res;
});
