import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { UPLOAD_DIR } from './db.js';

// sharp เป็น native binding — ถ้า prebuilt ของ musl/arm64 หายไป การ import จะ throw
// ถ้า import ไว้บนสุดแล้วพัง route รูปจะตายทั้งเส้น = ไม่มีรูปขึ้นเลยสักรูป
// โหลดแบบ lazy แล้วจำผลไว้ พังก็ได้ null แล้วตกไปเสิร์ฟต้นฉบับแทน (ช้าแต่ไม่พัง)
/** @type {Promise<any> | undefined} */
let sharpModule;
const loadSharp = () =>
  (sharpModule ??= import('sharp').then(
    (m) => m.default,
    () => null,
  ));

/**
 * ขนาดที่เสิร์ฟจริง — ต้นฉบับจากกล้องมือถือคือ 3–8MB / กว้าง 4000px
 * ปฏิทินเดือนหนึ่งมีได้ 31 ช่อง ถ้าส่งต้นฉบับไปหมดคือหลายสิบ MB ต่อการเปิดหนึ่งครั้ง
 * และ Safari บนมือถือมีเพดานหน่วยความจำสำหรับ decode รูป เกินแล้วจะเรนเดอร์เพี้ยนหรือว่างเปล่า
 */
export const SIZES = /** @type {const} */ ({
  sm: 320, // ช่องปฏิทิน (44px) + รูปย่อในรายการ /admin (48px)
  md: 1000, // การ์ดบนไทม์ไลน์ (กว้างสุด ~470px บนจอ retina)
});

const CACHE_DIR = join(UPLOAD_DIR, '.cache');
mkdirSync(CACHE_DIR, { recursive: true });

/** @param {string} file @param {string} size */
const cachePath = (file, size) => join(CACHE_DIR, `${size}-${file}.webp`);

/**
 * คืน buffer ของรูปย่อ สร้างครั้งแรกที่ถูกขอแล้ว cache ลงดิสก์
 * รูปที่อัปไว้ก่อนหน้านี้จึงใช้ได้เลยโดยไม่ต้อง backfill
 * @param {string} file ชื่อไฟล์ที่ผ่าน safeServe มาแล้ว
 * @param {string} size
 * @returns {Promise<Buffer | null>} null = ย่อไม่ได้ ให้ผู้เรียกส่งต้นฉบับแทน
 */
export async function thumbnail(file, size) {
  const width = SIZES[size];
  if (!width) return null;

  const out = cachePath(file, size);
  try {
    return await readFile(out);
  } catch {
    // ยังไม่เคยสร้าง — สร้างข้างล่าง
  }

  const sharp = await loadSharp();
  if (!sharp) return null;

  try {
    const buf = await sharp(join(UPLOAD_DIR, file))
      // .rotate() ต้องมา ไม่งั้นรูปจากมือถือที่พึ่ง EXIF orientation จะออกมาตะแคง
      // เพราะ sharp ตัด metadata ทิ้งตอน resize
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    // เขียนชื่อชั่วคราวก่อนแล้ว rename — กันสองรีเควสต์พร้อมกันอ่านไฟล์ที่เขียนค้างครึ่งทาง
    const tmp = `${out}.${randomUUID()}.tmp`;
    await writeFile(tmp, buf);
    await rename(tmp, out);
    return buf;
  } catch {
    // ไฟล์เสียหรือ sharp ใช้ไม่ได้ — ให้ route ส่งต้นฉบับแทน ดีกว่าโชว์รูปแตก
    return null;
  }
}

/** ลบรูปย่อทุกขนาดของไฟล์นี้ เรียกคู่กับ removeImage @param {string | null | undefined} file */
export async function removeThumbs(file) {
  if (!file) return;
  const name = basename(file);
  await Promise.all(Object.keys(SIZES).map((s) => rm(cachePath(name, s), { force: true })));
}
