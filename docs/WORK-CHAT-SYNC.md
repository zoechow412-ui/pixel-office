# 工作對話進度連接

現有 office 已還原至像素人物及原本互動動畫。CEO 跟進、財務快照、統一主持會議及工作台保留。

`scripts/watch-chat-progress.mjs` 只監看啟動時明確指定的一個 Codex JSONL 對話記錄，將開始、工具操作、完成回覆及中斷事件轉成 working、done、blocked。不輸出聊天文字、工具參數、電郵、客戶資料或憑證。網站每兩秒讀取 `web/work-status.json`，不呼叫模型。狀態檔已列入 gitignore，超過半小時未更新便隱藏。

本機已啟動此專案對話的監看程序。這是本對話的生命週期連接，並非所有 ChatGPT App 對話／Projects 的通用同步，也不表示人物獨立執行了外部操作。監看程序在電腦關閉後需要重新啟動；正式 Vercel 站點尚未接此本機檔案。
