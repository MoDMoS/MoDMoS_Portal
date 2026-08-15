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

pull() {
  local dir="$1"
  log "git pull in $dir"
  git -C "$dir" pull --ff-only
}

deploy_portal() {
  pull "$PORTAL_DIR"
  log "Build Portal"
  (
    cd "$PORTAL_DIR"
    npm ci
    npm run build
  )
  log "Publish Portal → $PORTAL_WWW"
  sudo mkdir -p "$PORTAL_WWW"
  sudo rsync -a --delete "$PORTAL_DIR/dist/" "$PORTAL_WWW/"
  sudo chown -R www-data:www-data "$PORTAL_WWW"
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
  sudo mkdir -p "$GOLD_WWW"
  sudo rsync -a --delete "$GOLD_DIR/web/dist/" "$GOLD_WWW/"
  sudo chown -R www-data:www-data "$GOLD_WWW"
}

reload_nginx() {
  if [[ -f /etc/nginx/sites-enabled/portal ]] || [[ -f /etc/nginx/sites-available/portal ]]; then
    log "Reload Nginx"
    if [[ -f "$PORTAL_DIR/deploy/nginx-portal.conf" ]]; then
      sudo cp "$PORTAL_DIR/deploy/nginx-portal.conf" /etc/nginx/sites-available/portal
      sudo ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/portal
    fi
    sudo nginx -t
    sudo systemctl reload nginx
  fi
}

TARGETS=("${@:-}")
if [[ ${#TARGETS[@]} -eq 0 ]] || [[ "${TARGETS[0]}" == "all" ]]; then
  TARGETS=(portal investment gold)
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
