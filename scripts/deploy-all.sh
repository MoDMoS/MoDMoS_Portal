#!/usr/bin/env bash
# Deploy one or all MoDMoS apps on the VPS after git pull.
# Usage:
#   ./deploy-all.sh           # everything
#   ./deploy-all.sh portal
#   ./deploy-all.sh investment
#   ./deploy-all.sh gold
#   ./deploy-all.sh discord
#   ./deploy-all.sh portal gold

set -euo pipefail

PORTAL_DIR="${PORTAL_DIR:-$HOME/MoDMoS_Portal}"
INVESTMENT_DIR="${INVESTMENT_DIR:-$HOME/Investment}"
GOLD_DIR="${GOLD_DIR:-$HOME/Gold_Agent}"
DISCORD_DIR="${DISCORD_DIR:-$HOME/MoDMoS_Bot_Discord}"
PORTAL_WWW="${PORTAL_WWW:-/var/www/portal}"
GOLD_WWW="${GOLD_WWW:-/var/www/gold}"
PM2_APP="${PM2_APP:-gold-agent-api}"
PM2_DISCORD_APP="${PM2_DISCORD_APP:-modmos-discord-bot}"

log() { printf '\n==> %s\n' "$*"; }

ensure_docker_network() {
  if [[ -x "$PORTAL_DIR/scripts/ensure-docker-network.sh" ]]; then
    "$PORTAL_DIR/scripts/ensure-docker-network.sh"
  else
    docker network inspect modmos-db >/dev/null 2>&1 || docker network create modmos-db
  fi
}

# Prefer passwordless write when dirs are owned by deploy; fall back to sudo -n.
run_as_root() {
  if sudo -n true 2>/dev/null; then
    sudo "$@"
  else
    echo "Need passwordless sudo for: $*" >&2
    echo "One-time fix: see MoDMoS_Portal/docs/VPS.md (section: ไม่ต้องใส่รหัส sudo)" >&2
    sudo "$@"
  fi
}

publish_www() {
  local src="$1"
  local dest="$2"
  if [[ -d "$dest" && -w "$dest" ]]; then
    rsync -a --delete "$src" "$dest/"
    return
  fi
  echo "Need write access to $dest (one-time: sudo chown -R $USER:$USER $dest)" >&2
  run_as_root mkdir -p "$dest"
  run_as_root rsync -a --delete "$src" "$dest/"
  # Keep deploy as owner so later deploys do not need sudo for rsync.
  run_as_root chown -R "$USER:$USER" "$dest"
}

pull() {
  local dir="$1"
  log "git pull in $dir"
  git -C "$dir" pull --ff-only
}

deploy_portal() {
  pull "$PORTAL_DIR"
  log "Build Portal UI"
  (
    cd "$PORTAL_DIR"
    npm ci
    npm run build
  )
  log "Publish Portal → $PORTAL_WWW"
  publish_www "$PORTAL_DIR/dist/" "$PORTAL_WWW"

  if [[ -f "$PORTAL_DIR/api/docker-compose.yml" ]]; then
    log "Rebuild Portal Auth API (docker)"
    ensure_docker_network
    (
      cd "$PORTAL_DIR/api"
      if [[ ! -f .env ]]; then
        echo "Missing $PORTAL_DIR/api/.env (copy from .env.example)" >&2
        exit 1
      fi
      docker compose up -d --build
      docker compose ps
    )
    ensure_docker_network
  fi
}

deploy_investment() {
  pull "$INVESTMENT_DIR"
  log "Rebuild Investment (docker)"
  ensure_docker_network
  (
    cd "$INVESTMENT_DIR"
    docker compose build web --no-cache
    docker compose up -d
    docker compose ps
  )
  ensure_docker_network
}

