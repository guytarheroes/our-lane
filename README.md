# 💌 Our Memory Lane — Interactive Timeline for Couples

เว็บไซต์แสดงความทรงจำเรื่องราวความรักในรูปแบบ **Interactive Timeline** แบบเรียงตามลำดับเวลา
พร้อมหน้าจัดการ (Dashboard) ที่รองรับการสมัครสมาชิก เข้าสู่ระบบ และอัปโหลดรูปภาพ

---

## ✨ Features

### 🌟 Public Timeline (`/`)
* **Count-up Timer** — วัน/ชั่วโมง/นาที/วินาที (server render จำนวนวันมาก่อน จึงยังอ่านได้เมื่อ JS ไม่ทำงาน)
* **Interactive Vertical Timeline** — เรียงตามวันที่
* **Scroll Animations** — fade-in + ลอยขึ้น ด้วย CSS + IntersectionObserver เคารพ `prefers-reduced-motion`
* **Media & Details** — รูป, วันที่, หัวข้อ, สถานที่, ข้อความความในใจ
* **Responsive + Dark mode** อัตโนมัติตามเครื่อง

### 🔐 Admin Dashboard (`/admin`)
* **Authentication** — Register / Login (จำกัด 2 บัญชี), session cookie เซ็นด้วย HMAC
* **Add Memory Event** — `<input type="date">`, หัวข้อ, ข้อความ, อัปโหลดรูป (JPEG/PNG/WebP/GIF ≤ 8MB)
* **Edit & Delete** — แก้ไขโดยไม่แนบรูปใหม่ได้ (รูปเดิมคงอยู่), ลบแล้วไฟล์รูปถูกลบตาม

---

## 🛠️ Tech Stack

| | |
|---|---|
| **Framework** | Astro 7 (`output: 'server'` + `@astrojs/node`) |
| **Styling** | Tailwind CSS v4 ผ่าน `@tailwindcss/vite` |
| **Animations** | CSS + IntersectionObserver |
| **Database** | SQLite ผ่าน `node:sqlite` (built-in ของ Node ≥ 22.5) |
| **Auth** | `node:crypto` — scrypt + HMAC-signed cookie |
| **Deployment** | Docker Compose → Raspberry Pi (arm64) หลัง Cloudflare Tunnel |

ทั้งโปรเจกต์มี 4 dependencies: `astro`, `@astrojs/node`, `tailwindcss`, `@tailwindcss/vite`

---

## 🗄️ Database Schema (`apps/web/src/lib/db.js`)

สร้างอัตโนมัติตอนบูตด้วย `CREATE TABLE IF NOT EXISTS` — ไม่มี migration tool

```sql
CREATE TABLE user (
  id       INTEGER PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,          -- scrypt: "salt:key"
  name     TEXT
);

CREATE TABLE event (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date  TEXT NOT NULL,       -- YYYY-MM-DD
  image       TEXT,                -- ชื่อไฟล์ใน $DATA_DIR/uploads
  location    TEXT
);
```

---

## 🚀 Getting Started

```bash
npm install
npm run dev            # http://localhost:4321
```

เข้า `/login` ครั้งแรกเพื่อสมัครบัญชี แล้วเพิ่มความทรงจำที่ `/admin`

```bash
npm test               # ตรวจ auth + การรับไฟล์
npm run build && npm start
```

### Environment

| ตัวแปร | ค่า default | หมายเหตุ |
|---|---|---|
| `SESSION_SECRET` | dev-only | **บังคับใน production** — `openssl rand -base64 32` |
| `START_DATE` | `2023-01-11` | วันที่เริ่มนับของ count-up timer |
| `COUPLE_NAME` | `ทางเดินความทรงจำของเราสองคน` | `<h1>` บนหน้าแรก (ป้าย `our memory lane` ด้านบนเป็นค่าคงที่) |
| `DATA_DIR` | `./data` | ที่เก็บ `our-lane.db` และ `uploads/` |

### Deploy

```bash
cp .env.example .env && $EDITOR .env     # บน Pi
docker compose up -d --build
```

รายละเอียด architecture และข้อควรระวังอยู่ใน [CLAUDE.md](CLAUDE.md)
