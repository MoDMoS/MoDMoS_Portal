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

บน VPS หลัง push โค้ด จากเครื่อง — รันคำสั่งเดียว:

```bash
chmod +x ~/MoDMoS_Portal/scripts/deploy-all.sh
~/MoDMoS_Portal/scripts/deploy-all.sh
```

หรือเฉพาะส่วน:

```bash
~/MoDMoS_Portal/scripts/deploy-all.sh portal
~/MoDMoS_Portal/scripts/deploy-all.sh investment
~/MoDMoS_Portal/scripts/deploy-all.sh gold
```

ตั้ง alias (ครั้งเดียว):

```bash
echo 'alias deploy-modmos="$HOME/MoDMoS_Portal/scripts/deploy-all.sh"' >> ~/.bashrc
source ~/.bashrc
deploy-modmos          # ทั้งหมด
deploy-modmos portal   # เฉพาะ portal
```

รายละเอียด path / SSO: [docs/VPS.md](docs/VPS.md)
