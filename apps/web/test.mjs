// node test.mjs — ตรวจเฉพาะ logic ที่พังเงียบได้: auth กับการรับไฟล์
import assert from 'node:assert/strict';
import { hash, sign, unsign, verify } from './src/lib/auth.js';
import { MAX_AGE_SEC } from './src/lib/auth.js';
import { MAX_BYTES, pickName, safeServe, sniff } from './src/lib/upload.js';
import { reset, tooMany } from './src/lib/ratelimit.js';
import { since, sinceText } from './src/lib/since.js';
import { monthGrid, shiftMonth, thisMonth, todayISO, validDate, validMonth } from './src/lib/calendar.js';
import { parseRating, starsText } from './src/lib/event.js';
import { generateCode, hashCode, normalizeCode, verifyCode } from './src/lib/recovery.js';
import { validTheme } from './src/lib/theme.js';
import { dict, validLang } from './src/lib/i18n.js';

const stored = hash('correct horse battery');
assert.ok(verify('correct horse battery', stored), 'รหัสผ่านที่ถูกต้องต้องผ่าน');
assert.ok(!verify('wrong password', stored), 'รหัสผ่านผิดต้องไม่ผ่าน');
assert.notEqual(hash('same'), hash('same'), 'salt ต้องต่างกันทุกครั้ง');
assert.ok(!verify('x', 'ไม่มี-โคลอน'), 'ค่าที่เก็บพังต้องไม่ crash และไม่ผ่าน');

const t0 = Date.parse('2026-01-01T00:00:00Z');
assert.deepEqual(unsign(sign(42, 3, t0), t0), { id: 42, version: 3 }, 'cookie ที่เราเซ็นเองต้องอ่านกลับได้');
assert.equal(unsign('42.ปลอม'), null, 'ลายเซ็นปลอมต้องถูกปฏิเสธ');
assert.equal(unsign('42.0'), null, 'ไม่มีลายเซ็นต้องถูกปฏิเสธ');
assert.equal(unsign(undefined), null, 'ไม่มี cookie ต้องได้ null');
assert.equal(unsign(sign(42, 0, t0).replace('42.', '43.'), t0), null, 'แก้ user id แล้วลายเซ็นต้องไม่ตรง');

// เปลี่ยนรหัสผ่าน = token_version บวกหนึ่ง → cookie เก่าที่ยังถือ version เดิมต้องใช้ไม่ได้
// (ตัวเทียบจริงอยู่ใน middleware — ตรงนี้ยืนยันว่า version ถูกเซ็นและปลอมไม่ได้)
const v1 = sign(9, 1, t0);
assert.equal(unsign(v1, t0).version, 1, 'version ต้องเดินทางไปกับ cookie');
assert.equal(unsign(v1.replace('9.1.', '9.2.'), t0), null, 'แก้ version แล้วลายเซ็นต้องไม่ตรง');
assert.notEqual(sign(9, 1, t0), sign(9, 2, t0), 'คนละ version ต้องได้คนละ cookie');

// cookie ที่หลุดออกไปต้องหมดอายุเองแม้ browser จะเก็บไว้เกิน maxAge
const old = sign(7, 0, t0);
assert.equal(unsign(old, t0 + (MAX_AGE_SEC - 60) * 1000).id, 7, 'ยังไม่ครบ 30 วันต้องใช้ได้');
assert.equal(unsign(old, t0 + (MAX_AGE_SEC + 60) * 1000), null, 'เกิน 30 วันต้องหมดอายุ');
assert.equal(unsign(old, t0 - 60_000), null, 'token จากอนาคตต้องถูกปฏิเสธ');
assert.equal(unsign(`7.0.${Math.floor(t0 / 1000) + 999}.${old.split('.')[3]}`, t0), null, 'แก้เวลาแล้วลายเซ็นต้องไม่ตรง');

// rate limit: ครั้งที่ 9 ในหน้าต่างเดียวกันต้องโดนบล็อก
const k = 'test-ip';
for (let i = 0; i < 8; i++) assert.equal(tooMany(k, {}, t0), false, `ครั้งที่ ${i + 1} ต้องผ่าน`);
assert.equal(tooMany(k, {}, t0), true, 'ครั้งที่ 9 ต้องโดนบล็อก');
assert.equal(tooMany(k, {}, t0 + 16 * 60_000), false, 'พ้นหน้าต่างแล้วต้องเริ่มนับใหม่');
reset(k);
assert.equal(tooMany(k, {}, t0), false, 'reset แล้วต้องเริ่มนับใหม่');

