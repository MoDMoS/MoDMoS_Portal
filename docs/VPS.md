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
deploy-modmos                 # pull + build Portal + Investment + Gold
deploy-modmos portal          # เฉพาะ Portal
deploy-modmos investment      # เฉพาะ Investment (docker)
deploy-modmos gold            # เฉพาะ Gold (api pm2 + web /gold/)
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
sudo chmod -R u=rwX,go=rX /var/www/portal /var/www/gold
```

### 2) Passwordless sudo สำหรับ nginx / publish

```bash
sudo cp ~/MoDMoS_Portal/deploy/sudoers-deploy /etc/sudoers.d/modmos-deploy
sudo chmod 440 /etc/sudoers.d/modmos-deploy
sudo visudo -cf /etc/sudoers.d/modmos-deploy
```

ตรวจว่าไม่ถามรหัสแล้ว:

```bash
sudo -n true && echo OK
```

## ตัวอย่าง Portal `.env`

```env
VITE_INVESTMENT_URL=http://141.98.17.171/Investment/
VITE_GOLD_AGENT_URL=http://141.98.17.171/gold/
```
