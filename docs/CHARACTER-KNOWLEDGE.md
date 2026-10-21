# 人物專屬專案知識

更新日期：2026-10-22（香港）

## 使用方式

在總部直接按人物對話。人物按同一職位在各業務專案的成員資格，讀取所屬專案背景、同職位記憶，以及 `sources/` 的來源摘要；毋須先切換專案。總部總經理可以涵蓋所有獲分配的業務專案。進入單一專案後，該專案人物仍只讀取該專案的資料。

對話標題下的「人物知識」顯示實際可讀專案及來源數，展開可核對來源摘要。沒有來源的專案會明確標示歷史對話／原檔未接入。專案入口、摘要、原稿及實際模型回覆是不同驗收項目。

## 資料與保護

- `character-knowledge.ts` 在模型建立提示時讀取資料，供既有 Codex、Gemini 及其他引擎沿用，並非純介面裝飾。
- 只讀取已分配職位的專案。沿用原本每個專案的工作目錄、board、歷史對話及記憶，不互相搬走或覆蓋。
- `PROJECT.md`、同職位 `memory.md` 及 `sources/*.md` 有大小上限。來源目錄／檔案不跟隨符號連結；不讀 `.env`。常見金鑰及憑證賦值會遮蔽。
- 每次建立提示都重讀來源，不需要再次聘請或重建人物。來源材料視為資料，不視為新的執行授權。
- 圖片及產品原稿放在 `sources/originals/`；來源摘要應記錄檔名、來源、接入日期、SHA256及待核實項目。不要用AI重畫原Logo、圖則或產品圖。
- 私人來源、客戶資料、原稿與運行時產生的 `.claude/agents/` 不提交 Git。部署前要經受保護渠道搬運私人資料；只部署 Git 程式不會自動帶走這些資料。
- 有來源摘要不等於完整 ChatGPT 專案已匯入。歷史助理的完成宣稱、舊價、法規及公網狀態必須另外核對。

## 本機驗證

`test-character-knowledge.mjs` 覆蓋職位分配、總部跨專案知識、單專案範圍、個人職位記憶、來源更新即時重讀及憑證排除。OAuth 測試另行驗證重啟、PKCE及一次性callback；這不等於修復外部 OpenAI Developers 連接器的登入 session。

## 正式部署仍需完成

現有長期員工進程及 filesystem store 仍須遷移為可持久執行架構。不能將此版本直接當成無狀態Vercel Functions已完成遷移。

建議保留既有UI與角色，採用 Vercel API/WebSocket 入口、Postgres 任務／事件／角色記憶、私有 Blob 原稿，以及 Workflow 或有租約的任務worker。Codex/Gemini的shell工作須在隔離任務環境執行；永久資料由資料庫與私有原稿儲存保存。任務需有idempotency key、可續傳事件序號、重試與取消狀態，寫入成功後才回報完成。

Services及Container Runtime目前為Beta。Vercel WebSocket已可用，但達到Function最大執行時限會斷線，客戶端必須重連並補讀持久事件；Container及Daemons的本地檔案不能當持久Volume。現有 `OAuthFlows` 檔案store在有持久檔案系統下可跨程序重啟；多個Vercel instance需換成共享、原子consume的state store。

資料來源（查閱：2026-10-22）：

- https://vercel.com/docs/services
- https://vercel.com/docs/functions/websockets
- https://vercel.com/docs/functions/runtimes/container
- https://vercel.com/docs/daemons
- https://developers.openai.com/api/docs/models/gpt-5.3-codex

尚未通過正式站點登入、Codex/Gemini真實回覆、跨雲端重啟持久化及手機公網驗收，不能宣稱正式上線。
