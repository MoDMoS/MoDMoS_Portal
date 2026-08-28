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
| `/market` `/indicator` `/strategy` | Gold API `127.0.0.1:3002` |
| `/discord` | Portal UI — สถานะ Discord Bot |
| `/discord-api/` | Discord bot Express `127.0.0.1:3000` |
| Postgres Portal Auth | `127.0.0.1:5433` |
| Postgres Gold | `127.0.0.1:5432` |
| Postgres Investment | `127.0.0.1:5434` |
| Postgres Discord | `127.0.0.1:5435` |

### พอร์ตบน VPS (อย่าให้ชน)

| พอร์ต | Service |
|------|---------|
| `3000` | MoDMoS Discord bot (คงไว้) |
| `3001` | Portal Auth API |
| `3002` | Gold Agent API |
| `5432` | Gold Postgres (docker) |
| `5433` | Portal Auth Postgres (docker) |
| `5434` | Investment Postgres (docker) |
| `5435` | Discord Postgres (docker) |
| `8080` | Investment (docker) |

## Docker network ร่วม (`modmos-db`)

Postgres ทุกตัว + Portal API อยู่บน network **`modmos-db`** เพื่อให้ Admin DB viewer ต่อข้าม container ได้

| Container | Hostname ใน network |
|-----------|---------------------|
| Portal Postgres | `portal_postgres:5432` |
| Gold Postgres | `gold_agent_postgres:5432` |
| Investment Postgres | `investment_postgres:5432` |
| Discord Postgres | `discord_postgres:5432` |

สร้าง network (ครั้งแรก / ก่อน compose):

```bash
~/MoDMoS_Portal/scripts/ensure-docker-network.sh
# หรือ: docker network create modmos-db
```

ใน Portal `api/.env` (Admin → Databases):

```env
GOLD_DATABASE_URL=postgresql://goldagent:PASSWORD@gold_agent_postgres:5432/gold_agent?schema=public
INVESTMENT_DATABASE_URL=postgresql://investment:investment@investment_postgres:5432/investment?schema=public
DISCORD_DATABASE_URL=postgresql://discord:discord@discord_postgres:5432/modmos_discord?schema=public
```

`deploy-modmos` จะสร้าง network ให้อัตโนมัติ

## SSO

1. Login ที่ Portal → **Portal API** ออก cookie `access_token` (`Path=/`) พร้อม `roles` / `permissions` / `name`
2. Investment / Gold verify cookie เดียวกัน และตรวจสิทธิ์ service จาก `permissions`
3. `AUTH_SECRET` ของ **Portal API**, **Investment**, **Gold API**, และ **Discord bot** ต้องตรงกัน
4. Admin UI ที่ Portal `/admin` (ต้องมี `admin:access`)
5. Discord status ที่ `/discord` ต้องมี `service:discord` (admin ได้ทุกสิทธิ์อัตโนมัติ; ล็อกต้องมี `admin:access`)
6. Default admin ตั้งใน Portal `api/.env`:

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
3. Nginx ใช้ `deploy/nginx-portal.conf` (Auth → `:3001`, Discord → `:3000` ผ่าน `/discord-api/`, Gold → `:3002`, ledger → `:8080`)
4. Gold: ใน `api/.env` ตั้ง `PORT=3002` + `AUTH_SECRET` ตรง Portal แล้ว pm2 restart
5. Investment: rebuild + `AUTH_SECRET` ตรง Portal
6. Discord bot: ใน `.env` ใส่ `AUTH_SECRET` เดียวกับ Portal แล้ว `deploy-modmos discord` (pm2) — แล้ว login ใหม่ที่ Portal เพื่อได้ permission `service:discord`

### Migrate user เก่าจาก Investment SQLite (ครั้งเดียว)

```bash
cd ~/MoDMoS_Portal/api
INVESTMENT_SQLITE_PATH=$HOME/Investment/data/app.db npm run migrate:from-investment
# หรือ path ไปยังไฟล์ SQLite ของ Investment
```

### Migrate ข้อมูล Discord Bot จาก Neon มา VPS (ครั้งเดียว)

```bash
cd ~/MoDMoS_Bot_Discord
# รัน container discord_postgres ก่อน
docker compose up -d db

# ย้ายข้อมูลจาก Neon มา VPS Postgres
SOURCE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require" \
TARGET_URL="postgresql://discord:discord@127.0.0.1:5435/modmos_discord" \
node scripts/migrate-from-neon.js
```

## Deploy อัตโนมัติ (แนะนำ)

หลัง `git push` จากเครื่องคุณ บน VPS รัน:

```bash
chmod +x ~/MoDMoS_Portal/scripts/deploy-all.sh ~/MoDMoS_Portal/deploy.sh \
  ~/Investment/deploy.sh ~/Gold_Agent/deploy.sh ~/MoDMoS_Bot_Discord/deploy.sh

# ครั้งแรก — ตั้ง alias
echo 'alias deploy-modmos="$HOME/MoDMoS_Portal/scripts/deploy-all.sh"' >> ~/.bashrc
source ~/.bashrc
```

จากนั้นทุกครั้งที่อัปเดต:

```bash
deploy-modmos                 # pull + build Portal UI/API + Investment + Gold + Discord + TripPlanner
deploy-modmos portal          # Portal UI + Auth API
deploy-modmos investment      # เฉพาะ Investment (docker)
deploy-modmos gold            # เฉพาะ Gold
deploy-modmos discord         # เฉพาะ Discord bot (git pull + slash commands + pm2 restart)
deploy-modmos tripplanner     # TripPlanner API (pm2) + static `/trip/`
```

สคริปต์อยู่ที่ `MoDMoS_Portal/scripts/deploy-all.sh`  
ถ้าโฟลเดอร์ไม่ใช่ชื่อด้านล่าง ตั้ง env ก่อนรัน:

```bash
export PORTAL_DIR=$HOME/MoDMoS_Portal
export INVESTMENT_DIR=$HOME/Investment
export GOLD_DIR=$HOME/Gold_Agent
export DISCORD_DIR=$HOME/MoDMoS_Bot_Discord
export TRIPPLANNER_DIR=$HOME/TripPlanner
export PM2_DISCORD_APP=modmos-discord-bot
export PM2_TRIP_APP=tripplanner-api
```

## ไม่ต้องใส่รหัส sudo ทุกครั้ง

ทำ **ครั้งเดียว** บน VPS (ทำทั้งคู่):

### 1) ให้ `deploy` เป็นเจ้าของโฟลเดอร์ static

หลังนี้ `rsync` ไม่ต้องใช้ sudo:

```bash
sudo mkdir -p /var/www/portal /var/www/gold /var/www/trip
sudo chown -R deploy:deploy /var/www/portal /var/www/gold /var/www/trip
```

### 2) ตั้ง sudoers สำหรับ nginx reload

```bash
sudo cp /home/deploy/MoDMoS_Portal/deploy/sudoers-deploy /etc/sudoers.d/modmos-deploy
sudo chmod 440 /etc/sudoers.d/modmos-deploy
sudo visudo -cf /etc/sudoers.d/modmos-deploy
```
