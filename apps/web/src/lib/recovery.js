import { randomInt } from 'node:crypto';
import { hash, verify } from './auth.js';

// ตัด I O L 0 1 ทิ้ง เพราะคนจดใส่กระดาษแล้วอ่านกลับมาสับสนกันประจำ
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 15;

/**
 * รหัสกู้คืนรูปแบบ XXXXX-XXXXX-XXXXX
 * 15 ตัวจากตัวอักษร 31 แบบ ≈ 74 บิต — เดาสุ่มไม่ไหวแม้ไม่มี rate limit
 * ใช้ randomInt เพราะมันไม่มี modulo bias แบบ randomBytes()[i] % 31
 */
export function generateCode() {
  const chars = Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return (chars.join('').match(/.{5}/g) ?? []).join('-');
}

/**
 * คนกรอกกลับมาจะพิมพ์ตัวเล็ก ใส่/ไม่ใส่ขีด มีช่องว่างติดมา — ปรับให้เทียบกันได้ก่อนเสมอ
 * ทั้งตอนเก็บและตอนตรวจต้องผ่านตัวนี้ ไม่งั้นรหัสที่ถูกจะถูกปฏิเสธ
 * @param {unknown} raw
 */
export function normalizeCode(raw) {
  const s = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return s.length === LENGTH ? s : null;
}

/**
 * hash ที่เก็บลง DB — normalize ก่อนเสมอ
 * เคยพลาดมาแล้ว: เก็บ hash ของรหัสที่ยังมีขีด แต่ตอนตรวจส่งตัวที่ normalize แล้วไป
 * ทำให้รหัสที่ถูกต้องถูกปฏิเสธ 100% ทางเดียวที่กันได้คือให้ทั้งสองฝั่งเรียกจากที่นี่
 * @param {unknown} raw
 */
export function hashCode(raw) {
  const code = normalizeCode(raw);
  return code ? hash(code) : null;
}

/** @param {unknown} raw @param {string | null | undefined} stored */
export function verifyCode(raw, stored) {
  const code = normalizeCode(raw);
  return Boolean(code && stored && verify(code, stored));
}