deploy_gold() {
  pull "$GOLD_DIR"
  if [[ -f "$GOLD_DIR/api/docker/docker-compose.yml" ]]; then
    log "Start Gold Postgres/Redis (docker)"
    ensure_docker_network
    (
      cd "$GOLD_DIR/api/docker"
      # Fixed container_name can conflict with containers from an older compose project.
      docker compose down --remove-orphans 2>/dev/null || true
      docker rm -f gold_agent_redis gold_agent_postgres 2>/dev/null || true
      docker compose up -d
      docker compose ps
    )
    ensure_docker_network
  fi
  log "Build Gold API + restart PM2"
  (
    cd "$GOLD_DIR/api"
    npm ci
    npx prisma generate
    npx prisma migrate deploy
    npm run build
  )
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP"
  else
    (
      cd "$GOLD_DIR/api"
      pm2 start dist/main.js --name "$PM2_APP"
      pm2 save
    )
  fi

  log "Build Gold web → $GOLD_WWW"
  (
    cd "$GOLD_DIR/web"
    npm ci
    VITE_BASE=/gold/ npm run build
  )
  publish_www "$GOLD_DIR/web/dist/" "$GOLD_WWW"
}

resolve_discord_dir() {
  if [[ -d "$DISCORD_DIR/.git" ]]; then
    return
  fi
  local alt
  for alt in "$HOME/MoDMoS_Bot_DIscord" "$HOME/MoDMoS_Bot_Discord" "$HOME/MoDMoS_Bot"; do
    if [[ -d "$alt/.git" ]]; then
      DISCORD_DIR="$alt"
      return
    fi
  done
  echo "Discord bot dir not found (set DISCORD_DIR). Tried $DISCORD_DIR" >&2
  exit 1
}

pm2_name_for_cwd() {
  local dir="${1%/}"
  pm2 jlist 2>/dev/null | node -e '
    const fs = require("fs");
    const dir = process.argv[1];
    let apps = [];
    try { apps = JSON.parse(fs.readFileSync(0, "utf8")); } catch {}
    const hit = (Array.isArray(apps) ? apps : []).find(a => {
      const cwd = String(a.pm2_env && a.pm2_env.pm_cwd || "").replace(/\/$/, "");
      return cwd === dir;
    });
    if (hit && hit.name) process.stdout.write(hit.name);
  ' "$dir"
}

deploy_discord() {
  resolve_discord_dir
  pull "$DISCORD_DIR"
  if [[ ! -f "$DISCORD_DIR/.env" ]]; then
    echo "Missing $DISCORD_DIR/.env" >&2
    exit 1
  fi

  log "Install Discord bot deps + register slash commands"
  (
    cd "$DISCORD_DIR"
    npm ci
    npm run deploy
  )

  local app_name="$PM2_DISCORD_APP"
  if ! pm2 describe "$app_name" >/dev/null 2>&1; then
    local found
    found="$(pm2_name_for_cwd "$DISCORD_DIR" || true)"
    if [[ -n "${found:-}" ]]; then
      app_name="$found"
    fi
  fi

  log "Restart Discord bot ($app_name)"
  if pm2 describe "$app_name" >/dev/null 2>&1; then
    pm2 restart "$app_name"
  else
    (
      cd "$DISCORD_DIR"
      pm2 start index.js --name "$app_name"
      pm2 save
    )
  fi
}

reload_nginx() {
  if [[ -f /etc/nginx/sites-enabled/portal ]] || [[ -f /etc/nginx/sites-available/portal ]]; then
    log "Reload Nginx"
    if [[ -f "$PORTAL_DIR/deploy/nginx-portal.conf" ]]; then
      run_as_root cp "$PORTAL_DIR/deploy/nginx-portal.conf" /etc/nginx/sites-available/portal
      run_as_root ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/portal
    fi
    run_as_root nginx -t
    run_as_root systemctl reload nginx
  fi
}

TARGETS=()
NEED_NGINX=0
if [[ $# -eq 0 ]] || [[ "${1:-}" == "all" ]]; then
  TARGETS=(portal investment gold discord)
  NEED_NGINX=1
else
  TARGETS=("$@")
fi

for target in "${TARGETS[@]}"; do
  case "$target" in
    portal) deploy_portal; NEED_NGINX=1 ;;
    investment|inv) deploy_investment; NEED_NGINX=1 ;;
    gold) deploy_gold; NEED_NGINX=1 ;;
    discord|bot|discord-bot) deploy_discord ;;
    nginx) reload_nginx ;;
    *)
      echo "Unknown target: $target (use portal | investment | gold | discord | nginx | all)" >&2
      exit 1
      ;;
  esac
done

if [[ "$NEED_NGINX" -eq 1 ]]; then
  reload_nginx
fi
log "Done."
