// Business-specific project workspaces: isolated conversations, boards, agent memories and cwd.
// The HQ remains the full 14-person office. Per-project teams are scoped to their own work folders.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const state=path.join(root,".pixel-office");
const configFile=path.join(state,"config.json");
fs.mkdirSync(state,{recursive:true});
let cfg={};
if(fs.existsSync(configFile)){
  try{cfg=JSON.parse(fs.readFileSync(configFile,"utf8"))}
  catch(e){throw new Error("已有辦公室設定格式有問題；為保護資料，唔會覆蓋："+e.message)}
}
const projects=[
  {id:"hang-fai",name:"🏢 Hang Fai · AI Headquarters",main:true,staff:[],
   scope:"跨部門管理、所有已授權項目總覽。不要直接混合不同客戶、品牌或商業專案的資料。"},
  {id:"bhu-housing",name:"🏗️ BHU · 簡樸房認證整改",
   staff:["manager","sales","project-manager","architectural","plumbing","electrical-fire","researcher","documentation","estimating","procurement","finance"],
   scope:"簡樸房法規、BHU 文件、PL Layout/Schematic、水電、消防、現場整改、專業核證協調、報價、CRM。原圖必須原樣鎖定，所有工程及認證須真人專業覆核。"},
  {id:"construction",name:"🔧 CONSTRUCTION · 一般工程",
   staff:["manager","sales","project-manager","architectural","plumbing","electrical-fire","estimating","procurement","finance"],
   scope:"一般建築、裝修、水電工程施工安排、材料、現場相片、工程量、報價、VO、付款與分判商；不得誤用 BHU 個案法規為所有工程的要求。"},
  {id:"derfoe",name:"🧱 DERFOE · 建材產品／B2B",
   staff:["manager","sales","marketing","researcher","procurement","estimating","finance","video"],
   scope:"DERFOE / WP550、WP551 防水產品；防鏽噴劑、免釘膠、AA/502 膠、密封膠、建材目錄、性能標準、香港供應商與 B2B 開發。核對實際規格、測試證明和批准價格。防鏽型號 B202/D202 如有衝突須查證。廣告與目錄不得擅自改品牌及原圖。"},
  {id:"driver-app",name:"🚗 CHAUFFEUR · 香港代駕 APP",
   staff:["manager","sales","marketing","developer","finance"],
   scope:"香港代駕服務 APP：目前先集中乘客版流程、定位、叫單及安全功能；既有 GitHub repo 與 Google Maps 憑證需按實際授權存取，嚴禁虛構 API Key。司機版／管理後台只可按老闆正式新指令處理。"},
  {id:"tailoring",name:"👔 BESPOKE · 訂製西裝網站",
   staff:["manager","marketing","developer","finance","video"],
   scope:"訂製西裝／個人色彩分析網站及購買流程：客戶流程要快捷直接、根據上載本人照片先分析再提供個人化建議；公開網站及報告不要出中文，設計及資訊頁面依已批准內容。不要將建築工程價錢或 DERFOE 品牌帶入此網站。"},
  {id:"marketing-studio",name:"🎬 MEDIA · 宣傳及影片",
   staff:["manager","marketing","sales","video"],
   scope:"Facebook/Instagram 貼文、品牌廣告、港式視覺、簡樸房及 DERFOE 影片分鏡、15 秒分段、粵語旁白及素材審核。影片企劃由 Gemini 影片員工專責；所有品牌需用對應專案的官方素材，不可跨品牌錯用。"}
];
const known=new Map((Array.isArray(cfg.offices)?cfg.offices:[]).map(o=>[o.id,o]));
const offices=Array.isArray(cfg.offices)?cfg.offices.slice():[];
for(const p of projects){
  const cwd=p.main?".":".pixel-office/projects/"+p.id;
  const target={id:p.id,name:p.name,cwd,employeesDir:".pixel-office/employees/"+p.id};
  if(!known.has(p.id))offices.push(target);
  if(p.main)continue;
  const dir=path.join(state,"projects",p.id);
  const staffDir=path.join(state,"employees",p.id);
  fs.mkdirSync(dir,{recursive:true}); fs.mkdirSync(staffDir,{recursive:true});
  const projectFile=path.join(dir,"PROJECT.md");
  const projectNote=[
    "# "+p.name,
    "專屬工作範圍："+p.scope,
    "工作資料、聊天、記憶、任務板均按本 office 分開；同一名字的員工在不同 office 都有獨立記憶。",
    "本工作空間只可根據本專案獲授權的資料進行工作；不得偷讀、轉移另一專案的客戶檔案、密碼或內部商業資料。",
    "所有案件至少包含：輸入、原始來源、執行職位、工作成果、核對項目、待批事項。",
    "所有 Codex 員工只有成功登入模型後先可以執行；影片員工 Gemini 亦要有效金鑰及渲染工具。",
    "跨專案共用資料前必須由老闆明確指定。專案目錄唔係隔離沙箱，存取權限仍須由系統提供者強制執行。"
  ].join("\n")+"\n";
  if(!fs.existsSync(projectFile))fs.writeFileSync(projectFile,projectNote);
  for(const id of p.staff){
    const sourceFile=path.join(state,"employees","hang-fai",id,"agent.md");
    if(!fs.existsSync(sourceFile))throw new Error("找不到總部員工 "+id+"；請先執行 seed-hang-fai.mjs");
    const content=fs.readFileSync(sourceFile,"utf8");
    const meta=content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
    if(!meta)throw new Error("員工設定缺少標頭："+id);
    const folder=path.join(staffDir,id);
    fs.mkdirSync(folder,{recursive:true});
    const agentFile=path.join(folder,"agent.md");
    const tag="## 業務專案專屬指令（系統管理）";
    const instructions=[
      tag,
      "你係 "+p.name+" 專案的專屬員工。專案標識："+p.id+"；職位代號："+id+"。",
      "專案範圍："+p.scope,
      "請先閱讀工作目錄下 PROJECT.md，再理解本專案已提供檔案及有權使用的連接。記住你在另一個 office 的同名職位並不共享客戶資料或記憶。",
      "要用繁體中文向老闆簡明匯報；訂製西裝對外網站及分析報告只能英文。",
      "採用 Agency Agents 專家角色方法，但法例要按香港官方來源查證。所有工作交付前列清楚資料來源及驗證結果。",
      "唔好虛報模型連接。付款、發訊息、公開投放、合約、政府申請、刪除和部署要取得老闆授權。",
      "未經授權絕不可從其他專案目錄複製或讀取客戶資料、敏感商業文件和登入憑證。",
      ""
    ].join("\n");
    if(fs.existsSync(agentFile)){
      const old=fs.readFileSync(agentFile,"utf8");
      const front=old.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
      if(!front)throw new Error("已有專案員工檔案損壞："+agentFile);
      const oldBody=old.slice(front[0].length).split(tag)[0].trim();
      // Preserve user-written text and frontmatter, only the managed section changes.
      const newer=front[0]+(oldBody?oldBody+"\n\n":"")+instructions;
      if(newer!==old)fs.writeFileSync(agentFile,newer);
    }else{
      fs.writeFileSync(agentFile,meta[0]+instructions);
    }
    const memory=path.join(folder,"memory.md");
    if(!fs.existsSync(memory))fs.writeFileSync(memory,"# "+p.name+" · "+id+"｜獨立工作記憶\n");
  }
}
cfg.offices=offices;
if(!cfg.locale)cfg.locale="en";
const updated=JSON.stringify(cfg,null,2)+"\n";
if(!fs.existsSync(configFile)||fs.readFileSync(configFile,"utf8")!==updated){
  const backup=configFile+".pre-multi-office.bak";
  if(fs.existsSync(configFile)&&!fs.existsSync(backup))fs.copyFileSync(configFile,backup);
  fs.writeFileSync(configFile,updated,{mode:0o600});
}
console.log("恒輝 AI 總部：已建立 "+projects.length+" 個真實獨立工作空間；HQ 14 人，其餘按專業分組。");
