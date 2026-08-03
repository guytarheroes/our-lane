# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

npm-workspaces monorepo holding one Astro site: **Our Memory Lane** — timeline ความทรงจำของคู่รัก
**ทั้งเว็บเป็นของส่วนตัว ต้องล็อกอินก่อนถึงจะเห็นอะไรก็ตาม** (`noindex` ด้วย)
`/` ไทม์ไลน์ · `/calendar` ปฏิทินรายเดือน · `/admin` หน้าบันทึก · `/settings` ตั้งค่า
`/login` + `/register` คือหน้าเดียวที่เปิดให้คนยังไม่ล็อกอินเข้าได้

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
เพิ่มคอลัมน์ต้องเขียน `ALTER TABLE` เอง โดยเช็ค `PRAGMA table_info` ก่อนให้ idempotent
(ดูคอลัมน์ `rating` เป็นตัวอย่าง) **อย่าใช้ try/catch ครอบเปล่า ๆ** จะกลืน error จริงที่ควรดัง `node:sqlite` ต้องใช้ **Node ≥ 22.5** (จะขึ้น ExperimentalWarning ตอนบูต ปกติ)

**session คือ cookie ที่เซ็น HMAC** ไม่มีตาราง session — `sign()`/`unsign()` ใน `src/lib/auth.js`
token เซ็นเวลาที่ออกไปด้วยและตรวจอายุ 30 วันฝั่ง server (cookie ที่หลุดจะหมดอายุเอง)

**`src/middleware.js` กันทั้งเว็บด้วย allowlist** เปิดแค่ `/login`, `/register`, `/logout`
นอกนั้นเด้งไป `/login` หมด รวมถึง `/uploads/*` — **หน้าใหม่ที่เพิ่มทีหลังถูกกันให้อัตโนมัติ**
ไม่ต้องกลับมาแก้ middleware และหน้าไหนก็ไม่ต้องเช็ก auth ซ้ำ

**ยกเว้นไฟล์ static** (`/_astro/*` และทุกอย่างใน `public/`) ที่ handler เสิร์ฟก่อนถึง middleware
จึงไม่ผ่านด่านเลย — ฟอนต์อยู่ตรงนั้นได้ แต่ห้ามเอาอะไรที่เป็นส่วนตัวไปวาง

**สมัครสมาชิกได้แค่ 2 คน** `register.astro` นับ user ทั้งตอน render และตอน POST — นี่คือระบบสิทธิ์ทั้งหมดที่มี
ไม่มี role ไม่มี ownership ต่อ event

**ค่าเว็บอยู่ใน DB ไม่ใช่ env แล้ว** `siteSettings()` ใน `src/lib/settings.js` อ่านตามลำดับ
DB → env → ค่าตั้งต้น **พอกดบันทึกใน `/settings` ครั้งแรก ค่าใน `.env` จะถูกเมินตลอดไป**
อยากกลับไปใช้ค่าจาก env ต้อง `DELETE FROM setting WHERE key = ...` เอง

**ลืมรหัสผ่าน = รหัสกู้คืน ไม่ใช่ลิงก์ทางอีเมล** เว็บนี้ส่งอีเมลไม่ได้ (ไม่มี SMTP
และไม่อยากเพิ่ม dependency + บริการภายนอกเพื่อ user 2 คน) — สร้างรหัสที่ `/settings`
เก็บเป็น hash ใน `user.recovery` ใช้ได้ครั้งเดียวแล้วถูกล้างทิ้ง
**`hashCode()`/`verifyCode()` ใน `lib/recovery.js` เป็นทางเดียวที่ถูก** ทั้งตอนเก็บและตอนตรวจ
เคยพลาดมาแล้วจากการเก็บ hash ของรหัสที่ยังมีขีดแต่ตรวจด้วยตัวที่ normalize แล้ว

**ลืมทั้งรหัสผ่านและรหัสกู้คืน** ใช้สคริปต์บนเครื่อง:
`docker exec -it our-lane-web node reset-password.mjs` (ไม่ใส่อาร์กิวเมนต์ = ดูรายชื่อบัญชี)
สคริปต์พึ่งแค่ builtin ของ node ไม่ import อะไรจาก `dist/` เพราะชื่อ chunk เปลี่ยนทุก build

**`token_version` ในตาราง user คือกลไก revoke session** เซ็นติดไปกับ cookie
เปลี่ยนรหัสผ่าน = บวกหนึ่ง = cookie เก่าทุกใบตายทันที middleware เป็นตัวเทียบให้

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