assert.match(pickName('image/png', 1024), /^[0-9a-f-]{36}\.png$/, 'ต้องตั้งชื่อไฟล์ใหม่เอง');
assert.throws(() => pickName('text/html', 10), /err.fileType/, 'ไฟล์ที่ไม่ใช่รูปต้องถูกปฏิเสธ');
assert.throws(() => pickName(null, 10), /err.fileType/, 'sniff ไม่ออกต้องถูกปฏิเสธ');
assert.throws(() => pickName('image/png', MAX_BYTES + 1), /err.fileTooBig/, 'ไฟล์เกินขนาดต้องถูกปฏิเสธ');

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
const th = dict('th');
const en = dict('en');
assert.equal(sinceText('2023-01-11', th, at('2026-07-25')), '3 ปี 6 เดือน 14 วัน');
assert.equal(sinceText('2023-01-11', en, at('2026-07-25')), '3 years 6 months 14 days');
assert.deepEqual(since('2023-11-11', at('2026-07-25')), { years: 2, months: 8, days: 14 }, 'ยืมข้ามปี');
assert.equal(sinceText('2025-07-25', th, at('2026-07-25')), '1 ปี', 'หน่วยที่เป็นศูนย์ต้องหายไป');
assert.equal(sinceText('2025-07-25', en, at('2026-07-25')), '1 year', 'อังกฤษต้องไม่เติม s ตอนเป็นหนึ่ง');
assert.equal(sinceText('2026-07-25', th, at('2026-07-25')), '0 วัน', 'วันแรกต้องไม่ได้สตริงว่าง');
assert.equal(sinceText('2026-07-25', en, at('2026-07-25')), '0 days');
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

assert.equal(starsText(3), '★★★☆☆');
assert.equal(starsText(5), '★★★★★');
assert.equal(starsText(null), '', 'ไม่มีดาว = สตริงว่าง');
// '☆'.repeat(5 - 6) throw RangeError — ถ้าไม่กรองก่อน หน้าไทม์ไลน์ทั้งหน้าจะ 500 เพราะข้อมูลแถวเดียว
assert.equal(starsText(6), '', 'ค่าหลุดขอบเขตจาก DB ต้องไม่ทำให้พัง');
assert.equal(starsText(-1), '');

// ---- รหัสกู้คืน ----
const code = generateCode();
assert.match(code, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/, 'รูปแบบ XXXXX-XXXXX-XXXXX');
assert.equal(new Set(Array.from({ length: 200 }, generateCode)).size, 200, 'ต้องไม่ซ้ำกัน');
assert.ok(!/[IOL01]/.test(Array.from({ length: 200 }, generateCode).join('')), 'ห้ามมีตัวที่อ่านสับสน I O L 0 1');

// คนกรอกกลับมาจะพิมพ์ตัวเล็ก/ไม่ใส่ขีด/มีช่องว่าง — ต้องเทียบกันได้หมด
const plain = code.replace(/-/g, '');
assert.equal(normalizeCode(code), plain, 'มีขีด');
assert.equal(normalizeCode(code.toLowerCase()), plain, 'ตัวเล็ก');
assert.equal(normalizeCode(` ${code.toLowerCase().replace(/-/g, ' ')} `), plain, 'ช่องว่างแทนขีด');
assert.equal(normalizeCode('สั้นไป'), null);
assert.equal(normalizeCode(plain + 'X'), null, 'ยาวเกินต้องไม่ผ่าน');
assert.equal(normalizeCode(null), null);

// เก็บกับตรวจต้อง normalize เหมือนกัน — เคยพลาดตรงนี้มาแล้ว เก็บแบบมีขีดแต่ตรวจแบบไม่มี
const codeHash = hashCode(code);
assert.ok(verifyCode(code, codeHash), 'รหัสเต็มรูปแบบต้องผ่าน');
assert.ok(verifyCode(code.toLowerCase(), codeHash), 'ตัวเล็กต้องผ่าน');
assert.ok(verifyCode(plain, codeHash), 'ไม่มีขีดต้องผ่าน');
assert.ok(verifyCode(` ${plain.toLowerCase()} `, codeHash), 'มีช่องว่างต้องผ่าน');
assert.ok(!verifyCode('ZZZZZ-ZZZZZ-ZZZZZ', codeHash), 'รหัสผิดต้องไม่ผ่าน');
assert.ok(!verifyCode(code, null), 'ยังไม่เคยสร้างรหัสกู้คืนต้องไม่ผ่าน');
assert.ok(!verifyCode('', codeHash));
assert.equal(hashCode('สั้นไป'), null, 'รหัสรูปแบบผิดต้อง hash ไม่ได้');

