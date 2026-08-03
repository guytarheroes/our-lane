# UI Redesign Brief — Our Memory Lane

บรีฟสำหรับออกแบบ UI ใหม่ทั้งเว็บ อ่านไฟล์นี้ก่อนแตะโค้ด
ข้อมูล architecture/deploy อยู่ใน [CLAUDE.md](CLAUDE.md) — ไฟล์นี้พูดเรื่องหน้าตาอย่างเดียว

---

## 1. โปรเจกต์นี้คืออะไร

Timeline ความทรงจำของคู่รัก 2 คน โฮสต์เองบน Raspberry Pi ที่บ้าน ไม่ได้ทำเป็นสินค้า ไม่มี user คนอื่น

**ทั้งเว็บต้องล็อกอินก่อน** ไม่มีหน้าไหนเปิดสาธารณะเลย (`noindex` ด้วย)

* `/` — ไทม์ไลน์แนวตั้ง เรียงตามเวลา
* `/calendar` — ปฏิทินรายเดือน เอารูปของความทรงจำมาแปะบนช่องวันที่
* `/admin` — หน้าบันทึก · `/settings` — บัญชีและค่าเว็บ
* `/login` `/register` — หน้าเดียวที่คนยังไม่ล็อกอินเปิดได้ ใช้ `<AuthShell>` ร่วมกัน
  desktop เป็น 2 คอลัมน์ (แผงแบรนด์สีแดง + ฟอร์ม) ต่ำกว่า `lg` ยุบเหลือฟอร์มอย่างเดียว
  **ห้ามใส่ชื่อคู่รักหรือจำนวนวันในหน้า auth** เพราะเป็นหน้าเดียวที่คนนอกเปิดได้

**โทน:** อบอุ่น เป็นส่วนตัว เหมือนสมุดภาพมากกว่า dashboard
หน้า `/` ควรรู้สึกเหมือนของขวัญ หน้า `/admin` ควรเรียบและใช้ง่าย ไม่ต้องสวยเท่าหน้าแรก

**ภาษา:** ไทยล้วน `lang="th"` — ตัวอักษรไทยมีสระบน/ล่างและวรรณยุกต์ซ้อนกันได้ 2 ชั้น
อย่าใช้ `leading-tight` กับ body text (สระจะชนกัน) และระวัง `truncate` กับหัวข้อยาว

---

## 2. ขอบเขต

### แก้ได้เต็มที่

| ไฟล์ | หน้าที่ |
|---|---|
| `apps/web/src/styles/global.css` | tokens, `.reveal`, keyframes, reduced-motion |
| `apps/web/src/layouts/Base.astro` | โครง `<head>`/`<body>`, font, favicon |
| `apps/web/src/pages/index.astro` | ไทม์ไลน์ |
| `apps/web/src/pages/calendar.astro` | ปฏิทินรายเดือน + วงแหวนสถิติ |
| `apps/web/src/pages/login.astro` · `register.astro` | ฟอร์ม auth |
| `apps/web/src/pages/settings.astro` | บัญชี + ค่าเว็บ |
| `apps/web/src/components/Nav.astro` · `AuthShell.astro` | navbar ร่วม + โครงหน้า auth |
| `apps/web/src/pages/admin.astro` | ฟอร์มเพิ่ม/แก้ + รายการ |

สร้าง `src/components/*.astro` เพิ่มได้ถ้าช่วยให้อ่านง่ายขึ้นจริง (ตอนนี้ยังไม่มีเลย เพราะยังไม่จำเป็น)

### ห้ามแตะ

`src/lib/*` (รวม `calendar.js` ที่คำนวณช่องปฏิทิน) · `src/middleware.js`
· `src/pages/logout.js` · `src/pages/uploads/[file].js`
· `astro.config.mjs` · `Dockerfile` · `docker-compose.yml` · `package.json`

---

## 3. ข้อจำกัดที่ห้ามฝ่าฝืน

ทุกข้อในนี้ถ้าฝ่าฝืนแล้วเว็บพังจริง ไม่ใช่เรื่องรสนิยม

**1. ห้ามเพิ่ม dependency** ทั้งเว็บมี 4 ตัว (astro, @astrojs/node, tailwindcss, @tailwindcss/vite)
ไม่มี UI kit ไม่มี icon package ไม่มี animation library — icon ใช้ inline SVG หรือ emoji
ฟอนต์ต้อง self-host เสมอ — ตอนนี้คือ **Bai Jamjuree** (SIL OFL) อยู่ใน `apps/web/public/fonts/`
โหลดเฉพาะ subset `thai` + `latin` น้ำหนัก 400/500/600 รวม 6 ไฟล์ 76KB
**ห้ามลิงก์ Google Fonts หรือ CDN ใด ๆ** เพราะ origin อยู่วงในไม่มีเน็ตออก

