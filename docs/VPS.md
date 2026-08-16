# Deploy MoDMoS Portal บน VPS

Portal อยู่ที่พอร์ต **80** เป็นหน้าแรก + **Auth/SSO hub**  
Portal API (Postgres) ออก JWT — Investment และ Gold แค่ verify cookie

## โครง URL

| Path | Backend |
|------|---------|
| `/` | Portal static (`/var/www/portal`) |
| `/login` `/register` `/admin` | Portal UI → Portal Auth API |
| `/api/auth/` `/api/admin/` | Portal API `127.0.0.1:3001` |
| `/Investment/` | Investment Docker (`127.0.0.1:8080`) |
| `/api/` (ledger) | Investment API ผ่าน Docker `:8080` |
| `/gold/` | Gold Agent static |
| `/market` `/indicator` `/strategy` | Gold API `127.0.0.1:3000` |

## SSO

1. Login ที่ Portal → **Portal API** ออก cookie `access_token` (`Path=/`) พร้อม `roles` / `permissions` / `name`
2. Investment / Gold verify cookie เดียวกัน และตรวจสิทธิ์ service จาก `permissions`
3. `AUTH_SECRET` ของ **Portal API**, **Investment**, และ **Gold API** ต้องตรงกัน
4. Admin UI ที่ Portal `/admin` (ต้องมี `admin:access`)
5. Default admin ตั้งใน Portal `api/.env`:

```env
# MoDMoS_Portal/api/.env (หรือ api docker compose)
AUTH_SECRET=your-long-random-secret
COOKIE_SECURE=false
DEFAULT_ADMIN_ENABLED=true
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change-me
DEFAULT_ADMIN_NAME=Admin
DATABASE_URL=postgresql://portal:portal@localhost:5433/modmos_portal?schema=public

# Investment + Gold — AUTH_SECRET ค่าเดียวกัน
AUTH_SECRET=your-long-random-secret
```

## ขั้นตอนสั้นๆ

1. Portal UI: build → `/var/www/portal`
2. Portal API: `cd api && docker compose up -d --build` (Postgres + API :3001)
3. Nginx ใช้ `deploy/nginx-portal.conf` (แยก `/api/auth` `/api/admin` จาก ledger)
4. Gold / Investment: rebuild ตามเดิม + `AUTH_SECRET` ตรงกับ Portal

### Migrate user เก่าจาก Investment SQLite (ครั้งเดียว)

```bash
cd ~/MoDMoS_Portal/api
INVESTMENT_SQLITE_PATH=$HOME/Investment/data/app.db npm run migrate:from-investment
# หรือ path ไปยังไฟล์ SQLite ของ Investment
```

## Deploy อัตโนมัติ (แนะนำ)

หลัง `git push` จากเครื่องคุณ บน VPS รัน:

```bash
chmod +x ~/MoDMoS_Portal/scripts/deploy-all.sh ~/MoDMoS_Portal/deploy.sh \
  ~/Investment/deploy.sh ~/Gold_Agent/deploy.sh

# ครั้งแรก — ตั้ง alias
echo 'alias deploy-modmos="$HOME/MoDMoS_Portal/scripts/deploy-all.sh"' >> ~/.bashrc
source ~/.bashrc
```

จากนั้นทุกครั้งที่อัปเดต:

```bash
deploy-modmos                 # pull + build Portal UI/API + Investment + Gold
deploy-modmos portal          # Portal UI + Auth API
deploy-modmos investment      # เฉพาะ Investment (docker)
deploy-modmos gold            # เฉพาะ Gold
```

สคริปต์อยู่ที่ `MoDMoS_Portal/scripts/deploy-all.sh`  
ถ้าโฟลเดอร์ไม่ใช่ชื่อด้านล่าง ตั้ง env ก่อนรัน:

```bash
export PORTAL_DIR=$HOME/MoDMoS_Portal
export INVESTMENT_DIR=$HOME/Investment
export GOLD_DIR=$HOME/Gold_Agent
```

## ไม่ต้องใส่รหัส sudo ทุกครั้ง

ทำ **ครั้งเดียว** บน VPS (เลือกอย่างใดอย่างหนึ่ง หรือทำทั้งคู่):

### 1) ให้ `deploy` เป็นเจ้าของโฟลเดอร์ static (แนะนำ)

หลังนี้ `rsync` ไม่ต้องใช้ sudo:

```bash
sudo mkdir -p /var/www/portal /var/www/gold
sudo chown -R deploy:deploy /var/www/portal /var/www/gold
```

### 2) หรือตั้ง sudoers สำหรับ deploy

ดูไฟล์ `deploy/sudoers-deploy`