// ---- ธีม ----
assert.equal(validTheme('normal'), 'normal');
assert.equal(validTheme('invert'), 'invert');
// cookie แก้ได้จากฝั่ง client — ค่าที่ไม่รู้จักต้องตกไป normal ไม่ใช่หลุดลง data-theme ดิบ ๆ
assert.equal(validTheme('"><script>'), 'normal');
assert.equal(validTheme('dark'), 'normal', 'ธีมเก่าที่ไม่มีแล้วต้องตกไปค่าตั้งต้น');
assert.equal(validTheme(undefined), 'normal');
assert.equal(validTheme('INVERT'), 'normal', 'ตัวใหญ่ไม่นับ ต้องตรงเป๊ะ');

// ---- ภาษา ----
assert.equal(validLang('en'), 'en');
assert.equal(validLang('th'), 'th');
assert.equal(validLang('jp'), 'th', 'ภาษาที่ไม่มีต้องตกไปไทย');
assert.equal(validLang(undefined), 'th');
assert.equal(en('nav.timeline'), 'Timeline');
assert.equal(en('ไม่มีคีย์นี้'), 'ไม่มีคีย์นี้', 'คีย์ที่ไม่มีต้องคืนตัวมันเอง ไม่ใช่ undefined');
assert.equal(en('cal.pics'), th('cal.pics'), 'Pics/Memo เป็นคำในดีไซน์ ต้องเหมือนกันสองภาษา');

// ---- ปฏิทิน ----
assert.equal(validMonth('2026-07'), '2026-07');
assert.equal(validMonth('2026-13'), null, 'เดือน 13 ไม่มีจริง');
assert.equal(validMonth('2026-00'), null, 'เดือน 0 ไม่มีจริง');
assert.equal(validMonth('2026-7'), null, 'ต้อง pad ศูนย์ — ฟอร์มเลือกเดือนส่ง MM มาเสมอ');
assert.equal(validMonth('null-07'), null, 'ฟอร์มไม่ส่ง y มา ต้องตกไป fallback ไม่ใช่พัง');
// new Date(1, 0, 1) คือปี 1901 ไม่ใช่ ค.ศ. 1 — หัวเดือนกับตารางจะคนละปีกัน
assert.equal(validMonth('0001-01'), null, 'ปีที่ JS Date ตีความผิดต้องไม่ผ่าน');
assert.equal(validMonth('0099-12'), null);
assert.equal(validMonth('1900-01'), '1900-01', 'ขอบล่างที่ยอมรับ');
assert.equal(validMonth('2999-12'), '2999-12', 'ขอบบนที่ยอมรับ');
assert.equal(validMonth('3000-01'), null);

// วันที่ที่ไม่มีอยู่จริงต้องไม่ผ่าน — regex อย่างเดียวปล่อย 31 ก.พ. หลุด
assert.equal(validDate('2026-07-25'), '2026-07-25');
assert.equal(validDate('2026-02-31'), null, '31 ก.พ. ไม่มีอยู่จริง');
assert.equal(validDate('2024-02-29'), '2024-02-29', 'อธิกสุรทินมี 29 ก.พ.');
assert.equal(validDate('2023-02-29'), null, 'ปีปกติไม่มี 29 ก.พ.');
assert.equal(validDate('2026-04-31'), null, 'เมษายนมี 30 วัน');
assert.equal(validDate('2026-13-01'), null);
assert.equal(validDate('2026-7-5'), null, 'ต้อง pad ศูนย์');
assert.equal(validDate('0001-01-01'), null, 'ปีที่ JS Date ตีความผิด');
assert.equal(validDate(null), null);

// วันนี้ต้องคิดจากเวลาท้องถิ่น ไม่ใช่ UTC — container รัน TZ=UTC แต่คนใช้อยู่ UTC+7
assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(todayISO(new Date(2026, 6, 26, 3, 0)), '2026-07-26', 'ตี 3 ยังเป็นวันเดิม');
assert.equal(todayISO(new Date(2026, 0, 5)), '2026-01-05', 'ต้อง pad ศูนย์');
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