**2. Tailwind v4 ไม่มี `tailwind.config.js`** เพิ่มสีใหม่ต้องแก้ **2 ที่** ใน `global.css`:
`:root` → `@theme inline` ถ้าลืมที่ใดที่หนึ่ง utility class จะไม่มีอยู่จริง

**3. ไฟล์ใน `public/` ไม่ผ่านด่านล็อกอิน** static handler ทำงานก่อน middleware
ฟอนต์จึงโหลดได้ตอนยังไม่ล็อกอิน (ตั้งใจ) แต่**ห้ามเอารูปหรืออะไรที่เป็นส่วนตัวไปวางที่นั่น**
รูปที่ user อัปโหลดอยู่ใน `$DATA_DIR/uploads` เสิร์ฟผ่าน route จึงถูกกันตามปกติ

**4. ไม่มี dark mode** palette เป็นโทนสว่างล้วน พื้นหลังเป็น Old lace เสมอ
ห้ามใช้ `dark:` prefix ห้ามทำปุ่ม toggle ห้ามเก็บ theme ลง localStorage

**4. เว็บต้องอ่านได้เมื่อ JS ไม่ทำงาน** สองจุดนี้คือหัวใจ:
* `.reveal` เริ่มที่ `opacity: 0` ได้ **เฉพาะ** ใต้ selector `.js .reveal` — class `js` ถูกใส่ด้วย
  inline script ใน `<head>` ของ `Base.astro` ถ้าเขียนเป็น `.reveal { opacity: 0 }` เฉย ๆ
  หน้าเว็บจะว่างเปล่าทันทีที่ JS พัง
* `#counter` มีจำนวนวัน render มาจาก server อยู่แล้ว JS แค่มาเขียนทับให้ละเอียดขึ้น
  ห้ามทำให้ element นี้ว่างตอนโหลด

**5. animation ทุกตัวต้องถูกปิดใน `@media (prefers-reduced-motion: reduce)`** ท้าย `global.css`
เพิ่ม keyframes ใหม่ = เพิ่มบรรทัดปิดในบล็อกนั้นด้วยเสมอ

**6. ห้ามใส่ `will-change` ค้างไว้ใน CSS** เคยทำแล้วมันดันทุก element ขึ้น compositor layer ถาวร
ถ้าจำเป็นจริงให้ใส่/ถอดด้วย JS เฉพาะช่วงที่ animate

**7. ฟอร์มต้องเป็น `<form method="post">` ธรรมดา** ห้ามเปลี่ยนเป็น `fetch` / client-side validation
ที่บล็อกการ submit — POST ถูก handle ใน frontmatter ของหน้าเดียวกันแล้ว redirect 303 กลับ
`required` `minlength` `accept` ของ HTML ใช้ได้ปกติ

**8. รูปที่ user อัปโหลดใช้ `<Image>` ของ `astro:assets` ไม่ได้** เพราะมันมาถึงหลัง build
ต้องเป็น `<img src="/uploads/..." loading="lazy" decoding="async">` และต้องกันภาพกระโดด
(ตอนนี้ใช้ `aspect-[4/3] object-cover` — เปลี่ยนสัดส่วนได้ แต่ต้องมี aspect ล็อกไว้)

---

## 4. Contract ที่ redesign มักทำพังเงียบ ๆ

จัด layout ใหม่ได้ ย้าย element ได้ แต่ `name` / `id` / `type` พวกนี้ต้องอยู่ครบเหมือนเดิม

**`/login`** — 2 ฟอร์ม แยกกันด้วย `<input type="hidden" name="intent">`

| ฟอร์ม | fields |
|---|---|
| `intent=login` | `email` · `password` |
| `intent=register` | `intent` · `name` · `email` · `password` (มีเฉพาะตอน user < 2 คน) |

**`/admin`** — ฟอร์มหลักต้องมี `enctype="multipart/form-data"`

| ฟอร์ม | fields |
|---|---|
| เพิ่ม/แก้ | `id` (hidden, เฉพาะตอนแก้) · `event_date` (`type="date"`) · `location` · `title` · `rating` · `description` · `image` (`type="file"`) |
| ลบ | `intent=delete` · `id` |
| ออกจากระบบ | `action="/logout"` method post |

* ลิงก์แก้ไขคือ `/admin?edit=<id>` — หน้าเดียวกัน ฟอร์มเดียวกัน แค่ prefill
* `input[name=image]` ต้องคง `accept="image/jpeg,image/png,image/webp,image/gif"`
* `rating` เป็น radio 6 ตัว (`0`–`5`) — ดาวเรียง DOM กลับหลัง 5→1 แล้ว `row-reverse` ใน CSS
  ถ้าเรียงใหม่เป็น 1→5 การระบายดาวด้วย `input:checked ~ label` จะพังทันที
