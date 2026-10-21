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
   scope:"Facebook/Instagram 貼文、品牌廣告、港式視覺、簡樸房及 DERFOE 影片分鏡、15 秒分段、粵語旁白及素材審核。影片企劃由 Gemini 影片員工專責；所有品牌需用對應專案的官方素材，不可跨品牌錯用。"},
  {id:"unibright-ops",name:"📊 UNIBRIGHT OPS · 工程CRM及報價系統",
   staff:["manager","developer","project-manager","estimating","finance","sales"],
   scope:"UNIBRIGHT Ops：工程項目進度、客戶跟進、工程報價、發票、收款、收據PDF、可編輯價格目錄及價格歷史；如系統使用 Supabase 只能透過授權連接，禁止複製歷史密碼。"},
  {id:"bhu-plan-ai",name:"📐 BHU DESIGN · AI平面圖工具",
   staff:["manager","developer","architectural","plumbing","electrical-fire","researcher"],
   scope:"專屬簡樸房AI初步間隔設計助手：上載平面圖／尺寸／照片，對比A／B／C方案及面積、水電、通風標記，串連收費視察與工程估價；不得改動客戶最後確認的水喉路線，草圖不是持牌圖則。"},
  {id:"wp-waterproof",name:"💧 WP550 / WP551 · 防水產品認證",
   staff:["manager","researcher","procurement","estimating","sales","marketing"],
   scope:"WP550 有機矽納米防水塗料、WP551／RWH551 防輻射隔熱防水塗料；產品性能、TDS、CIC Green Product Certification、測試報價、香港對標價、產品測試和認證時程。只認可可核查檢測報告。"},
  {id:"firestop-ssn391",name:"🔥 SS-N391 · 防火填縫膠測試",
   staff:["manager","researcher","documentation","procurement","sales","estimating"],
   scope:"SS-N391 防火矽酮填縫膠石膏板直線縫防火測試；BS476／EN1366-4比較、2／3／4小時測試條件、牆體構造、HOKLAS及香港接受程度、測試實驗室報價和跟進。測試未完成不得自稱通過標準。"},
  {id:"adhesives-b2b",name:"🧴 GLUE · 超能膠／免釘／防鏽批發",
   staff:["manager","sales","marketing","researcher","procurement","estimating","finance"],
   scope:"香港 B2B 超能膠／AA膠／502膠、免釘膠、滲透除鏽潤滑劑批發；日本城、五金店、文具店、淘多多、文具佬等渠道開發，針對每間公司形成電郵、WhatsApp及電話方案；採購聯絡、產品利益和批准價格必須核實。"},
  {id:"estate-agency",name:"🗺️ AGENT OUTREACH · 地產代理／舊樓名單",
   staff:["manager","sales","marketing","researcher","developer"],
   scope:"香港 EAA 持牌地產代理名單、舊樓派信箱傳單、分區掃街及Google My Maps路線；不包括公屋、豪宅及私人屋苑。紀錄實際見客及派發進度、員工路線、回訪，不能捏造聯絡人。"},
  {id:"community-housing",name:"🤝 COMMUNITY · 簡樸房社區合作",
   staff:["manager","sales","marketing","researcher","documentation"],
   scope:"社區簡樸房業主支援計劃、舊樓樓宇安全及罰款風險講座、策劃師學會合作、深水埗社區客廳／民政處／機構合作、諮詢及合規整改轉介。區分外部機構正式合作與僅初步洽談，不可虛構官方背書。"},
  {id:"social-publishing",name:"📣 SOCIAL · FB／IG每日自動貼文",
   staff:["manager","marketing","researcher","video","developer"],
   scope:"恒輝建築 Facebook/Instagram 自動營銷：每日政策及市場研究、教育貼文、視頻貼文、素材、Hashtags、排期、Metricool或其他授權工具。發佈前必須獲老闆批准；未授權無法宣稱自動發佈已生效。"},
  {id:"supcon-adhesive",name:"🏭 SUPCON · 工程膠／物料供應",
   staff:["manager","sales","researcher","procurement","estimating","finance"],
   scope:"SUPCON ADHESIVE (HK) LIMITED／信粵膠業（香港）有限公司產品與工業／大型工程物料供應；結構密封、表面絕緣保護、功能塗層、工程膠黏劑、供應商合作、工程標書、品質證明。與 DERFOE 品牌資料及報價分開。"},
  {id:"unibright-web",name:"🌐 UNIBRIGHT WEB · 公司官網及線上預約",
   staff:["manager","developer","marketing","sales","architectural"],
   scope:"恒輝官網 unibright.com.hk、網上收費及免責訊息、工程資格、客戶查詢、簡樸房快速初評、視察預約、工程案例及品牌素材；真實上線部署及操作前需要經授權。"},
  {id:"the-point",name:"🍽️ THE POINT · Restaurant & Bar",
   staff:["manager","sales","marketing","finance","video"],
   scope:"The Point Restaurant & Bar：OpenRice商戶資料、菜單、餐飲宣傳、香港真實感招牌字體、食物海報、優惠與營銷。尚未核實是否仍由同一團隊經營；不寫入任何未核實訂單或經營數據。"},
  {id:"fnb-proposal",name:"🥢 F&B PITCH · 餐飲商業提案",
   staff:["manager","marketing","finance","estimating"],
   scope:"餐飲商業提案及港式菜式宣傳設計：更新PPT可實現的字體、色彩、食物視覺、標誌與商業論證；此工作區保留獨立於 The Point 餐廳，品牌對應待核實。"},
  {id:"daan-daan-catering",name:"🥣 啖啖燕窩 · 餐飲／到會",
   staff:["manager","sales","marketing","finance","video"],
   scope:"啖啖燕窩餐飲／到會菜式、菜單、定價、宣傳及套餐；歷史項目，最新經營狀態及產品供應需先查證；與建築工程及餐廳企劃分開記錄。"},
  {id:"newgen-ivf",name:"🧬 NEWGEN IVF · FDA／MicroSort",
   staff:["manager","researcher","documentation","finance","marketing"],
   scope:"NewGen IVF Group相關 MicroSort FDA申報／監管研究，IDE、Pre-Sub、IRB、設備安全及品質體系文件。屬過往曾處理的專案，實際目前授權／進度要確認；不可載入私人醫療個案資料，也不能將法規草稿當監管建議。"},
  {id:"newgensup",name:"💊 NEWGENSUP · 保健品品牌",
   staff:["manager","sales","marketing","researcher","procurement","finance"],
   scope:"NewGenSup 保健食品品牌與多款SKU（如 Liver Care、Multivit 40+、Longevis、Gutvita 等），產品架構、電商資料、廣告文案及成分標籤；既往項目，最新產品和法定標示需重新確認。禁止醫療療效誇大。"},
  {id:"dod-biotech",name:"🧾 DOD BIOTECH · 保健品貿易文件",
   staff:["manager","researcher","documentation","procurement","sales"],
   scope:"DOD Biotech／泰國保健品17款產品的跨境貿易資料、製造商/Free Sale/Ingredient證明、GMP/HACCP/ISO、配方與標籤表格；歷史文件專案，依實際有效證書，不得虛構產品認證。"},
  {id:"ocean-infinity",name:"🎪 OCEAN INFINITY · 活動策劃",
   staff:["manager","marketing","sales","finance","video"],
   scope:"OCEAN INFINITY COMPANY LIMITED 活動策劃品牌、金色Logo與活動企劃；歷史品牌專案，最新營運情況待確認，所有Logo改動以最後批准版本為準。"},
  {id:"plumbing-drawings",name:"🚰 PL DRAWINGS · 水喉排水技術圖",
   staff:["manager","project-manager","architectural","plumbing","researcher","documentation"],
   scope:"獨立處理 PL Layout、PL Schematic、來水／排水、水錶／閘、廁所／洗手盆及施工符號。只能按客戶最後確認底圖畫線，絕不可私自增加或改動路線；每間房、器具、支管均逐項對照。正式圖則由合資格人士審核。"},
  {id:"electrical-fire-plans",name:"⚡ M&E DESIGN · 電力消防圖",
   staff:["manager","project-manager","architectural","electrical-fire","researcher","documentation"],
   scope:"獨立管理電力單線圖、分錶、電箱／接地、消防系統、防火門／防煙防火、WR1 及規格認證；與水喉圖分開原稿及審核版本。持牌電工及合資格人士負責檢驗和簽署。"},,,
  {id:"rust-products",name:"🛠️ RUST CARE · 防鏽噴劑銷售",
   staff:["manager","sales","marketing","researcher","procurement","estimating","finance","video"],
   scope:"DERFOE SC-B202／D202 防鏽、除鏽、滲透潤滑油的 450ml 規格、測試證明、供應渠道、批發報價、香港五金目標客戶與廣告影片。B202／D202 可能屬不同型號，未核實前不得合併成一個 SKU。"},
  {id:"b2b-sales-leads",name:"📈 B2B SALES · 香港批發客戶開發",
   staff:["manager","sales","marketing","researcher","procurement","finance"],
   scope:"公司名單、採購部電話／公開電郵、香港供應商／渠道、淘多多／文具佬／五金店等潛在客戶、官網來源、排序、正式報價與一店一封開發郵件。保持供應產品區分，發送前需要老闆明確審批。"},
  {id:"derfoe-brand-site",name:"🌐 DERFOE · 官網及產品目錄",
   staff:["manager","marketing","researcher","developer","procurement","video"],
   scope:"DERFOE 品牌官網 derfoe.hk、產品目錄 15-17 頁、WP550／WP551、SS、LN-01、502、N382 等產品資料、印刷配色、港式高級工程視覺、正確 Logo、SSL／SEO 與網頁部署。網站素材須遵守品牌原稿，不可假造產品圖或認證。"},
  {id:"building-supply",name:"🏭 MATERIALS · 建材採購／招標",
   staff:["manager","sales","project-manager","researcher","procurement","estimating","finance"],
   scope:"工程化學品、建材規格、供應商、香港工程項目／基建物料採購、公開招標條件、測試標準、材料檢驗、送貨及比較報價。高壓絕緣／納米材料只在有真實 TDS 時研究；不得聲稱已投標或通過測試。"},,
  {id:"ai-office-platform",name:"🤖 AI OFFICE · 系統開發及連線",
   staff:["manager","developer","researcher","finance"],
   scope:"Pixel Office／GitHub zoechow412-ui/pixel-office、14 AI 員工、Codex 與 Gemini 影片、部門座位、任務板、真正模型登入、登入保護、持久化及 Vercel／Railway 部署。以可用性驗收，嚴禁將角色圖像顯示當成模型已連線。"},
  {id:"private-book-art",name:"📖 PRIVATE · 書本章節插畫",
   staff:["manager","architectural","marketing","video"],
   scope:"私人長篇故事／書本封面與逐章情節插畫、人物形象、完整內文查證、按章節情節出圖及封面排版。此區屬私人創作、不是恒輝建築或 DERFOE 業務；不得自動分享書稿、人物照片或敏感私人內容予商業專案。"}
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
      // Synchronize the staff's approved English first name, while preserving
      // per-project custom settings, conversation history, notes and memory.
      const sourceName=meta[0].match(/^name:\s*(.+)$/m);
      if(!sourceName)throw new Error("總部員工欠缺名稱："+id);
      const namedHeader=front[0].replace(/^name:.*$/m,"name: "+sourceName[1]);
      const newer=namedHeader+(oldBody?oldBody+"\n\n":"")+instructions;
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
console.log("恒輝 AI 總部：已核對 "+projects.length+" 個獨立工作空間（含 HQ）；13 Codex 專業員工與 Gemini 影片職位按所屬專案分組。");
