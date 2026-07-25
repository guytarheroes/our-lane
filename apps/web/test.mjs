// node test.mjs — ตรวจเฉพาะ logic ที่พังเงียบได้: auth กับการรับไฟล์
import assert from 'node:assert/strict';
import { hash, sign, unsign, verify } from './src/lib/auth.js';
import { MAX_BYTES, pickName, safeServe } from './src/lib/upload.js';
import { since, sinceThai } from './src/lib/since.js';

const stored = hash('correct horse battery');
assert.ok(verify('correct horse battery', stored), 'รหัสผ่านที่ถูกต้องต้องผ่าน');
assert.ok(!verify('wrong password', stored), 'รหัสผ่านผิดต้องไม่ผ่าน');
assert.notEqual(hash('same'), hash('same'), 'salt ต้องต่างกันทุกครั้ง');
assert.ok(!verify('x', 'ไม่มี-โคลอน'), 'ค่าที่เก็บพังต้องไม่ crash และไม่ผ่าน');

assert.equal(unsign(sign(42)), 42, 'cookie ที่เราเซ็นเองต้องอ่านกลับได้');
assert.equal(unsign('42.ปลอม'), null, 'ลายเซ็นปลอมต้องถูกปฏิเสธ');
assert.equal(unsign('42'), null, 'ไม่มีลายเซ็นต้องถูกปฏิเสธ');
assert.equal(unsign(undefined), null, 'ไม่มี cookie ต้องได้ null');
assert.equal(unsign(sign(42).replace('42', '43')), null, 'แก้ user id แล้วลายเซ็นต้องไม่ตรง');

assert.match(pickName('image/png', 1024), /^[0-9a-f-]{36}\.png$/, 'ต้องตั้งชื่อไฟล์ใหม่เอง');
assert.throws(() => pickName('text/html', 10), /รองรับเฉพาะ/, 'ไฟล์ที่ไม่ใช่รูปต้องถูกปฏิเสธ');
assert.throws(() => pickName('image/png', MAX_BYTES + 1), /ใหญ่เกิน/, 'ไฟล์เกินขนาดต้องถูกปฏิเสธ');

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

console.log('ok');
