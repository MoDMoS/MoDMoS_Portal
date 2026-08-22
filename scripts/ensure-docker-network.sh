#!/usr/bin/env bash
set -euo pipefail

NETWORK_NAME="${MODMOS_DOCKER_NETWORK:-modmos-db}"

if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Docker network $NETWORK_NAME already exists"
else
  docker network create "$NETWORK_NAME"
  echo "Created Docker network $NETWORK_NAME"
fi
