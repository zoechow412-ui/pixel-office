#!/usr/bin/env bash
# Railway deployment: authenticated remote office, persistent state, HTTPS proxy.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
if [[ -z "${RAILWAY_PUBLIC_DOMAIN:-}" ]]; then
  echo "安全啟動失敗：請先在 Railway 產生公開網域 (RAILWAY_PUBLIC_DOMAIN)。" >&2
  exit 1
fi
owner_password="${PIXEL_OFFICE_ACCESS_PASSWORD:-}"
if [[ ${#owner_password} -lt 16 ]]; then
  echo "安全啟動失敗：必須設置至少16字的 PIXEL_OFFICE_ACCESS_PASSWORD，否則不能公開辦公室。" >&2
  exit 1
fi
if [[ -z "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]]; then
  echo "資料保存尚未設定：請在 Railway 加入 Volume，掛載至 /data；未設定不會啟動，避免工作記憶流失。" >&2
  exit 1
fi
state="${RAILWAY_VOLUME_MOUNT_PATH}/hang-fai-office"
mkdir -p "$state"
if [[ -L .pixel-office ]]; then
  test "$(readlink .pixel-office)" = "$state" || { echo "資料夾掛載不一致。" >&2; exit 1; }
elif [[ ! -e .pixel-office ]]; then
  ln -s "$state" .pixel-office
else
  echo "檢測到非持久化 .pixel-office 資料夾，為防止資料遺失，停止啟動。" >&2
  exit 1
fi
if [[ ! -f .pixel-office/config.json ]]; then
  printf '%s\\n' '{"locale":"en","host":"0.0.0.0","offices":[{"id":"hang-fai","name":"恒輝 AI 總部","cwd":"."}]}' > .pixel-office/config.json
fi
node scripts/seed-hang-fai.mjs
node scripts/configure-hang-fai-projects.mjs
# Provider auth and task history must survive Railway container redeploys.
# All secrets stay in Railway variables or the attached 0600 private volume,
# never in Git, the public web directory, or an employee's prompt.
export CODEX_HOME="$state/codex-auth"
mkdir -p "$CODEX_HOME"
chmod 700 "$CODEX_HOME"
# Let the two agent CLIs be found without requiring privileged global npm installs.
export PATH="$PWD/.office-clis/node_modules/.bin:$PATH"
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  # Current Codex CLI only accepts the secret through stdin for API-key login.
  # Avoid command-line arguments / echoed output / Git-tracked credentials.
  if ! printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key >/dev/null 2>&1; then
    echo "Codex API 授權失敗，請檢查 Railway 私密變數及 API 帳戶。" >&2
    exit 1
  fi
fi
# GEMINI_API_KEY is read by the existing provider engine at runtime.
export PIXEL_OFFICE_PROJECT="$PWD"
export PIXEL_OFFICE_ALLOW_REMOTE=1
export HOST=0.0.0.0
export PORT="${PORT:-4747}"
echo "恒輝 AI 總部：已啟動安全登入及持久化資料夾。"
exec node dist/server/index.js
