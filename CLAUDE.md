# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

npm-workspaces monorepo holding one Astro site: **Our Memory Lane** — timeline ความทรงจำของคู่รัก
หน้าแรกเป็น timeline สาธารณะ (`noindex`) `/admin` เป็นหน้าบันทึกที่ต้องล็อกอิน

## Commands

```bash
npm install                  # ที่ root เท่านั้น — workspaces จัดการ apps/* ให้
npm run dev                  # localhost:4321
npm run build                # ออกที่ apps/web/dist/ (server build ไม่ใช่ static)
npm start                    # รัน build ที่ออกมาแล้ว
npm test                     # apps/web/test.mjs — assert ล้วน ไม่มี framework
```

`npm test` ครอบแค่ `src/lib/auth.js` กับ `src/lib/upload.js` (ทางที่พังแล้วเงียบ) ไม่มี linter ในโปรเจกต์นี้
`docker compose up` **รันบนเครื่อง dev ไม่ได้** เพราะอ้าง external network ที่มีอยู่เฉพาะบน server

## Architecture

**ไม่มี API layer** ทุกอย่างเป็น `<form method="post">` ที่ handle ใน frontmatter ของหน้านั้นเอง
แล้ว redirect 303 กลับ (POST-Redirect-Get) — หน้า admin จึงใช้งานได้แม้ JS ไม่ทำงาน
อย่าเพิ่ม `/api/*` route หรือ client-side fetch มาแทนถ้าไม่มีเหตุผลจริง

**DB คือ SQLite ผ่าน `node:sqlite`** (built-in ไม่ใช่ dependency) ไฟล์อยู่ `$DATA_DIR/our-lane.db`
schema ถูกสร้างด้วย `CREATE TABLE IF NOT EXISTS` ตอน import `src/lib/db.js` — ไม่มี migration tool
แก้ schema แล้วต้องเขียน `ALTER TABLE` เอง `node:sqlite` ต้องใช้ **Node ≥ 22.5** (จะขึ้น ExperimentalWarning ตอนบูต ปกติ)

**session คือ cookie ที่เซ็น HMAC** ไม่มีตาราง session — `sign()`/`unsign()` ใน `src/lib/auth.js`
`src/middleware.js` กัน `/admin` ทั้ง GET และ POST ไว้แล้ว หน้าใน `/admin` ไม่ต้องเช็ก auth ซ้ำ

**สมัครสมาชิกได้แค่ 2 คน** `login.astro` นับ user แล้วซ่อนฟอร์มสมัครเมื่อครบ — นี่คือระบบสิทธิ์ทั้งหมดที่มี
ไม่มี role ไม่มี ownership ต่อ event

## Deploy

เว็บอยู่ที่ **https://bibistang.guytarheroes.com**

```
Cloudflare edge → cloudflared (container) → nginx_proxy_manager → our-lane-web:4321
```

Production คือ Raspberry Pi (Ubuntu 24.04, **arm64**) อยู่หลังเราเตอร์บ้าน ไม่มี public IP และ
ไม่เปิด port ออกเน็ตเลย ทุก container อยู่ network `server_default` ซึ่ง `docker-compose.yml`
ประกาศเป็น `external` — network นี้ไม่ได้ถูกสร้างโดย repo นี้
`docker-compose.yml` ไม่ publish port ออกมาเลย — nginx_proxy_manager คุยกับมันด้วยชื่อ container
`our-lane-web:4321` ผ่าน network นั้น

```bash
docker compose -p our-lane up -d --build     # รันบน Pi (ปกติปล่อยให้ CI ทำ)
```

**`-p our-lane` ต้องใส่ทุกครั้ง** ถ้าไม่ตรึงชื่อ project compose จะตั้งชื่อตามโฟลเดอร์ปัจจุบัน —
รันจากโฟลเดอร์ CI กับรันมือจากอีกโฟลเดอร์จะได้คนละ volume แล้วความทรงจำ "หาย" ทั้งที่ไฟล์ยังอยู่

**image ถูก build บน Pi ไม่ใช่ใน CI** เพราะ GitHub runner เป็น amd64 คนละ arch กัน

TLS จบที่ Cloudflare — ห้ามเพิ่ม cert หรือ redirect https ที่ origin เพราะช่วงนี้เป็นวงในทั้งหมด

**ทั้ง DB และรูปที่อัปโหลดอยู่ใน volume `our-lane-data` เดียวกัน** (`/data`) — backup คือ copy volume นี้
`docker compose -p our-lane down -v` ลบความทรงจำทั้งหมดทิ้ง

`SESSION_SECRET` มาจาก GitHub Secrets ตอน CI deploy หรือจาก `.env` บน Pi ตอนรันมือ
(compose จะไม่ยอมสตาร์ทถ้าไม่มี) เปลี่ยนค่านี้ = เตะทุกคนออกจากระบบ

## CI/CD

`.github/workflows/ci.yml` มี 3 job:

| job | runner | ทำอะไร |
|---|---|---|
| `check` | `ubuntu-latest` | `npm ci` → `npm test` → `npm run build` → `docker build` (amd64 ไว้จับ Dockerfile พังเท่านั้น ไม่ push) |
| `deploy` | `self-hosted` (บน Pi) | `docker compose -p our-lane up -d --build` + smoke check + prune |
| `notify` | `ubuntu-latest` | ยิง Discord webhook ทั้งตอนสำเร็จและตอนพัง |

