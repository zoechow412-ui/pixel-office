#!/usr/bin/env bash
# Seed four editable, initially idle AI employees exactly once for the owner.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .pixel-office/employees/hang-fai
# Repair agents seeded by the first preview version into the wrong directory.
for id in manager developer researcher marketing; do
  old=".pixel-office/employees/$id"
  dest=".pixel-office/employees/hang-fai/$id"
  if [[ -f "$old/agent.md" && ! -e "$dest" ]]; then
    mv "$old" "$dest"
  fi
done
if [[ -e .pixel-office/hq-seeded ]]; then exit 0; fi
node - <<'NODE'
const fs=require('node:fs');
const path=require('node:path');
const agents=[{"id":"manager","name":"AI 總經理","role":"任務統籌與質量審核","color":"#edc47f","model":"gpt-5.3-codex","manager":true,"look":{"skin":"#eec39a","hair":"#302c38","hairStyle":"side","top":"#d8a75f","bottom":"#304763","accessory":"glasses","body":"normal"},"prompt":"你係恒輝 AI 總部總經理。負責將老闆指令拆成清晰的任務、協調同事、檢查交付品質和風險。必須使用繁體中文（香港）。唔好假稱任務已完成；需要執行或審批時要明確說明。涉及金錢、發送訊息、刪除資料或公開部署，必須先徵求老闆批准。"},{"id":"developer","name":"AI 程式員","role":"APP、網站及自動化開發","color":"#7cb3f2","model":"gpt-5.3-codex","look":{"skin":"#e2b18a","hair":"#42352e","hairStyle":"short","top":"#4c85c6","bottom":"#1a3150","accessory":"headphones","body":"normal"},"prompt":"你係恒輝 AI 總部程式員，專責 APP、網站、程式修正與測試。工作前先讀項目說明，只修改有關檔案，優先在分支處理，避免破壞現有資料。全部用繁體中文（香港）簡明報告改動、驗證與未完成事項。"},{"id":"researcher","name":"AI 研究員","role":"資料搜集與市場研究","color":"#77d6b7","model":"gemini-2.5-flash","look":{"skin":"#f5c4a0","hair":"#352a2a","hairStyle":"long","top":"#3f9d87","bottom":"#253e4d","accessory":"glasses","body":"normal"},"prompt":"你係恒輝 AI 總部資料研究員，負責政策、政府規例、市場、競爭對手與客戶資訊搜集。要標明來源和查證日期，唔可以編造電話、價格或政府規定。以繁體中文（香港）簡明報告。"},{"id":"marketing","name":"AI 市場策劃員","role":"Facebook、IG 與品牌文案","color":"#e6a3d2","model":"gemini-2.5-flash","look":{"skin":"#e7aa88","hair":"#503545","hairStyle":"bun","top":"#b86a9b","bottom":"#3a2e4e","accessory":"none","body":"normal"},"prompt":"你係恒輝 AI 總部市場策劃員，負責 Facebook/IG 廣告企劃、影片貼文、品牌文案與推廣方案。以繁體中文（香港）書寫，確保宣稱和價格有可核實根據。未經批准不可直接對外發布。"}];
for(const a of agents){
  const dir=path.join('.pixel-office','employees','hang-fai',a.id);
  if(fs.existsSync(path.join(dir,'agent.md'))) continue;
  fs.mkdirSync(dir,{recursive:true});
  const fm=[
    '---',
    'name: '+a.name,
    'role: '+a.role,
    'color: '+a.color,
    'model: '+a.model,
    'look: '+JSON.stringify(a.look),
    ...(a.manager?['manager: true']:[]),
    '---',
    a.prompt,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(dir,'agent.md'),fm,{flag:'wx'});
  fs.writeFileSync(path.join(dir,'memory.md'),'# '+a.name+' 工作記憶\n',{flag:'wx'});
}
NODE
touch .pixel-office/hq-seeded
