// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  // default ของ adapter คือ 1GB — เว็บนี้รับแค่รูป 8MB จำกัดไว้กัน body ใหญ่ ๆ กินแรม Pi
  adapter: node({ mode: 'standalone', bodySizeLimit: 10 * 1024 * 1024 }),

  // TLS จบที่ Cloudflare — container เห็นตัวเองเป็น http แต่เบราว์เซอร์ส่ง Origin เป็น https
  // ถ้าไม่ประกาศ allowedDomains ไว้ Astro จะไม่เชื่อ X-Forwarded-Proto แล้วตอบ
  // "Cross-site POST form submissions are forbidden" ทุกครั้งที่ล็อกอิน/บันทึก
  // reverse proxy ต้องส่ง `X-Forwarded-Proto: https` มาด้วย ไม่งั้นไม่มีผล
  security: {
    allowedDomains: [{ hostname: 'bibistang.guytarheroes.com', protocol: 'https' }],
  },

  vite: { plugins: [tailwindcss()] },
});