**deploy รันบน self-hosted runner ที่ติดตั้งบน Pi** ไม่ใช่ SSH เข้าไป เพราะ Pi ไม่เปิด port เข้า —
runner ต่อขาออกไปหา GitHub เอง วิธีนี้ได้ arm64 + network `server_default` + docker daemon ครบในตัว

ต้องตั้งใน repo settings ก่อน CI จะทำงานได้:

* **Secrets** — `SESSION_SECRET` (บังคับ, `openssl rand -base64 32`), `DISCORD_WEBHOOK` (ถ้าไม่ตั้ง job `notify` จะข้ามไปเฉย ๆ ไม่พัง)
* **Variables** — `START_DATE`, `COUPLE_NAME` (ไม่ตั้งก็ได้ compose มี default)

**ห้ามแปะ `${{ }}` ลงใน `run:` ตรง ๆ** ส่ง GitHub context เข้า shell ผ่าน `env:` เสมอ — กัน script injection
ใน job `notify` commit message เป็น input ที่แก้ได้จากภายนอก ตัวที่กันจริงคือ `jq --arg`
ซึ่งบังคับให้ค่ากลายเป็น JSON string เสมอ ไม่ใช่ `echo` ประกอบ JSON เอง

## Conventions

**ไม่เพิ่ม dependency ถ้าไม่จำเป็นจริง** ตอนนี้ทั้งเว็บมี 4 ตัวคือ astro, @astrojs/node, tailwindcss, @tailwindcss/vite
auth/DB/upload ใช้ `node:crypto`, `node:sqlite`, `node:fs` ล้วน — ไม่มี Prisma, ไม่มี NextAuth, ไม่มี bcrypt
DatePicker คือ `<input type="date">` และ animation ทั้งหมดเป็น CSS + IntersectionObserver ไม่มี animation library

**Tailwind v4 ไม่มี `tailwind.config.js`** ต่อผ่าน `@tailwindcss/vite` ใน `astro.config.mjs`
สีทั้งหมดประกาศเป็น CSS variable บน `:root` แล้ว map เข้า utility ด้วย `@theme inline`
ใน `src/styles/global.css` — เพิ่มสีใหม่ต้องแก้ **2 ที่**: `:root` และ `@theme inline`
**ไม่มี dark mode** palette เป็นโทนสว่างล้วน พื้นหลังเป็น Old lace เสมอ ห้ามใช้ `dark:` prefix

**เว็บต้องอ่านได้เมื่อ JS ไม่ทำงาน** `.reveal` เริ่มที่ `opacity: 0` แต่ selector คือ `.js .reveal`
โดย class `js` ถูกใส่ด้วย inline script ใน `<head>` ของ `Base.astro` — ถ้าลบ gate นี้ทิ้ง
หน้าเว็บจะว่างเปล่าทันทีเมื่อ JS พัง ด้วยเหตุผลเดียวกัน ตัวนับวันถูก render มาจาก server แล้ว
JS แค่มาเติมชั่วโมง/นาที/วินาทีทับ

**animation ทุกตัวต้องเคารพ `prefers-reduced-motion`** มี media query ปิดทั้งหมดอยู่ท้าย `global.css`

**อย่าใส่ `will-change` ค้างไว้** เคยทำแล้วมันดันทุก element ขึ้น compositor layer ถาวร

## Gotchas

**รูปที่ user อัปโหลดใช้ `<Image>` ของ `astro:assets` ไม่ได้** เพราะ astro:assets ประมวลผลตอน build
แต่รูปพวกนี้มาถึงหลัง build — จึงเป็น `<img loading="lazy" decoding="async">` ธรรมดาที่ชี้ไป `/uploads/[file]`
(กฎ "รูปต้อง import ผ่าน `<Image>`" ใช้กับรูปใน `src/assets/` เท่านั้น ตอนนี้ยังไม่มี)

**ห้ามเชื่อชื่อไฟล์หรือนามสกุลที่ client ส่งมา** `pickName()` ตั้งชื่อใหม่เป็น UUID จาก content-type
ที่อยู่ใน allowlist เท่านั้น และ `safeServe()` เอา `basename()` ตัด `../` ก่อนอ่านไฟล์เสมอ
สองฟังก์ชันนี้เป็น pure เพื่อให้ `test.mjs` เรียกได้ — ถ้าย้าย logic เข้าไปใน route จะไม่มีอะไรกันไว้

**Astro เปิด CSRF origin check ไว้เป็นค่า default** POST ที่ไม่มี header `Origin` ตรงกันจะได้ 403
ตอน test ด้วย curl ต้องใส่ `-H "Origin: http://localhost:4321"` เอง ไม่ใช่โค้ดพัง

**`UPDATE ... image = COALESCE(?, image)`** ใน `admin.astro` คือสิ่งที่ทำให้แก้ไข event โดยไม่แนบรูปใหม่
แล้วรูปเดิมไม่หาย ถ้าเปลี่ยนเป็น `image = ?` ตรง ๆ การแก้ typo หัวข้อจะลบรูปทิ้ง

ลบ event ต้องลบไฟล์รูปด้วย (`removeImage`) ไม่งั้นไฟล์กำพร้าค้างใน volume ตลอดไป

Astro ต้องเป็น **≥ 7.1.3** เวอร์ชันก่อนหน้าติด advisory (XSS, SSRF, sharp/libvips)
