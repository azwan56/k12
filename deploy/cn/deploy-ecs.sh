#!/usr/bin/env bash
set -euo pipefail

# Lightweight incremental deploy script for Vanpower K12 CN (Aliyun ECS)
# Target host alias from ~/.ssh/config: aliyun-ecs (101.132.183.16)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ECS_HOST="${ECS_HOST:-aliyun-ecs}"
REMOTE_BASE="${REMOTE_BASE:-/var/www/k12-cn}"

echo "=== 1. Building CN frontend (dist-cn) & backend (server/dist) ==="
cd "${ROOT_DIR}"
npm run build:cn
(cd server && npm run build)

echo "=== 2. Syncing artifacts to ${ECS_HOST}:${REMOTE_BASE} ==="
ssh "${ECS_HOST}" "mkdir -p ${REMOTE_BASE}/web ${REMOTE_BASE}/server ${REMOTE_BASE}/data"
rsync -avz --delete "${ROOT_DIR}/dist-cn/" "${ECS_HOST}:${REMOTE_BASE}/web/"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .env \
  "${ROOT_DIR}/server/dist" \
  "${ROOT_DIR}/server/package.json" \
  "${ROOT_DIR}/server/package-lock.json" \
  "${ECS_HOST}:${REMOTE_BASE}/server/"

echo "=== 3. Installing Linux production dependencies & restarting k12-cn-api ==="
ssh "${ECS_HOST}" "cd ${REMOTE_BASE}/server && (npm ci --omit=dev || npm ci --omit=dev --registry=https://registry.npmmirror.com) && systemctl restart k12-cn-api && systemctl is-active k12-cn-api"

echo "=== Done! ==="
