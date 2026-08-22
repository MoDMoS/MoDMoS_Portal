#!/usr/bin/env bash
set -euo pipefail

NETWORK_NAME="${MODMOS_DOCKER_NETWORK:-modmos-db}"

if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Docker network $NETWORK_NAME already exists"
else
  docker network create "$NETWORK_NAME"
  echo "Created Docker network $NETWORK_NAME"
fi

CONTAINERS=(
  portal_postgres
  portal_api
  gold_agent_postgres
  investment_postgres
)

for container in "${CONTAINERS[@]}"; do
  if ! docker ps -a --format '{{.Names}}' | grep -qx "$container"; then
    continue
  fi
  if docker inspect "$container" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' \
    | grep -q "$NETWORK_NAME"; then
    echo "$container already on $NETWORK_NAME"
  else
    docker network connect "$NETWORK_NAME" "$container"
    echo "Connected $container to $NETWORK_NAME"
  fi
done
