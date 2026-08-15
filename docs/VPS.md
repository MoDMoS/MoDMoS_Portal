# Deploy MoDMoS Portal บน VPS

Portal อยู่ที่พอร์ต **80** เป็นหน้าแรก + **หน้า login กลาง (SSO)**  
Investment และ Gold Agent ตรวจ JWT cookie `access_token` ร่วมกัน

## โครง URL

| Path | Backend |
|------|---------|
| `/` | Portal static (`/var/www/portal`) |
| `/login` `/register` | Portal (เรียก Investment `/api/auth/*`) |
| `/Investment/` | Investment Docker (`127.0.0.1:8080`, `VITE_BASE=/Investment/`) |
| `/api/` | Investment API (auth + ledger) |
| `/gold/` | Gold Agent static (`/var/www/gold`) |
| `/market` `/indicator` `/strategy` | Gold API `127.0.0.1:3000` (ต้องมี cookie) |

## SSO

1. Login ที่ Portal → Investment ออก cookie `access_token` (`Path=/`)
2. Investment / Gold อ่าน cookie เดียวกัน
3. `AUTH_SECRET` ของ **Investment** และ **Gold API** ต้องตรงกัน

```env
# Investment
AUTH_SECRET=your-long-random-secret
COOKIE_SECURE=false

# Gold Agent api/.env — ค่าเดียวกัน
AUTH_SECRET=your-long-random-secret
```

## ขั้นตอนสั้นๆ

1. Pull `MoDMoS_Portal` → ตั้ง `.env` → `npm ci && npm run build` → `/var/www/portal`
2. Nginx ใช้ `deploy/nginx-portal.conf`
3. Gold: `VITE_BASE=/gold/ npm run build` + `AUTH_SECRET` ใน api/.env
4. Investment: `VITE_BASE=/Investment/` + docker compose rebuild

## ตัวอย่าง Portal `.env`

```env
VITE_INVESTMENT_URL=http://141.98.17.171/Investment/
VITE_GOLD_AGENT_URL=http://141.98.17.171/gold/
```