* ปุ่มลบมี `onsubmit="return confirm(...)"` — เก็บไว้ (ถ้า JS ปิด ก็แค่ลบเลย ยอมรับได้)

**`/calendar`**

| พารามิเตอร์ | ใช้ตอนไหน |
|---|---|
| `?m=YYYY-MM` | เดือนที่กำลังดู — ลูกศร ‹ › และลิงก์ที่แปะให้กันใช้อันนี้ |
| `?open=1` | เปิด date picker ค้างไว้หลังกดเลือกปี |
| `?pick=year` | สลับ picker ไปชั้นเลือก พ.ศ. (เปิด picker ให้เองไม่ต้องมี `open=1`) |

`m` ต้องผ่าน `validMonth()` ก่อนเสมอ ค่าที่ไม่ผ่านให้ตกไปเดือน default ห้าม 500

**date picker เป็น `<details>` + `<a>` ล้วน ไม่มี JS** สถานะ 2 ชั้น (เลือกเดือน → เลือกปี)
อยู่ใน URL ทั้งหมด ถ้าจะทำใหม่เป็น dropdown ที่ต้องใช้ JS จะพังกฎข้อ 4 และข้อ 7
ช่องวันที่ลิงก์ไป `/#e<id>` — ผูกกับ `id` บน `<li>` ของไทม์ไลน์ ถ้าถอด `id` ออกปฏิทินจะลิงก์ไปไม่ถึง

**`/settings`** — 3 ฟอร์มแยกด้วย `intent`: `profile` (`name`) · `password` (`current`/`next`/`confirm`) · `site` (`couple_name`/`start_date`)

**`<Nav>`** — รับ prop `current` เป็นหนึ่งใน `timeline | calendar | admin | settings`
เมนูบัญชีเป็น `<details>` ไม่มี JS ถ้าเปลี่ยนเป็น dropdown ที่ต้องใช้ JS จะพังกฎข้อ 5

**`/`**

* `<li id="e<id>">` ของแต่ละการ์ด — ปลายทางของลิงก์จากปฏิทิน อย่าถอดออก
* `#counter` + `data-start="YYYY-MM-DD"` — inline script ท้ายหน้าอ่านสองอย่างนี้
* การ์ดแต่ละใบต้องมี class `reveal` ถึงจะเข้า IntersectionObserver
* `<time datetime={e.event_date}>` เก็บ `datetime` ไว้

ตัวแปรที่มีให้ใช้ต่อการ์ดหนึ่งใบ: `e.title` `e.description` `e.event_date` `e.location` `e.image` `e.rating`
(`description` `location` `image` `rating` เป็น null ได้ — ต้องมี empty state ที่ไม่พัง)
`rating` เป็น 1–5 หรือ null เท่านั้น การ์ดแสดง `★★★☆☆` ส่วนช่องปฏิทินเล็กเกินไป จึงแสดง `★3` แทน

---

## 5. ของที่มีอยู่ตอนนี้

ธีม **Old lace · Gray · Crimson red · Barn red** tokens ใน `global.css` — เปลี่ยนค่าได้อิสระ เพิ่ม/ลดชื่อได้ ขอแค่ครบ 2 ที่

| token | ค่า | ใช้ทำอะไร |
|---|---|---|
| `--bg` | `#fdf6ea` Old lace | พื้นหลังหน้า |
| `--surface` | `#fffcf6` | การ์ดที่มีรูป, ฟอร์ม |
| `--field` | `#f6ecdc` | พื้น input |
| `--text` | `#560d07` Barn red | หัวข้อ |
| `--body` | `#4a3833` | ย่อหน้า |
| `--muted` | `#7d5c56` | วันที่, ป้ายรอง |
| `--line` | `#e5d6c2` | เส้นขอบ, เส้น timeline |
| `--accent` | `#8c0f06` Crimson | พื้นปุ่ม, จุด timeline |
| `--accent-ink` | `#8c0f06` | ลิงก์/ตัวเลขนับวัน |
| `--on-accent` | `#fdf6ea` | ตัวอักษรบนพื้น accent — ใช้ token นี้เสมอ ห้ามใช้ `text-bg` |
| `--star-empty` | `#e6c4bf` | ดาวที่ยังไม่ได้เลือก — **ห้ามเปลี่ยนเป็น `color-mix()`** compiler จะสร้าง fallback เป็นสีทึบ เบราว์เซอร์เก่าจะเห็นดาวเปล่าเป็นแดงเต็มเหมือนติ๊ก 5 ดาวไว้ |
| `--alt` … `--alt-muted` | ฟ้าหม่น `#7c9cbe` 6 ตัว | การ์ดคำพูด, ฟอร์มสมัคร, รายการที่ไม่มีรูป |

