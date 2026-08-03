import { randomUUID } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

export const MAX_BYTES = 8 * 1024 * 1024;

/** ชนิดที่ยอมรับ → นามสกุลที่เราตั้งเอง (ไม่เคยเชื่อชื่อไฟล์จาก client) */
export const TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export const EXTS = new Map([...TYPES].map(([type, ext]) => [ext, type]));

/** @type {[number[], string][]} */
const MAGIC = [
  [[0xff, 0xd8, 0xff], 'image/jpeg'],
  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
  [[0x47, 0x49, 0x46, 0x38], 'image/gif'],
];

/**
 * ดูชนิดไฟล์จากไบต์จริง ไม่ใช่จาก content-type ที่ client บอกมา — pure ไว้ให้ test เรียก
 * @param {Uint8Array} bytes
 * @returns {string | null}
 */
export function sniff(bytes) {
  for (const [sig, type] of MAGIC) {
    if (sig.every((b, i) => bytes[i] === b)) return type;
  }
  // RIFF....WEBP
  const tag = (o, s) => [...s].every((c, i) => bytes[o + i] === c.charCodeAt(0));
  if (bytes.length >= 12 && tag(0, 'RIFF') && tag(8, 'WEBP')) return 'image/webp';
  return null;
}

/**
 * ตั้งชื่อไฟล์ใหม่ + ตรวจ type/size — pure ไว้ให้ test.mjs เรียกได้
 * @param {string | null} type ชนิดที่ sniff ได้ ไม่ใช่ที่ client ส่งมา
 * @param {number} size
 */
export function pickName(type, size) {
  const ext = type && TYPES.get(type);
  if (!ext) throw new Error('err.fileType');
  if (size > MAX_BYTES) throw new Error('err.fileTooBig');
  return randomUUID() + ext;
}

/**
 * @param {FormDataEntryValue | null} file
 * @param {string} dir
 * @returns {Promise<string | null>} ชื่อไฟล์ที่เก็บ หรือ null ถ้าไม่ได้อัปโหลดมา
 */
export async function saveImage(file, dir) {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error('err.fileTooBig');

  const buf = Buffer.from(await file.arrayBuffer());
  const name = pickName(sniff(buf), buf.byteLength);
  await writeFile(join(dir, name), buf);
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
