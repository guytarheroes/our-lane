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
const columns = new Set(db.prepare('PRAGMA table_info(event)').all().map((c) => c.name));
if (!columns.has('rating')) db.exec('ALTER TABLE event ADD COLUMN rating INTEGER');
