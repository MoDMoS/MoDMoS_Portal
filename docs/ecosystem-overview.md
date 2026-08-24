# MoDMoS Ecosystem — สรุปโครงสร้างทุก Repo

อัปเดต: 2026-08-24

เอกสารนี้เป็น **แผนที่ระบบรวม** ของโปรเจกต์ MoDMoS ทั้ง 4 repo  
รายละเอียดเชิงลึกอยู่ที่ docs ในแต่ละ repo (ดูลิงก์ท้ายเอกสาร)

---

## ภาพรวม

```text
Browser
  └─ nginx :80 (MoDMoS_Portal/deploy/nginx-portal.conf)
       ├─ /                 → Portal SPA + Auth API :3001
       ├─ /Investment/ + /api/ (ledger) → Investment :8080
       ├─ /gold/ + /market|indicator|strategy|risk|execution|… → Gold :3002
       └─ /discord-api/     → Discord bot Express :3000

SSO: cookie access_token ← ออกโดย Portal Auth เท่านั้น
ภายนอก: Capital.com ← Gold | Yahoo/SEC ← Investment | Discord+Neon ← Bot
```

| Repo | บทบาท | พอร์ตหลัก (VPS) |
|------|--------|-----------------|
| [MoDMoS_Portal](../README.md) | Hub: หน้าแรก, Login/SSO, Admin RBAC, launcher | UI `:80` · API `:3001` · PG `:5433` |
| [Investment](../../Investment/README.md) | สมุดบัญชีลงทุน (FX / หุ้น / ปันผล / dashboard) | Docker `:8080` · PG `:5434` |
| [Gold_agent](../../Gold_agent/docs/README.md) | เอเจนต์เทรดทอง XAUUSD (Capital + strategy/risk) | API `:3002` · PG `:5432` · UI `/gold/` |
| [MoDMoS_Bot_Discord](../../MoDMoS_Bot_Discord/docs/system-overview.md) | บอทกิลด์ Discord + status บน Portal | Express `:3000` · Neon cloud |

สิทธิ์ SSO ที่ใช้ร่วมกัน: `service:investment` · `service:gold-agent` · `service:discord` · `admin:access`  
`AUTH_SECRET` ต้องตรงกันทุกบริการที่ verify cookie

Docker network ร่วม: `modmos-db` (ดู [VPS.md](./VPS.md))

---

## 1) MoDMoS_Portal

**ทำอะไร:** หน้าแรก + ออก JWT cookie + Admin (users/roles/permissions รวมสร้างผู้ใช้ด้วย username) + หน้า Discord status + ตัวเลือกดู DB ข้ามบริการ

| ชั้น | Stack |
|------|--------|
| UI | Vite, React, React Router (`src/`) |
| API | NestJS (`api/`) — auth, admin, rbac, db-viewer |
| DB | PostgreSQL (Prisma) |

**โฟลเดอร์สำคัญ:** `src/` · `api/src/` · `api/prisma/` · `deploy/nginx-portal.conf` · `scripts/deploy-all.sh`

**SSO:** เป็นผู้ออก `access_token` (Path=`/`) — แอปอื่นไม่ login เอง

**Docs ใน repo:** [README](../README.md) · [VPS.md](./VPS.md) · เอกสารนี้

---

## 2) Investment

**ทำอะไร:** บันทึกการลงทุนส่วนตัว — แลกเงิน, ซื้อขายหุ้นไทย/นอก, ปันผล, cash, snapshot พอร์ต, quotes (Yahoo / SEC)

| ชั้น | Stack |
|------|--------|
| UI | Vite, React, Tailwind (`frontend/`) |
| API | NestJS + Prisma (`backend/`) |
| DB | PostgreSQL |

**โมเดลหลัก:** `User` (ledger) · `Account` · `FxTransfer` · `Trade` · `Dividend` · `CashEntry` · `PortfolioSnapshot`

**SSO:** verify cookie + ต้องมี `service:investment` · interceptor สร้าง ledger user ในเครื่อง

