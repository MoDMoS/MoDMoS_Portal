# MoDMoS Portal

หน้าเลือกบริการส่วนตัว — ลิงก์ไปยัง Investment และ Gold Agent

## Dev

```bash
cp .env.example .env
npm install
npm run dev
```

เปิดที่ http://localhost:5174

## Env

| ตัวแปร | ความหมาย |
|--------|----------|
| `VITE_INVESTMENT_URL` | URL แอปบันทึกการลงทุน |
| `VITE_GOLD_AGENT_URL` | URL หน้า Gold Agent |

เว้นว่าง = การ์ดแสดง «เร็วๆ นี้»

## Build

```bash
npm run build
# ได้ไฟล์ใน dist/
```

## Deploy บน VPS (พอร์ต 80)

```bash
cd ~/MoDMoS_Portal
git pull
cp .env.example .env   # แก้ URL ให้ตรง VPS
nano .env
npm ci
npm run build

sudo mkdir -p /var/www/portal
sudo rsync -a --delete dist/ /var/www/portal/
sudo chown -R www-data:www-data /var/www/portal

sudo cp deploy/nginx-portal.conf /etc/nginx/sites-available/portal
sudo rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/gold-agent
sudo ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/portal
sudo nginx -t && sudo systemctl reload nginx
```

| URL | หน้าที่ |
|-----|---------|
| `http://IP/` | Portal |
| `http://IP/Investment/` | Investment (Docker + `VITE_BASE=/Investment/`) |
| `http://IP/gold/` | Gold Agent (ต้อง build ด้วย `VITE_BASE=/gold/`) |

รายละเอียดเพิ่มใน [docs/VPS.md](docs/VPS.md)
