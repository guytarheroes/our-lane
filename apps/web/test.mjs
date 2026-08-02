// node test.mjs — ตรวจเฉพาะ logic ที่พังเงียบได้: auth กับการรับไฟล์
import assert from 'node:assert/strict';
import { hash, sign, unsign, verify } from './src/lib/auth.js';
import { MAX_AGE_SEC } from './src/lib/auth.js';
import { MAX_BYTES, pickName, safeServe, sniff } from './src/lib/upload.js';
import { reset, tooMany } from './src/lib/ratelimit.js';
import { since, sinceThai } from './src/lib/since.js';
import { monthGrid, shiftMonth, thisMonth, validMonth } from './src/lib/calendar.js';
import { parseRating } from './src/lib/event.js';

const stored = hash('correct horse battery');
assert.ok(verify('correct horse battery', stored), 'รหัสผ่านที่ถูกต้องต้องผ่าน');
assert.ok(!verify('wrong password', stored), 'รหัสผ่านผิดต้องไม่ผ่าน');
assert.notEqual(hash('same'), hash('same'), 'salt ต้องต่างกันทุกครั้ง');
assert.ok(!verify('x', 'ไม่มี-โคลอน'), 'ค่าที่เก็บพังต้องไม่ crash และไม่ผ่าน');

const t0 = Date.parse('2026-01-01T00:00:00Z');
assert.equal(unsign(sign(42, t0), t0), 42, 'cookie ที่เราเซ็นเองต้องอ่านกลับได้');
assert.equal(unsign('42.ปลอม'), null, 'ลายเซ็นปลอมต้องถูกปฏิเสธ');
assert.equal(unsign('42'), null, 'ไม่มีลายเซ็นต้องถูกปฏิเสธ');
assert.equal(unsign(undefined), null, 'ไม่มี cookie ต้องได้ null');
assert.equal(unsign(sign(42, t0).replace('42.', '43.'), t0), null, 'แก้ user id แล้วลายเซ็นต้องไม่ตรง');

// cookie ที่หลุดออกไปต้องหมดอายุเองแม้ browser จะเก็บไว้เกิน maxAge
const old = sign(7, t0);
assert.equal(unsign(old, t0 + (MAX_AGE_SEC - 60) * 1000), 7, 'ยังไม่ครบ 30 วันต้องใช้ได้');
assert.equal(unsign(old, t0 + (MAX_AGE_SEC + 60) * 1000), null, 'เกิน 30 วันต้องหมดอายุ');
assert.equal(unsign(old, t0 - 60_000), null, 'token จากอนาคตต้องถูกปฏิเสธ');
assert.equal(unsign(`7.${Math.floor(t0 / 1000) + 999}.${old.split('.')[2]}`, t0), null, 'แก้เวลาแล้วลายเซ็นต้องไม่ตรง');

// rate limit: ครั้งที่ 9 ในหน้าต่างเดียวกันต้องโดนบล็อก
const k = 'test-ip';
for (let i = 0; i < 8; i++) assert.equal(tooMany(k, {}, t0), false, `ครั้งที่ ${i + 1} ต้องผ่าน`);
assert.equal(tooMany(k, {}, t0), true, 'ครั้งที่ 9 ต้องโดนบล็อก');
assert.equal(tooMany(k, {}, t0 + 16 * 60_000), false, 'พ้นหน้าต่างแล้วต้องเริ่มนับใหม่');
reset(k);
assert.equal(tooMany(k, {}, t0), false, 'reset แล้วต้องเริ่มนับใหม่');

assert.match(pickName('image/png', 1024), /^[0-9a-f-]{36}\.png$/, 'ต้องตั้งชื่อไฟล์ใหม่เอง');
assert.throws(() => pickName('text/html', 10), /รองรับเฉพาะ/, 'ไฟล์ที่ไม่ใช่รูปต้องถูกปฏิเสธ');
assert.throws(() => pickName(null, 10), /รองรับเฉพาะ/, 'sniff ไม่ออกต้องถูกปฏิเสธ');
assert.throws(() => pickName('image/png', MAX_BYTES + 1), /ใหญ่เกิน/, 'ไฟล์เกินขนาดต้องถูกปฏิเสธ');