**ไม่เพิ่ม dependency ถ้าไม่จำเป็นจริง** ตอนนี้ทั้งเว็บมี 5 ตัวคือ astro, @astrojs/node, tailwindcss, @tailwindcss/vite, sharp
(sharp ติดมากับ astro อยู่แล้ว แต่ประกาศตรง ๆ เพราะ `lib/thumb.js` import เอง ไม่ควรพึ่ง transitive)
auth/DB/upload ใช้ `node:crypto`, `node:sqlite`, `node:fs` ล้วน — ไม่มี Prisma, ไม่มี NextAuth, ไม่มี bcrypt
DatePicker คือ `<input type="date">` และ animation ทั้งหมดเป็น CSS + IntersectionObserver ไม่มี animation library

**Tailwind v4 ไม่มี `tailwind.config.js`** ต่อผ่าน `@tailwindcss/vite` ใน `astro.config.mjs`
สีทั้งหมดประกาศเป็น CSS variable บน `:root` แล้ว map เข้า utility ด้วย `@theme inline`
ใน `src/styles/global.css` — เพิ่มสีใหม่ต้องแก้ **2 ที่**: `:root` และ `@theme inline`
**ธีมเลือกได้ 2 แบบ** (ปกติ / กลับสี) ที่ `/settings` — เก็บใน cookie แล้ว
`Base.astro` render `data-theme` ตั้งแต่ฝั่ง server **ไม่มีจอกระพริบตอนโหลด**
และไม่ต้องใช้ JS เลย ห้ามเปลี่ยนไปอ่าน localStorage ด้วย JS เพราะจะได้ FOUC กลับมา
**ทั้งเว็บใช้ได้แค่ 4 สีจาก palette** และมีแค่ 3 คู่ที่ contrast ผ่าน ทุกคู่ต้องมี Cherry Red
รายละเอียดอยู่ใน DESIGN.md — ห้ามสร้างเฉดใหม่ ระดับความเข้มใช้ alpha ของสีเดิมเท่านั้น

**ภาษาไทย/อังกฤษอยู่ใน `src/lib/i18n.js`** เป็น object ธรรมดา ไม่มีไลบรารี i18n
เก็บใน cookie แล้ว render จากฝั่ง server แบบเดียวกับธีม ค่าตั้งต้นคือไทย
หน้าไหนต้องการข้อความให้ทำแบบ `Nav.astro`: `const t = dict(validLang(cookie))` แล้วเรียก `t('key')`
ค่าในดิกเป็นฟังก์ชันได้เมื่อต้องเติมตัวเลข (`t('admin.starN', 3)`)
**`t()` ตกกลับไปใช้ไทยเมื่อไม่มีคีย์** ลืมแปลจะได้ไทย ไม่ใช่คีย์ดิบ — หน้าใหม่จึงไม่พัง
ทุกที่ที่ format วันที่ต้องรับ `locale` จาก `localeOf(lang)` **ห้าม hardcode `'th-TH'`**
(th-TH ให้ พ.ศ. · en-GB ให้ ค.ศ. ต่างกัน 543 ปี) และ **`todayISO()` ห้ามแตะ** มันคือคีย์ของ DB
`lib/` ที่ throw error ให้โยนเป็นคีย์ (`throw new Error('err.fileType')`) แล้วให้หน้าแปลเอง
สคริปต์ฝั่ง client ห้ามมีคำของภาษาไหนอยู่ในตัว — ส่งเข้าไปทาง `data-*` (ดูตัวนับใน `index.astro`)

**เว็บต้องอ่านได้เมื่อ JS ไม่ทำงาน** `.reveal` เริ่มที่ `opacity: 0` แต่ selector คือ `.js .reveal`
โดย class `js` ถูกใส่ด้วย inline script ใน `<head>` ของ `Base.astro` — ถ้าลบ gate นี้ทิ้ง
หน้าเว็บจะว่างเปล่าทันทีเมื่อ JS พัง ด้วยเหตุผลเดียวกัน ตัวนับวันถูก render มาจาก server แล้ว
JS แค่มาเติมชั่วโมง/นาที/วินาทีทับ

**animation ทุกตัวต้องเคารพ `prefers-reduced-motion`** มี media query ปิดทั้งหมดอยู่ท้าย `global.css`

**อย่าใส่ `will-change` ค้างไว้** เคยทำแล้วมันดันทุก element ขึ้น compositor layer ถาวร

## Gotchas

**รูปต้องเรียกผ่าน `?s=sm` หรือ `?s=md` เสมอ ห้ามใส่ `src` เปล่า ๆ**
ต้นฉบับจากกล้องมือถือคือ 3–8MB ปฏิทินเดือนหนึ่งมีได้ 31 ช่อง = หลายสิบ MB ต่อการเปิดหนึ่งครั้ง
Safari บนมือถือมีเพดานหน่วยความจำสำหรับ decode รูป เกินแล้วจะเรนเดอร์เพี้ยนหรือว่างเปล่า
(เคยเจอบน production มาแล้ว เดสก์ท็อปไม่เจอเพราะแรมเยอะเน็ตเร็ว)

