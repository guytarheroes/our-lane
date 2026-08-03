// ทางกู้สุดท้าย — ใช้เมื่อลืมทั้งรหัสผ่านและรหัสกู้คืน ต้องเข้าถึงเครื่องได้เท่านั้น
//
//   docker exec -it our-lane-web node reset-password.mjs                    # ดูรายชื่อบัญชี
//   docker exec -it our-lane-web node reset-password.mjs a@b.c 'รหัสใหม่ยาว8ตัว'
//
// พึ่งแค่ builtin ของ node ไม่ import อะไรจาก src/ หรือ dist/ เลย
// เพราะ image เก็บแต่ dist/ และชื่อไฟล์ chunk ที่ build ออกมาเปลี่ยนได้ทุกครั้ง
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { join } from 'node:path';

const db = new DatabaseSync(join(process.env.DATA_DIR ?? './data', 'our-lane.db'));
const [email, password] = process.argv.slice(2);

if (!email) {
  console.log('บัญชีที่มีอยู่:');
  for (const u of db.prepare('SELECT id, email, name FROM user ORDER BY id').all()) {
    console.log(`  ${u.id}  ${u.email}  ${u.name ?? '(ยังไม่ได้ตั้งชื่อ)'}`);
  }
  console.log('\nตั้งรหัสใหม่: node reset-password.mjs <อีเมล> <รหัสผ่านใหม่>');
  process.exit(0);
}

if (!password || password.length < 8) {
  console.error('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
  process.exit(1);
}

const user = db.prepare('SELECT id, token_version FROM user WHERE email = ?').get(email);
if (!user) {
  console.error(`ไม่มีบัญชีอีเมล ${email} — รันโดยไม่ใส่อาร์กิวเมนต์เพื่อดูรายชื่อ`);
  process.exit(1);
}

// รูปแบบเดียวกับ hash() ใน src/lib/auth.js — salt:key ด้วย scrypt
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;

// บวก token_version = เตะทุกเครื่องที่ค้างล็อกอินอยู่ออก และล้างรหัสกู้คืนเก่าทิ้ง
db.prepare('UPDATE user SET password = ?, recovery = NULL, token_version = ? WHERE id = ?').run(
  hash,
  user.token_version + 1,
  user.id,
);

console.log(`ตั้งรหัสผ่านใหม่ให้ ${email} แล้ว — ทุกอุปกรณ์ถูกให้ออกจากระบบ`);
console.log('อย่าลืมเข้า /settings เพื่อสร้างรหัสกู้คืนใหม่');
