// ponytail: Map ในหน่วยความจำ — pod เดียว รีสตาร์ทแล้วลืมหมด ซึ่งพอสำหรับเว็บ 2 คน
// ceiling: ถ้าวันหนึ่งรันหลาย instance ต้องย้ายไปเก็บใน SQLite แทน
/** @type {Map<string, {n: number, reset: number}>} */
const hits = new Map();

/**
 * นับครั้งแล้วบอกว่าเกินโควตาหรือยัง — เรียกครั้งเดียวต่อหนึ่งความพยายาม
 * @param {string} key
 * @param {{limit?: number, windowMs?: number}} [opts]
 * @param {number} [now]
 */
export function tooMany(key, { limit = 8, windowMs = 15 * 60_000 } = {}, now = Date.now()) {
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  }

  const rec = hits.get(key);
  if (!rec || now > rec.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  rec.n += 1;
  return rec.n > limit;
}

/** ล็อกอินสำเร็จแล้วล้างโควตาทิ้ง @param {string} key */
export function reset(key) {
  hits.delete(key);
}
