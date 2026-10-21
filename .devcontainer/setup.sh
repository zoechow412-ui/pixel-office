#!/usr/bin/env bash
# One-time preparation of Hang Fai AI Office in GitHub Codespaces.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "正在安裝恒輝 AI 總部..."
npm ci
npm run build
echo "正在準備 Codex / Gemini 連接程式..."
# Provider installation is best-effort: even if one CLI is temporarily
# unavailable, users can still open the office and configure models later.
if ! npm install --global @openai/codex @google/gemini-cli; then
  echo "AI CLI 安裝未完成。辦公室仍可開啟，之後可於設定連接模型。"
fi
echo "恒輝 AI 總部準備完成。"
