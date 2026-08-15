# MoDMoS Portal

หน้าเลือกบริการ + **login กลาง (SSO)** สำหรับ Investment และ Gold Agent

## Dev

ต้องการ Investment API ที่ `localhost:3000` (auth)

```bash
cp .env.example .env
npm install
npm run dev
```

เปิด http://localhost:5174 — Vite proxy `/api` → Investment backend

## Env

| ตัวแปร | ความหมาย |
|--------|----------|
| `VITE_INVESTMENT_URL` | URL แอปบันทึกการลงทุน |
| `VITE_GOLD_AGENT_URL` | URL หน้า Gold Agent |

## SSO

- Login/register ที่ `/login` `/register`
- Cookie `access_token` จาก Investment (`Path=/`)
- Gold ต้องตั้ง `AUTH_SECRET` ให้ตรงกับ Investment

รายละเอียด VPS: [docs/VPS.md](docs/VPS.md)

## Build / Deploy

```bash
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/portal/
sudo cp deploy/nginx-portal.conf /etc/nginx/sites-available/portal
sudo nginx -t && sudo systemctl reload nginx
```
