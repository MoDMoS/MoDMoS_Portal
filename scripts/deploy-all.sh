#!/usr/bin/env bash
# Deploy one or all MoDMoS apps on the VPS after git pull.
# Usage:
#   ./deploy-all.sh           # everything
#   ./deploy-all.sh portal
#   ./deploy-all.sh investment
#   ./deploy-all.sh gold
#   ./deploy-all.sh portal gold

set -euo pipefail

PORTAL_DIR="${PORTAL_DIR:-$HOME/MoDMoS_Portal}"
INVESTMENT_DIR="${INVESTMENT_DIR:-$HOME/Investment}"
GOLD_DIR="${GOLD_DIR:-$HOME/Gold_Agent}"
PORTAL_WWW="${PORTAL_WWW:-/var/www/portal}"
GOLD_WWW="${GOLD_WWW:-/var/www/gold}"
PM2_APP="${PM2_APP:-gold-agent-api}"

log() { printf '\n==> %s\n' "$*"; }

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
  run_as_root mkdir -p "$dest"
  run_as_root rsync -a --delete "$src" "$dest/"
  run_as_root chown -R www-data:www-data "$dest"
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
    (
      cd "$PORTAL_DIR/api"
      if [[ ! -f .env ]]; then
        echo "Missing $PORTAL_DIR/api/.env (copy from .env.example)" >&2
        exit 1
      fi
      docker compose up -d --build
      docker compose ps
    )
  fi
}

deploy_investment() {
  pull "$INVESTMENT_DIR"
  log "Rebuild Investment (docker)"
  (
    cd "$INVESTMENT_DIR"
    docker compose up -d --build
    docker compose ps
  )
}

deploy_gold() {
  pull "$GOLD_DIR"
  log "Build Gold API + restart PM2"
  (
    cd "$GOLD_DIR/api"
    npm ci
    npx prisma generate
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
if [[ $# -eq 0 ]] || [[ "${1:-}" == "all" ]]; then
  TARGETS=(portal investment gold)
else
  TARGETS=("$@")
fi

for target in "${TARGETS[@]}"; do
  case "$target" in
    portal) deploy_portal ;;
    investment|inv) deploy_investment ;;
    gold) deploy_gold ;;
    nginx) reload_nginx ;;
    *)
      echo "Unknown target: $target (use portal | investment | gold | nginx | all)" >&2
      exit 1
      ;;
  esac
done

reload_nginx
log "Done."