// ดูไบต์จริง ไม่ใช่ content-type ที่ client บอก
const bytes = (...a) => Uint8Array.from(a);
assert.equal(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2)), 'image/png');
assert.equal(sniff(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
assert.equal(sniff(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), 'image/gif');
assert.equal(
  sniff(bytes(0x52, 0x49, 0x46, 0x46, 9, 9, 9, 9, 0x57, 0x45, 0x42, 0x50)),
  'image/webp',
);
assert.equal(sniff(new TextEncoder().encode('<script>alert(1)</script>')), null, 'HTML ต้องไม่ผ่าน');
assert.equal(sniff(bytes(0x89, 0x50)), null, 'ไฟล์สั้นกว่า magic ต้องไม่ crash');
assert.equal(sniff(bytes(0x52, 0x49, 0x46, 0x46)), null, 'RIFF เปล่า ๆ ยังไม่ใช่ webp');

assert.deepEqual(safeServe('a.png'), { file: 'a.png', type: 'image/png' });
assert.equal(safeServe('../../etc/passwd'), null, 'path traversal ต้องถูกตัด');
assert.equal(safeServe('../../.env'), null, 'ไฟล์ที่ไม่ใช่รูปต้องไม่ถูกเสิร์ฟ');
assert.equal(safeServe('shell.php'), null, 'นามสกุลนอกลิสต์ต้องถูกปฏิเสธ');

const at = (iso) => new Date(`${iso}T12:00:00`);
assert.deepEqual(since('2023-01-11', at('2026-07-25')), { years: 3, months: 6, days: 14 });
assert.equal(sinceThai('2023-01-11', at('2026-07-25')), '3 ปี 6 เดือน 14 วัน');
assert.deepEqual(since('2023-11-11', at('2026-07-25')), { years: 2, months: 8, days: 14 }, 'ยืมข้ามปี');
assert.equal(sinceThai('2025-07-25', at('2026-07-25')), '1 ปี', 'หน่วยที่เป็นศูนย์ต้องหายไป');
assert.equal(sinceThai('2026-07-25', at('2026-07-25')), '0 วัน', 'วันแรกต้องไม่ได้สตริงว่าง');
// 31 ม.ค. → 1 มี.ค. คือเคสที่ "บวกหนึ่งเดือน" ไม่มีอยู่จริงในปฏิทิน — ห้ามได้วันติดลบ
assert.deepEqual(since('2024-01-31', at('2024-03-01')), { years: 0, months: 0, days: 30 });
for (const iso of ['2023-01-11', '2024-01-31', '2024-02-29', '2023-12-31']) {
  const { years, months, days } = since(iso, at('2026-07-25'));
  assert.ok(years >= 0 && months >= 0 && days >= 0, `${iso} ต้องไม่ติดลบ`);
  assert.ok(months < 12 && days < 32, `${iso} ต้องไม่ล้นหน่วย`);
}

// ---- ดาว ----
assert.equal(parseRating('4'), 4);
assert.equal(parseRating(1), 1);
assert.equal(parseRating(5), 5);
assert.equal(parseRating('0'), null, 'ไม่ให้ดาว = null ไม่ใช่ 0');
assert.equal(parseRating(null), null, 'ฟอร์มไม่ส่งมา');
assert.equal(parseRating('ห้าดาว'), null, 'ไม่ใช่ตัวเลข');
assert.equal(parseRating('9999'), null, 'เกิน 5 ต้องไม่หลุดลง DB ไปวาดดาวพันดวง');
assert.equal(parseRating(-3), null, 'ติดลบ');
assert.equal(parseRating('3.7'), 3, 'ทศนิยมต้องถูกตัด');
assert.equal(parseRating(Infinity), null);

// ---- ปฏิทิน ----
assert.equal(validMonth('2026-07'), '2026-07');
assert.equal(validMonth('2026-13'), null, 'เดือน 13 ไม่มีจริง');
assert.equal(validMonth('2026-00'), null, 'เดือน 0 ไม่มีจริง');
assert.equal(validMonth('2026-7'), null, 'ต้อง pad ศูนย์ — ฟอร์มเลือกเดือนส่ง MM มาเสมอ');
assert.equal(validMonth('null-07'), null, 'ฟอร์มไม่ส่ง y มา ต้องตกไป fallback ไม่ใช่พัง');
assert.equal(validMonth('../../etc/passwd'), null, 'query string เชื่อไม่ได้');
assert.equal(validMonth(null), null);
assert.match(thisMonth(new Date('2026-01-05T12:00:00')), /^\d{4}-\d{2}$/);
assert.equal(thisMonth(new Date('2026-01-05T12:00:00')), '2026-01', 'เดือนต้อง pad ศูนย์');

const days = (ym) => monthGrid(ym).filter(Boolean).length;
assert.equal(days('2024-02'), 29, 'ก.พ. 2567 เป็นปีอธิกสุรทิน');
assert.equal(days('2023-02'), 28, 'ก.พ. 2566 ไม่ใช่');
assert.equal(days('2000-02'), 29, 'ปี 2000 หาร 400 ลงตัว = อธิกสุรทิน');
assert.equal(days('1900-02'), 28, 'ปี 1900 หาร 100 ลงตัวแต่ไม่หาร 400');
assert.equal(days('2026-01'), 31);
assert.equal(days('2026-04'), 30);

for (const ym of ['2024-02', '2026-01', '2026-08', '2027-11', '2023-12']) {
  const [y, m] = ym.split('-').map(Number);
  const cells = monthGrid(ym);

  assert.equal(cells.length % 7, 0, `${ym} ต้องเต็มสัปดาห์พอดี`);
  assert.equal(
    cells.indexOf(`${ym}-01`),
    new Date(y, m - 1, 1).getDay(),
    `${ym} วันที่ 1 ต้องตกคอลัมน์เดียวกับวันในสัปดาห์จริง`,
  );

  const filled = cells.filter(Boolean);
  assert.deepEqual(filled, [...filled].sort(), `${ym} วันที่ต้องเรียงจากน้อยไปมาก`);
  // null ได้เฉพาะหัวกับท้าย ห้ามมีรูตรงกลางเดือน
  const body = cells.slice(cells.indexOf(filled[0]), cells.lastIndexOf(filled.at(-1)) + 1);
  assert.equal(body.filter(Boolean).length, body.length, `${ym} ห้ามมีช่องว่างกลางเดือน`);
}

assert.equal(shiftMonth('2026-01', -1), '2025-12', 'ถอยข้ามปี');
assert.equal(shiftMonth('2026-12', 1), '2027-01', 'เดินหน้าข้ามปี');
assert.equal(shiftMonth('2026-07', 0), '2026-07');
assert.equal(shiftMonth('2026-03', -14), '2025-01', 'ข้ามหลายเดือน');

console.log('ok');
