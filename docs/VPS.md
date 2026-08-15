# Deploy MoDMoS Portal บน VPS

Portal อยู่ที่พอร์ต **80** เป็นหน้าแรก  
Investment และ Gold Agent ยังเป็น repo แยกตามเดิม

## โครง URL

| Path | Backend |
|------|---------|
| `/` | Portal static (`/var/www/portal`) |
| `/Investment/` | Investment Docker (`127.0.0.1:8080`, build ด้วย `VITE_BASE=/Investment/`) |
| `/api/` | Investment API ผ่าน Docker web |
| `/gold/` | Gold Agent static (`/var/www/gold`) |
| `/market` `/indicator` `/strategy` | Gold API `127.0.0.1:3000` |

## ขั้นตอนสั้นๆ

1. Clone / pull `MoDMoS_Portal`
2. ตั้ง `.env` ให้ชี้ Investment + Gold
3. `npm ci && npm run build` → คัดลอก `dist/` ไป `/var/www/portal`
4. ใช้ `deploy/nginx-portal.conf` เป็น Nginx site
5. Build Gold ด้วย `VITE_BASE=/gold/` ไปที่ `/var/www/gold`
6. Investment รัน Docker ที่พอร์ต 8080 ตามเดิม

## ตัวอย่าง `.env` บน VPS

```env
VITE_INVESTMENT_URL=http://141.98.17.171/Investment/
VITE_GOLD_AGENT_URL=http://141.98.17.171/gold/
```

Investment บน VPS ต้อง build ด้วย base path:

```bash
cd ~/Investment
# ใน .env ของ compose
echo 'VITE_BASE=/Investment/' >> .env
docker compose up -d --build
```

หลังแก้ env ของ Portal ต้อง `npm run build` ใหม่ทุกครั้ง
