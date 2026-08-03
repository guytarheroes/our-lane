import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOAD_DIR } from '../../lib/db.js';
import { safeServe } from '../../lib/upload.js';
import { SIZES, thumbnail } from '../../lib/thumb.js';

const CACHE = 'public, max-age=31536000, immutable';

// ponytail: node อ่านไฟล์เองไปก่อน — ย้ายไปให้ nginx เสิร์ฟ /uploads ตรง ๆ เมื่อรูปเยอะจนแบนด์วิดท์สำคัญ
export const GET = async ({ params, url }) => {
  const target = safeServe(params.file ?? '');
  if (!target) return new Response('Not found', { status: 404 });

  // ?s=sm|md → รูปย่อ ไม่ใส่ → ต้นฉบับ (ชื่อไฟล์เป็น UUID เนื้อไม่มีวันเปลี่ยน cache ยาวได้)
  const size = url.searchParams.get('s');
  if (size && size in SIZES) {
    const buf = await thumbnail(target.file, size);
    if (buf) {
      return new Response(buf, {
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': CACHE },
      });
    }
    // ย่อไม่สำเร็จก็ตกลงไปส่งต้นฉบับข้างล่าง ดีกว่าโชว์รูปแตก
  }

  try {
    return new Response(await readFile(join(UPLOAD_DIR, target.file)), {
      headers: { 'Content-Type': target.type, 'Cache-Control': CACHE },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