**Deploy:** อยู่หลัง Portal ที่ `/Investment/` และ `/api/` (ledger) หรือ Docker เดี่ยว `:8080`

**Docs ใน repo:** [README](../../Investment/README.md) · [docs/ARCHITECTURE.md](../../Investment/docs/ARCHITECTURE.md) · [docs/vps-setup.md](../../Investment/docs/vps-setup.md)

---

## 3) Gold_agent

**ทำอะไร:** pipeline เทรดทอง — Capital → เทียน/อินดิเคเตอร์ → strategy registry → risk ต่อ user → paper หรือ Capital demo · backtest + gate · หน้า Trade/Backtest/Summary/Settings

| ชั้น | Stack |
|------|--------|
| UI | Vite, React, lightweight-charts (`web/`) |
| API | NestJS + Schedule + Prisma (`api/`) |
| DB | PostgreSQL |

**โมดูลหลัก:** `market` · `indicator` · `strategy` · `risk` · `execution` · `backtest` · `portfolio` · `settings`

**โมเดลหลัก:** `MarketCandle` · `TradeSignal` · `TradePosition` · `BrokerAccount` · `UserSetting` · `AppSetting`

**SSO:** JwtCookieGuard ทั้งระบบ + `service:gold-agent`  
**Capital:** credentials ต่อ user ใน Settings (รหัสผ่านเข้ารหัส) · live host ยังบล็อกใน UI

**Docs ใน repo:** [docs/README.md](../../Gold_agent/docs/README.md) · [ARCHITECTURE.md](../../Gold_agent/docs/ARCHITECTURE.md) · [SYSTEM_FLOW.md](../../Gold_agent/docs/SYSTEM_FLOW.md) · [USER_GUIDE.md](../../Gold_agent/docs/USER_GUIDE.md) · `docs/superpowers/specs/`

---

## 4) MoDMoS_Bot_Discord

**ทำอะไร:** บอท Discord — whitelist IGN, ยศ Class, nickname, Approve/Reject · Portal ดู health/status/logs

| ชั้น | Stack |
|------|--------|
| Bot | Node ESM, discord.js v14 |
| HTTP | Express (`httpApi.js`) |
| DB | Neon Postgres |

**SSO:** Express ตรวจ cookie · `/status` และ `/logs` ต้องการ `service:discord` หรือ `admin:access`  
**Portal UI:** `/discord` → sidebar (`/announcements` สร้าง/แก้ไข · `/roster` · `/logs`)

**Docs ใน repo:** [system-overview.md](../../MoDMoS_Bot_Discord/docs/system-overview.md) · [change-name-class.md](../../MoDMoS_Bot_Discord/docs/change-name-class.md)

---

## ความสัมพันธ์ข้าม Repo

| จาก → ถึง | ความสัมพันธ์ |
|-----------|----------------|
| Portal → Investment / Gold / Discord | nginx proxy + ลิงก์ launcher + (optional) อ่าน DB ใน Admin viewer |
| Investment / Gold / Discord → Portal | verify JWT เท่านั้น — ไม่เรียก business API ของกันและกัน |
| Gold → Capital.com | ราคา + ออเดอร์ demo |
| Investment → Yahoo / SEC | quotes / NAV |
| Discord → Discord Gateway + Neon | รันบอท |

Deploy รวม: `MoDMoS_Portal/scripts/deploy-all.sh` (`portal` \| `investment` \| `gold` \| `discord`)

---

## นโยบายอัปเดตเอกสาร

เมื่อแก้โค้ดที่เปลี่ยนพฤติกรรม / สถาปัตยกรรม / deploy / env / สิทธิ์ — **ต้องอัปเดต docs ที่เกี่ยวข้องใน commit เดียวกัน**

ดูรายละเอียด: [KEEP_DOCS_UPDATED.md](./KEEP_DOCS_UPDATED.md)  
กฎ Cursor (ทุก repo): `.cursor/rules/keep-docs-updated.mdc`