**สัดส่วนรูปเก็บใน `event.image_w`/`image_h`** ใส่ตอนอัปโหลด ส่วนรูปเก่า `index.astro`
อ่านครั้งเดียวแล้วเขียนกลับ (backfill เอง) — เอาไปใส่ `width`/`height` ให้ `<img>` จองที่
การ์ดจึงโชว์รูปเต็มใบตามสัดส่วนจริงโดยไม่มีภาพกระโดด

`lib/thumb.js` ย่อด้วย sharp ตอนถูกขอครั้งแรกแล้ว cache ลง `$DATA_DIR/uploads/.cache`
รูปเก่าที่อัปไว้ก่อนหน้าจึงใช้ได้เลยไม่ต้อง backfill · ลบ event ต้องเรียก `removeThumbs` ด้วย
**ถ้า sharp โหลดไม่ขึ้น (prebuilt ของ musl/arm64 หาย) route จะตกไปเสิร์ฟต้นฉบับแทน** ช้าแต่ไม่พัง
— ตรวจบน Pi ด้วย `docker exec our-lane-web node -e "require('sharp');console.log('ok')"`

**รูปที่ user อัปโหลดใช้ `<Image>` ของ `astro:assets` ไม่ได้** เพราะ astro:assets ประมวลผลตอน build
แต่รูปพวกนี้มาถึงหลัง build — จึงเป็น `<img loading="lazy" decoding="async">` ธรรมดาที่ชี้ไป `/uploads/[file]`
(กฎ "รูปต้อง import ผ่าน `<Image>`" ใช้กับรูปใน `src/assets/` เท่านั้น ตอนนี้ยังไม่มี)

**ไอคอนอยู่ใน `src/lib/icons.js`** เป็น string ของ path ข้างใน `<svg>` ไม่ใช่ไลบรารี
ใช้แบบ `<svg {...SVG_PROPS} class="size-4" set:html={ICON.gear} />` ทุกตัวรับสีจาก `currentColor`
ธีมกลับสีจึงไม่ต้องมีไอคอนชุดที่สอง — **เพิ่มไอคอนใหม่ให้วาดเองบนกริด 24×24 เป็นเส้น ห้ามถม**

**`/settings` แบ่งเป็น 2 กลุ่มคนละระบบ** `#account` (โปรไฟล์ · รหัสผ่าน · รหัสกู้คืน — ต่อผู้ใช้ อยู่ใน DB)
กับ `#system` (ภาษา · ธีม — ต่อเบราว์เซอร์ อยู่ใน cookie · ค่าเว็บ — ใช้ร่วมกัน อยู่ใน DB)
เมนูบัญชีบน navbar ลิงก์ตรงไปที่ `#account`/`#system` เลย เพิ่มการ์ดใหม่ต้องเลือกก่อนว่ากลุ่มไหน

**`<Nav>` กับ `<AuthShell>` ใน `src/components/`** เป็น component 2 ตัวเดียวที่มี —
nav เคยเขียนซ้ำ 3 หน้า เพิ่มปุ่มทีต้องแก้ 3 ที่ ถ้าจะเพิ่มหน้าใหม่ให้เรียก `<Nav current="..." />`

**ห้ามเชื่อชื่อไฟล์หรือนามสกุลที่ client ส่งมา** `pickName()` ตั้งชื่อใหม่เป็น UUID จาก content-type
ที่อยู่ใน allowlist เท่านั้น และ `safeServe()` เอา `basename()` ตัด `../` ก่อนอ่านไฟล์เสมอ
สองฟังก์ชันนี้เป็น pure เพื่อให้ `test.mjs` เรียกได้ — ถ้าย้าย logic เข้าไปใน route จะไม่มีอะไรกันไว้

**Astro เปิด CSRF origin check ไว้เป็นค่า default** POST ที่ไม่มี header `Origin` ตรงกันจะได้ 403
ตอน test ด้วย curl ต้องใส่ `-H "Origin: http://localhost:4321"` เอง ไม่ใช่โค้ดพัง

**`UPDATE ... image = COALESCE(?, image)`** ใน `admin.astro` คือสิ่งที่ทำให้แก้ไข event โดยไม่แนบรูปใหม่
แล้วรูปเดิมไม่หาย ถ้าเปลี่ยนเป็น `image = ?` ตรง ๆ การแก้ typo หัวข้อจะลบรูปทิ้ง

ลบ event ต้องลบไฟล์รูปด้วย (`removeImage`) ไม่งั้นไฟล์กำพร้าค้างใน volume ตลอดไป

Astro ต้องเป็น **≥ 7.1.3** เวอร์ชันก่อนหน้าติด advisory (XSS, SSRF, sharp/libvips)
