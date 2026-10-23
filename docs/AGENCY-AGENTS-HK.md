# Agency Agents × 恒輝 AI 總部

**來源**：[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)，MIT License，取用日期：2026-10-22。
已閱讀 Agents Orchestrator、Civil Engineer、Senior Project Manager、Sales Proposal Strategist、Legal Compliance Checker、Supply Chain Strategist、Brand Guardian 及 Short-Video Editing Coach 模板的分工及執行規範。其餘角色按來源檔名作對應參考，未把未閱讀文件內容當已核實事實。

## 導入方式
- `scripts/seed-hang-fai.mjs` 使用公開模板**經重新整理的角色工作方法**，而非直接讓第三方 README 或任意 shell 指令成為可執行的主控指令。
- 自動建立 **14 個角色：13 Codex + 1 Gemini（影片）**；新建或更新 `.pixel-office/employees/hang-fai/<id>/agent.md`。
- 對已有員工只更新由系統管理的 SOP 區段、職稱和模型設定；保留個人 `memory.md`、原有個人資料、技能資料夾及非管理區段。
- 詳細職位映射及所借用的原則在腳本的 `agency` 對照表內，來源 URL 會寫入每位員工的 `agent.md`。
- 所有員工必須跟 `HANG-FAI-OPERATIONS.md`、香港官方規範、客戶已核實現況與老闆最後批准的圖則。外國建築、電力、消防法規僅供對比，不構成香港合規證明。
- 系統必須用真實 provider 狀態判斷是否有模型可用；角色建立成功**不代表** Codex 或 Gemini 已有登入或已完成交辦工作。

## 部門歸屬
| 部門 | 職位 | 推理模型 |
|---|---|---|
| 管理 | 01 AI 總經理 | Codex |
| 業務 | 02 客戶銷售、03 市場策劃 | Codex |
| 工程 | 04 工程項目經理、05 平面圖設計、06 水喉及排水圖、07 電力及消防圖 | Codex |
| 合規 | 08 法規合規研究、09 認證文件專員 | Codex |
| 財務供應 | 10 工程估價報價、11 採購供應商、12 財務行政 | Codex |
| 系統 | 13 AI IT 程式員 | Codex |
| 影音 | 14 AI 影片製作 | Gemini |

## 來源／限制
原作者及授權資訊以 [Agency Agents](https://github.com/msitarzewski/agency-agents) 的 LICENSE 為準；本 repo 原先的 Pixel Office LICENSE 獨立保留。

外掛、Gemini 金鑰、Codex 模型帳戶、Google／Meta 授權不是 Agency Agents 裡面的內容，不會因為下載角色模板而自動取得。禁止將過往聊天裡可能存在的密碼複製到 Git、員工 prompt 或記憶檔。
