import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ponytail: SQLite ไฟล์เดียวแทน Postgres+Prisma — เว็บนี้มี user 2 คนกับ event หลักร้อย
// ceiling: ถ้าวันหนึ่งต้องเขียนพร้อมกันหลาย process ค่อยย้ายเป็น Postgres แล้วแก้แค่ไฟล์นี้
const DATA_DIR = process.env.DATA_DIR ?? './data';

export const UPLOAD_DIR = join(DATA_DIR, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'our-lane.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS user (
    id       INTEGER PRIMARY KEY,
    email    TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name     TEXT
  );
  CREATE TABLE IF NOT EXISTS setting (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS event (
    id          INTEGER PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    event_date  TEXT NOT NULL,
    image       TEXT,
    location    TEXT
  );
`);

// ไม่มี migration tool — เพิ่มคอลัมน์เองแบบ idempotent
// เช็ค table_info ก่อนแทน try/catch เพราะ catch เปล่า ๆ จะกลืน error จริงที่ควรดัง
const eventColumns = new Set(db.prepare('PRAGMA table_info(event)').all().map((c) => c.name));
if (!eventColumns.has('rating')) db.exec('ALTER TABLE event ADD COLUMN rating INTEGER');
// เก็บสัดส่วนรูปไว้จองที่บนการ์ดก่อนรูปโหลด ไม่งั้นข้อความใต้รูปจะกระโดดตอนโหลดเสร็จ
if (!eventColumns.has('image_w')) db.exec('ALTER TABLE event ADD COLUMN image_w INTEGER');
if (!eventColumns.has('image_h')) db.exec('ALTER TABLE event ADD COLUMN image_h INTEGER');
// ใครเป็นคนลง — **ไว้แสดงอย่างเดียว ไม่ใช่สิทธิ์** ทั้งสองคนยังแก้และลบของกันได้เหมือนเดิม
// ไม่มี FK เพราะ 2 บัญชีนี้ไม่มีวันถูกลบ และของเก่าที่ลงไว้ก่อนมีคอลัมน์นี้เป็น NULL ตลอดไป
// (ย้อนไปดูไม่ได้ว่าใครลง — เดาแล้วใส่ผิดแย่กว่าปล่อยว่าง)
if (!eventColumns.has('author_id')) db.exec('ALTER TABLE event ADD COLUMN author_id INTEGER');

const userColumns = new Set(db.prepare('PRAGMA table_info(user)').all().map((c) => c.name));
if (!userColumns.has('token_version')) {
  db.exec('ALTER TABLE user ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
}
// เก็บเป็น hash เหมือนรหัสผ่าน ไม่เก็บตัวจริง — ใครอ่าน DB ได้ก็ยังกู้บัญชีไม่ได้
if (!userColumns.has('recovery')) db.exec('ALTER TABLE user ADD COLUMN recovery TEXT');
