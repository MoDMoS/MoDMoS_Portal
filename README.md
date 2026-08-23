# MoDMoS Portal

หน้าเลือกบริการ + **Auth/SSO hub** (Portal API เป็นผู้ออก JWT)

## เอกสาร

| ไฟล์ | เนื้อหา |
|------|---------|
| [docs/ecosystem-overview.md](./docs/ecosystem-overview.md) | สรุปโครงสร้างทั้ง 4 repo |
| [docs/KEEP_DOCS_UPDATED.md](./docs/KEEP_DOCS_UPDATED.md) | นโยบายอัปเดต docs เมื่อแก้โค้ด |
| [docs/VPS.md](./docs/VPS.md) | Deploy / nginx / พอร์ตบน VPS |

## Dev

ต้องการ:
1. Portal Auth API ที่ `localhost:3001` (Postgres)
2. Investment ledger API ที่ `localhost:3000` (optional สำหรับ service อื่น)

```bash
# Portal API + Postgres
cd api
cp .env.example .env
docker compose up -d db
npm install
npx prisma migrate dev --name init
npm run start:dev

# Portal UI (repo root)
cd ..
cp .env.example .env
npm install
npm run dev
```

เปิด http://localhost:5174  
Vite proxy: `/api/auth` + `/api/admin` → `:3001`, `/api/*` อื่น → Investment `:3000`

## Env (UI)

| ตัวแปร | ความหมาย |
|--------|----------|
| `VITE_INVESTMENT_URL` | URL แอปบันทึกการลงทุน |
| `VITE_GOLD_AGENT_URL` | URL หน้า Gold Agent |

## SSO

- Login/register/admin ที่ Portal UI → Portal API (`/api/auth`, `/api/admin`)
- Cookie `access_token` (`Path=/`) มี `roles` + `permissions` (+ `name`)
- Investment / Gold แค่ verify cookie ด้วย `AUTH_SECRET` เดียวกัน
- Default admin: ตั้งใน `api/.env` (`DEFAULT_ADMIN_*`)

รายละเอียด VPS: [docs/VPS.md](docs/VPS.md)

## Migrate users จาก Investment SQLite

```bash
cd api
# หลัง Portal Postgres พร้อมแล้ว
INVESTMENT_SQLITE_PATH=../path/to/Investment/backend/prisma/dev.db npm run migrate:from-investment
```

## Build / Deploy

```bash
~/MoDMoS_Portal/scripts/deploy-all.sh
~/MoDMoS_Portal/scripts/deploy-all.sh portal
~/MoDMoS_Portal/scripts/deploy-all.sh discord
```
