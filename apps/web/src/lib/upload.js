import { randomUUID } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

export const MAX_BYTES = 8 * 1024 * 1024;

/** content-type ที่ยอมรับ → นามสกุลที่เราตั้งเอง (ไม่เคยเชื่อชื่อไฟล์จาก client) */
export const TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export const EXTS = new Map([...TYPES].map(([type, ext]) => [ext, type]));

/**
 * ตั้งชื่อไฟล์ใหม่ + ตรวจ type/size — pure ไว้ให้ test.mjs เรียกได้
 * @param {string} type @param {number} size
 */
export function pickName(type, size) {
  const ext = TYPES.get(type);
  if (!ext) throw new Error('รองรับเฉพาะไฟล์ JPEG / PNG / WebP / GIF');
  if (size > MAX_BYTES) throw new Error('ไฟล์ใหญ่เกิน 8MB');
  return randomUUID() + ext;
}

/**
 * @param {FormDataEntryValue | null} file
 * @param {string} dir
 * @returns {Promise<string | null>} ชื่อไฟล์ที่เก็บ หรือ null ถ้าไม่ได้อัปโหลดมา
 */
export async function saveImage(file, dir) {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const name = pickName(file.type, file.size);
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

/** @param {string | null | undefined} name @param {string} dir */
export async function removeImage(name, dir) {
  if (!name) return;
  await rm(join(dir, basename(name)), { force: true });
}

/** ชื่อไฟล์ที่ปลอดภัยจะเสิร์ฟ หรือ null — basename ตัด `../` ทิ้ง @param {string} name */
export function safeServe(name) {
  const file = basename(name);
  const type = EXTS.get(extname(file).toLowerCase());
  return type ? { file, type } : null;
}