คู่สีทุกคู่ผ่าน WCAG AA แล้ว (ตัวปกติ ≥ 4.5:1, หัวข้อ ≥ 3:1) — เปลี่ยนค่าแล้ววัดใหม่ด้วย

ฟอนต์: **Bai Jamjuree** ทั้ง `--font-display` (หัวข้อ น้ำหนัก 600) และ `--font-body` (เนื้อความ 400)
ไฟล์อยู่ `public/fonts/` เสิร์ฟจาก origin เอง ไม่มี request ออกนอกเลย

* nav แถวบนของ `/` และ `/calendar` มี 3 ปุ่ม: ไทม์ไลน์ · ปฏิทิน · ＋ เพิ่ม (ชิดขวา)
  **ไม่ใช้ floating action button** — จะลอยทับรูปความทรงจำตลอดเวลา ขัดกับโทนสมุดภาพ
  และ nav มีอยู่แล้ว ไม่ต้องมี element ลอยตัวใหม่ที่ต้องดูแล z-index กับ safe-area
* `.pulse` — จุดเต้น 2.4s (`ml-pulse`) บน eyebrow และใน empty state
* `.js .reveal` / `.js .reveal.in` — fade + เลื่อนขึ้น 24px
* layout: `max-w-5xl` หน้า `/`, `max-w-2xl` หน้า `/admin`, `max-w-3xl` หน้า `/login`
* timeline desktop = zigzag รอบเส้นกลาง (`sm:grid-cols-2` + `sm:col-start-1/2` สลับตาม index), ≤640px ยุบเป็นคอลัมน์เดียว เส้นชิดซ้าย
* การ์ด 3 แบบ: **มีรูป** (surface, รูป 4:3 full-bleed) · **ไม่มีรูปแต่มีเรื่องเล่า** (พื้นฟ้าหม่น ตัวใหญ่ขึ้น) · **ไม่มีทั้งคู่** (surface กะทัดรัด)
* `min-w-0` บนทุก grid item ในไทม์ไลน์ — ถ้าถอดออก จอ 375px จะเลื่อนแนวนอน

---

## 6. เป้าหมายที่อยากได้

1. หน้า `/` ต้องรู้สึกพิเศษตั้งแต่หน้าจอแรก ตอนนี้จืดไป
2. การ์ดความทรงจำควรมีจังหวะสายตา ไม่ใช่กล่องเรียงเท่ากันหมด (สลับซ้าย-ขวาบน desktop ก็ได้ แต่ mobile ต้องคอลัมน์เดียว)
3. รูปคือพระเอก — ปัจจุบันการ์ดที่ไม่มีรูปกับมีรูปดูต่างกันเกินไป
4. empty state ("ยังไม่มีความทรงจำ") ควรชวนให้เริ่มเขียน ไม่ใช่กล่องเทา
5. `/admin` ควรกรอกจบใน scroll เดียวบนมือถือ
6. mobile-first — เปิดจากมือถือเป็นหลัก

---

## 7. เช็กก่อนบอกว่าเสร็จ

```bash
npm run dev            # localhost:4321
npm run build          # ต้องผ่าน
```

ไล่ดูด้วยตาทั้ง 6 ข้อ:

- [ ] `/` `/calendar` `/login` `/admin` ต้องเป็นโทน Old lace แม้เครื่องตั้ง dark mode อยู่
- [ ] `/calendar` 7 คอลัมน์ที่ 320px ต้องไม่ล้น (จุดที่ล้นง่ายที่สุดในเว็บนี้)
- [ ] มือถือ 375px ไม่มี horizontal scroll
- [ ] **ปิด JS** (DevTools → Command Palette → Disable JavaScript) แล้ว reload `/` — ต้องเห็นเนื้อหาครบและเห็นจำนวนวัน
- [ ] เปิด reduced motion (macOS: System Settings → Accessibility → Display → Reduce motion) — ต้องไม่มีอะไรขยับ แต่เนื้อหายังเห็นครบ
- [ ] กด Tab ไล่ทั้งหน้า — เห็น focus ring ทุกจุดที่โฟกัสได้ และคอนทราสต์ตัวอักษรผ่าน WCAG AA
- [ ] เพิ่ม → แก้ (ไม่แนบรูปใหม่) → ลบ ที่ `/admin` ได้ครบ แล้วขึ้นบน `/` ถูกต้อง

ข้อ 3, 4, 5 คือข้อที่ redesign ทำพังบ่อยที่สุด อย่าข้าม
