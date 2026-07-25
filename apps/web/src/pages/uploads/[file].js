import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOAD_DIR } from '../../lib/db.js';
import { safeServe } from '../../lib/upload.js';

// ponytail: node อ่านไฟล์เองไปก่อน — ย้ายไปให้ nginx เสิร์ฟ /uploads ตรง ๆ เมื่อรูปเยอะจนแบนด์วิดท์สำคัญ
export const GET = async ({ params }) => {
  const target = safeServe(params.file ?? '');
  if (!target) return new Response('Not found', { status: 404 });

  try {
    return new Response(await readFile(join(UPLOAD_DIR, target.file)), {
      headers: {
        'Content-Type': target.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
