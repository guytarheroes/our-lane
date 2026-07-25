// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  // TLS จบที่ Cloudflare — container เห็นตัวเองเป็น http แต่เบราว์เซอร์ส่ง Origin เป็น https
  // ถ้าไม่ประกาศ allowedDomains ไว้ Astro จะไม่เชื่อ X-Forwarded-Proto แล้วตอบ
  // "Cross-site POST form submissions are forbidden" ทุกครั้งที่ล็อกอิน/บันทึก
  // reverse proxy ต้องส่ง `X-Forwarded-Proto: https` มาด้วย ไม่งั้นไม่มีผล
  security: {
    allowedDomains: [{ hostname: 'bibistang.guytarheroes.com', protocol: 'https' }],
  },

  vite: { plugins: [tailwindcss()] },
});
