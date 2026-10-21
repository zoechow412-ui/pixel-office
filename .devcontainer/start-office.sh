#!/usr/bin/env bash
# Automated *private* GitHub Codespaces preview for Pixel Office.
# Never expose port 4747 publicly: Pixel Office executes agent tools.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
PORT=4747
# GitHub's HTTPS private-port proxy changes Host/Origin. Allow only this
# codespace's own port-forward hostname, and keep the server on loopback.
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  forwarding_domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  forwarded_host="${CODESPACE_NAME}-${PORT}.${forwarding_domain}"
  export PIXEL_OFFICE_ALLOWED_HOSTS="${forwarded_host}:80,${forwarded_host}:443"
fi
export HOST=127.0.0.1
export PORT=4747
export PIXEL_OFFICE_PROJECT="$PWD"
mkdir -p .pixel-office
# Project scope confines the default workspace to this repository.
if [[ ! -f .pixel-office/config.json ]]; then
  printf '{"locale":"en","host":"127.0.0.1","port":4747,"offices":[{"id":"hang-fai","name":"恒輝 AI 總部","cwd":"."}]}\n' > .pixel-office/config.json
fi
bash .devcontainer/seed-agents.sh
# GitHub persists /workspaces between codespace restarts. Avoid duplicates.
if [[ -f /tmp/hang-fai-office.pid ]] && kill -0 "$(cat /tmp/hang-fai-office.pid)" 2>/dev/null; then
  exit 0
fi
nohup npm run dev > /tmp/hang-fai-office.log 2>&1 < /dev/null &
echo $! > /tmp/hang-fai-office.pid
echo "恒輝 AI 總部啟動中 · 私人預覽: http://localhost:4747"
