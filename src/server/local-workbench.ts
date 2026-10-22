import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { Index } from "flexsearch";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { zipSync, unzipSync } from "fflate";
import { createWorker } from "tesseract.js";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { writeJsonAtomicSync, readJsonSafe } from "./fsutil.js";
import type { Board } from "./board.js";

interface Office { id: string; name: string; cwd: string; board: Board }
interface Event { id: string; title: string; at: string; owner: string; kind: string; task?: number; done: boolean }
interface Draft { id: string; to: string; subject: string; text: string; updated: string; sentAt?: string; reviewedHash?: string }
interface LocalData { events: Event[]; drafts: Draft[]; documents: Array<{name:string;text:string;at:string;file?:string}>; imports?:Array<{id:string;subject:string;at:string}> }
function fail(s: string): never { throw new Error(s); }
const inside = (root:string, target:string) => target.startsWith(root + path.sep);
const cents = (v: unknown): bigint => {
  const s=String(v ?? "0").trim(); if(!/^\d{1,10}(\.\d{1,2})?$/.test(s))fail("金額須為非負數，最多兩位小數");
  const [a,b=""]=s.split(".");return BigInt(a)*100n+BigInt(b.padEnd(2,"0"));
};
export function calculateQuote(body: any) {
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>100)fail("請輸入 1 至 100 個項目");
  const lines=body.items.map((x:any)=>{
    if(x.qty===undefined||x.rate===undefined||String(x.qty).trim()===""||String(x.rate).trim()==="")fail("數量與單價必填；待核數字不能當零");
    const q=String(x.qty??"1");if(!/^\d{1,7}(\.\d{1,3})?$/.test(q))fail("數量最多三位小數");
    const [a,b=""]=q.split("."), units=BigInt(a)*1000n+BigInt(b.padEnd(3,"0"));
    const rate=cents(x.rate), total=(units*rate+500n)/1000n;
    return {description:String(x.description??"").slice(0,200),qty:q,rate:Number(rate)/100,total:Number(total)/100};
  });
  const subtotal=lines.reduce((s:number,x:any)=>s+Math.round(x.total*100),0);
  if(!Number.isSafeInteger(subtotal))fail("總額過大");
  const discount=cents(body.discount??0);if(discount>BigInt(subtotal))fail("折扣不可大於小計");
  const total=subtotal-Number(discount), paid=Number(cents(body.paid??0));
  if(paid>total)fail("已收金額不可大於總額");
  return {items:lines,subtotal:subtotal/100,discount:Number(discount)/100,total:total/100,paid:paid/100,due:(total-paid)/100,currency:"HKD",draft:true};
}

export function backupFiles(roots: Array<{label:string;dir:string}>) {
  const entries:Record<string,Uint8Array>={}, hashes:Record<string,string>={};let size=0,count=0;
  const denied=/(^|[._-])(secrets?|credentials?|auth|tokens?|integrations?|providers?|lock|pid)([._-]|$)|^\.env/i;
  for(const root of roots){
    if(!fs.existsSync(root.dir))continue;
    const base=fs.realpathSync(root.dir);
    const walk=(dir:string)=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      if(ent.isSymbolicLink()||denied.test(ent.name)||["node_modules",".git",".claude-plugin","worktrees","_archive"].includes(ent.name))continue;
      const f=path.join(dir,ent.name);if(ent.isDirectory()){walk(f);continue;}
      if(!ent.isFile()||!inside(base,fs.realpathSync(f)))continue;
      const st=fs.statSync(f);size+=st.size;if(size>100*1024*1024||++count>15000)fail("備份超過 100MB 或檔案數上限");
      const key=root.label+"/"+path.relative(base,f).split(path.sep).join("/"),buf=fs.readFileSync(f);
      entries[key]=buf;hashes[key]=crypto.createHash("sha256").update(buf).digest("hex");
    }};walk(base);
  }
  entries["manifest.json"]=Buffer.from(JSON.stringify({version:1,at:new Date().toISOString(),hashes},null,2));
  const archive=zipSync(entries,{level:6});
  verifyBackup(archive);return {archive,count,bytes:size};
}
export function verifyBackup(bytes:Uint8Array) {
  const files=unzipSync(bytes),manifest=JSON.parse(Buffer.from(files["manifest.json"]).toString());
  for(const [name,hash] of Object.entries(manifest.hashes)){
    if(name.includes("..")||name.startsWith("/")||!files[name]||crypto.createHash("sha256").update(files[name]).digest("hex")!==hash)fail("備份校驗失敗");
  }return Object.keys(manifest.hashes).length;
}

export function localDocuments(o:Office,ctx:{root:string;dataDir:string}) {
  const load=(o:Office)=>readJsonSafe<LocalData>(path.join(ctx.dataDir,o.id,"local-workbench.json"),()=>({events:[],drafts:[],documents:[]}));
    const result:Array<{name:string;text:string}>=[];
    const roots=[{name:"sources",dir:path.join(o.cwd,"sources")},{name:"deliverables",dir:path.join(o.cwd,".pixel-office","deliverables")}];
    if(o.id==="hang-fai"&&!roots.some(r=>path.resolve(r.dir)===path.resolve(ctx.root,"deliverables")))roots.push({name:"hq-deliverables",dir:path.join(ctx.root,"deliverables")});
    const add=(name:string,file:string)=>{if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>512000)return;result.push({name,text:fs.readFileSync(file,"utf8")});};
    for(const f of ["PROJECT.md","HANG-FAI-OPERATIONS.md"])add(f,path.join(o.cwd,f));
    for(const root of roots){
      if(!fs.existsSync(root.dir)||fs.lstatSync(root.dir).isSymbolicLink())continue;const base=fs.realpathSync(root.dir);
      const walk=(dir:string)=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
        if(ent.isSymbolicLink()||result.length>=1000)continue;const f=path.join(dir,ent.name);
        if(!inside(base,fs.realpathSync(f)))continue;
        if(ent.isDirectory())walk(f);else if(/\.(md|txt|csv)$/i.test(ent.name))add(root.name+"/"+path.relative(root.dir,f).split(path.sep).join("/"),f);
      }};walk(base);
    }
    result.push(...load(o).documents.map(d=>({name:"uploads/"+d.name,text:d.text})));
    for(const n of o.board.notes)result.push({name:"shared-note/"+n.id+" "+n.title,text:n.text});
    return result;
}

export function registerLocalWorkbench(app:Express, ctx:{root:string;dataDir:string;offices:()=>Office[]}) {
  const stateFile=(o:Office)=>path.join(ctx.dataDir,o.id,"local-workbench.json");
  const load=(o:Office)=>readJsonSafe<LocalData>(stateFile(o),()=>({events:[],drafts:[],documents:[]}));
  const save=(o:Office,d:LocalData)=>writeJsonAtomicSync(stateFile(o),d);
  const api=(method:"get"|"post"|"put",route:string,handler:(req:Request,res:Response,o:Office)=>any)=>{
    app[method]("/api/offices/:office/local/"+route,async(req,res)=>{
      const o=ctx.offices().find(x=>x.id===String(req.params.office));if(!o){res.status(404).json({error:"專案不存在"});return;}
      try{await handler(req,res,o);}catch(err){res.status(400).json({error:(err as Error).message});}
    });
  };
  const docs=(o:Office)=>localDocuments(o,ctx);
  api("get","search",(req,res,o)=>{
    const q=String(req.query.q??"").trim().slice(0,120);if(q.length<2)fail("請輸入至少兩個字");
    const documents=docs(o),index=new Index({tokenize:"forward"});
    documents.forEach((d,i)=>index.add(i,d.name+" "+d.text));
    const matches=new Set(index.search(q,{limit:40}).map(Number));
    // Exact CJK substring fallback complements tokenized search without embeddings.
    documents.forEach((d,i)=>{if((d.name+" "+d.text).toLocaleLowerCase().includes(q.toLocaleLowerCase()))matches.add(i);});
    res.json({query:q,indexed:documents.length,results:[...matches].slice(0,40).map(i=>{const d=documents[i],at=d.text.toLowerCase().indexOf(q.toLowerCase());return {source:d.name,excerpt:d.text.slice(Math.max(0,at-70),Math.max(0,at-70)+500)};})});
  });
  api("post","documents",(req,res,o)=>{
    const name=String(req.body.name??"").normalize("NFKC");const text=String(req.body.text??"");
    if(!name||name.length>140||/[\\/\x00-\x1f]/.test(name)||!text||text.length>200000)fail("檔名或內容無效");
    const d=load(o);if(d.documents.length>=200)fail("文件數已達上限");if(d.documents.some(x=>x.name===name))fail("同名文件已存在，請改版本名");
    d.documents.push({name,text,at:new Date().toISOString()});save(o,d);res.json({saved:true,name});
  });
  api("post","documents/pdf",async(req,res,o)=>{
    const name=String(req.body.name??"").normalize("NFKC"),raw=Buffer.from(String(req.body.pdf??""),"base64");
    if(!name.endsWith(".pdf")||name.length>140||/[\\/\x00-\x1f]/.test(name)||raw.length>4*1024*1024||!raw.subarray(0,5).equals(Buffer.from("%PDF-")))fail("只接受 4MB 內 PDF");
    const d=load(o);if(d.documents.length>=200||d.documents.some(x=>x.name===name))fail("同名文件已存在或已達上限，請改版本名");
    const {getDocument}=await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task=getDocument({data:new Uint8Array(raw),useSystemFonts:false,disableFontFace:true});
    let text="",pages=0;
    try{const doc=await task.promise;pages=doc.numPages;if(pages>30)fail("每次匯入上限 30 頁");
      for(let i=1;i<=pages;i++){const page=await doc.getPage(i),content=await page.getTextContent();text+=`\n第 ${i} 頁\n`+content.items.map(x=>"str" in x?x.str:"").join(" ");}
    }finally{await task.destroy();}
    if(text.replace(/第 \d+ 頁/g,"").trim().length<3)fail("此 PDF 未有可抽取文字，請先將掃描頁轉成圖片做本機辨識");
    if(text.length>200000)fail("文字超過 20 萬字，請分開匯入");
    const id=crypto.randomUUID()+".pdf",dir=path.join(ctx.dataDir,o.id,"documents");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,id),raw,{flag:"wx",mode:0o600});
    d.documents.push({name,text,at:new Date().toISOString(),file:id});save(o,d);res.json({saved:true,name,pages,characters:text.length,originalPreserved:true});
  });
  api("get","documents/file",(req,res,o)=>{
    const d=load(o).documents.find(d=>d.name===String(req.query.name));if(!d?.file||!/^[a-f0-9-]{36}\.pdf$/.test(d.file))fail("原檔不存在");
    const file=path.join(ctx.dataDir,o.id,"documents",d.file);if(fs.lstatSync(file).isSymbolicLink())fail("原檔路徑無效");res.download(file,d.name);
  });
  api("post","quote",(req,res)=>res.json(calculateQuote(req.body)));
  api("post","quote.pdf",async(req,res)=>{
    const q=calculateQuote(req.body),pdf=await PDFDocument.create();
    pdf.registerFontkit({create:(data:Uint8Array)=>{const f:any=fontkit.create(data);return f.fonts?.[0]??f;}} as any);
    const fontPath=process.env.PIXEL_OFFICE_PDF_FONT??"C:/Windows/Fonts/msjh.ttc";
    if(!fs.existsSync(fontPath))fail("未設定繁體中文字體，未產生 PDF");
    // fontkit collections need selecting a face before pdf-lib can subset them.
    const bytes=fs.readFileSync(fontPath);
    const font=await pdf.embedFont(bytes,{subset:true});
    let page=pdf.addPage([595,842]),y=790;
    const line=(s:string,size=11)=>{if(y<55){page=pdf.addPage([595,842]);y=790;}page.drawText(s,{x:42,y,size,font,color:rgb(.12,.17,.24)});y-=23;};
    line("恒輝｜報價核算草稿（內部覆核）",17);line("此草稿不取代原報價單、Logo 或正式合約。",10);
    line("參考："+String(req.body.reference??"未填寫").slice(0,45));
    q.items.forEach((x:any,i:number)=>{line(`${i+1}. ${x.description.slice(0,30)}`);line(`數量 ${x.qty} × HK$${x.rate.toFixed(2)} = HK$${x.total.toFixed(2)}`);});
    for(const [k,label] of [["subtotal","小計"],["discount","折扣"],["total","總額"],["paid","已收"],["due","尚欠"]] as const)line(`${label}：HK$${q[k].toFixed(2)}`);
    line("產生時間："+new Date(Date.now()+8*3600000).toISOString().slice(0,16).replace("T"," ")+" HKT",9);
    const buf=await pdf.save();res.type("application/pdf").setHeader("Content-Disposition",'attachment; filename="quote-review.pdf"');res.send(Buffer.from(buf));
  });
  api("get","calendar",(_req,res,o)=>res.json({events:load(o).events,now:new Date().toISOString()}));
  api("post","calendar",(req,res,o)=>{
    const b=req.body,title=String(b.title??"").trim(),at=String(b.at??""),owner=String(b.owner??"");
    if(!title||title.length>150||!Number.isFinite(Date.parse(at)))fail("請輸入標題及有效日期");
    const d=load(o);if(d.events.length>=2000)fail("日程數量達上限");
    const event:Event={id:crypto.randomUUID(),title,at:new Date(at).toISOString(),owner:owner.slice(0,80),kind:String(b.kind??"跟進").slice(0,30),done:false};
    if(b.task!==undefined){if(!o.board.tasks.some(t=>t.id===Number(b.task)))fail("任務不存在");event.task=Number(b.task);}
    d.events.push(event);save(o,d);res.json(event);
  });
  api("put","calendar/:id",(req,res,o)=>{const d=load(o),e=d.events.find(e=>e.id===req.params.id);if(!e)fail("日程不存在");e.done=req.body.done===true;save(o,d);res.json(e);});
  api("get","reminders",(_req,res,o)=>{
    const now=Date.now(),events=load(o).events;
    res.json({checkedAt:now,modelCalls:0,items:[...events.filter(e=>!e.done&&Date.parse(e.at)<=now+86400000).map(e=>({id:e.id,title:e.title,owner:e.owner,reason:Date.parse(e.at)<now?"已逾期":"24 小時內到期",at:e.at})),...o.board.tasks.filter(t=>t.status!=="done"&&(t.status==="blocked"||t.status==="review"||now-t.updated>86400000)).map(t=>({id:"task:"+t.id,title:t.title,owner:t.owner,reason:t.status==="blocked"?"工作受阻":t.status==="review"?"待審核":"超過一天未更新",at:new Date(t.updated).toISOString()}))]});
  });
  const backupDir=path.join(ctx.root,"backups");fs.mkdirSync(backupDir,{recursive:true});
  const backup=()=>{
    const result=backupFiles(["employees","projects","data","deliverables"].map(label=>({label,dir:path.join(ctx.root,label)})));
    const name="office-"+new Date().toISOString().replace(/[:.]/g,"-")+".zip";fs.writeFileSync(path.join(backupDir,name),result.archive,{flag:"wx",mode:0o600});
    return {name,files:result.count,bytes:result.archive.length,verified:true};
  };
  api("get","backups",(_req,res)=>res.json({scope:"全部工作空間",files:fs.readdirSync(backupDir).filter(n=>/^office-[\w-]+\.zip$/.test(n)).sort().reverse().map(name=>({name,bytes:fs.statSync(path.join(backupDir,name)).size}))}));
  api("post","backups",(_req,res)=>res.json(backup()));
  api("get","backups/:name",(req,res)=>{
    const name=String(req.params.name);if(!/^office-[\w-]+\.zip$/.test(name))fail("備份名稱無效");
    const f=path.join(backupDir,name);if(!fs.existsSync(f)||fs.lstatSync(f).isSymbolicLink())fail("備份不存在");verifyBackup(fs.readFileSync(f));res.download(f,name);
  });
  const daily=()=>{try{const last=fs.readdirSync(backupDir).filter(n=>/^office-[\w-]+\.zip$/.test(n)).sort().at(-1);if(!last||Date.now()-fs.statSync(path.join(backupDir,last)).mtimeMs>86400000)backup();}catch{console.error("Local backup failed; inspect the backup panel.");}};
  setTimeout(daily,2000).unref();setInterval(daily,3600000).unref();
  let ocrBusy=false;
  api("post","ocr",async(req,res,o)=>{
    if(ocrBusy)fail("本機文字辨識進行中，請稍後再試");
    const encoded=String(req.body.image??"");if(!/^data:image\/(png|jpeg);base64,/.test(encoded))fail("只接受 PNG 或 JPEG 圖片");
    const image=Buffer.from(encoded.split(",")[1],"base64");if(image.length>4*1024*1024)fail("圖片上限 4MB");
    ocrBusy=true;let worker:Awaited<ReturnType<typeof createWorker>>|undefined;
    try{const dir=path.join(ctx.root,"ocr");fs.mkdirSync(dir,{recursive:true});worker=await createWorker("chi_tra+eng",1,{cachePath:dir,logger:()=>{}});const r=await worker.recognize(image);res.json({text:r.data.text,confidence:r.data.confidence,reviewRequired:true,office:o.id});}
    finally{if(worker)await worker.terminate();ocrBusy=false;}
  });
  const mailCfg=()=>({imap:!!(process.env.OFFICE_IMAP_HOST&&process.env.OFFICE_MAIL_USER&&(process.env.OFFICE_MAIL_PASSWORD||process.env.OFFICE_MAIL_ACCESS_TOKEN)),smtp:!!(process.env.OFFICE_SMTP_HOST&&process.env.OFFICE_MAIL_USER&&(process.env.OFFICE_MAIL_PASSWORD||process.env.OFFICE_MAIL_ACCESS_TOKEN))});
  const mailAuth=()=>process.env.OFFICE_MAIL_ACCESS_TOKEN?{user:process.env.OFFICE_MAIL_USER!,accessToken:process.env.OFFICE_MAIL_ACCESS_TOKEN}:{user:process.env.OFFICE_MAIL_USER!,pass:process.env.OFFICE_MAIL_PASSWORD!};
  const head=(s:unknown)=>String(s??"").replace(/[\r\n\x00]/g," ").slice(0,200);
  api("get","mail",(_req,res,o)=>{const d=load(o);res.json({connection:mailCfg(),drafts:d.drafts,imports:d.imports??[],mode:"寄出前逐封審閱；無自動寄信"});});
  const parseMail=async(raw:Buffer)=>{
    const p=await simpleParser(raw);
    return {subject:p.subject??"未填主旨",from:p.from?.text??"",text:p.text??"",attachments:p.attachments.map((a,i)=>({id:i,name:a.filename??"attachment",type:a.contentType,bytes:a.size,base64:a.content.toString("base64")}))};
  };
  const importMail=async(o:Office,raw:Buffer)=>{
    const p=await parseMail(raw),d=load(o),id=crypto.randomUUID(),at=new Date().toISOString();
    if(d.documents.length>=200)fail("文件數已達上限");
    const dir=path.join(ctx.dataDir,o.id,"mail-imports");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,id+".eml"),raw,{mode:0o600,flag:"wx"});
    d.documents.push({name:"mail-"+id+".txt",text:[p.subject,p.from,p.text].join("\n\n").slice(0,200000),at});
    (d.imports??=[]).push({id,subject:p.subject,at});save(o,d);return {...p,importId:id};
  };
  api("get","mail/imports/:id",async(req,res,o)=>{
    const id=String(req.params.id);if(!/^[a-f0-9-]{36}$/.test(id)||!load(o).imports?.some(x=>x.id===id))fail("郵件不存在");
    const file=path.join(ctx.dataDir,o.id,"mail-imports",id+".eml");if(fs.lstatSync(file).isSymbolicLink())fail("郵件路徑無效");res.json(await parseMail(fs.readFileSync(file)));
  });
  api("post","mail/sync",async(_req,res,o)=>{
    if(o.id!=="hang-fai")fail("只有總部秘書可同步原郵箱");if(!mailCfg().imap)fail("未有可供網站使用的郵箱連線憑證；ChatGPT Gmail 連接不會自動授予本機網站。可先匯入 .eml，毋須重新登入。");
    const client=new ImapFlow({host:process.env.OFFICE_IMAP_HOST!,port:993,secure:true,auth:mailAuth(),logger:false,socketTimeout:20000});
    try{await client.connect();const lock=await client.getMailboxLock("INBOX");try{const count=client.mailbox&&client.mailbox.exists||0;const messages=[];if(count)for await(const m of client.fetch(`${Math.max(1,count-29)}:*`,{envelope:true,uid:true,flags:true}))messages.push({uid:m.uid,subject:m.envelope?.subject??"",from:m.envelope?.from?.map(x=>x.address).join(", "),date:m.envelope?.date});res.json({messages,syncedAt:new Date().toISOString()});}finally{lock.release();}}finally{await client.logout().catch(()=>{});}
  });
  api("post","mail/import",async(req,res,o)=>{
    const raw=Buffer.from(String(req.body.eml??""),"base64");if(!raw.length||raw.length>4*1024*1024)fail("郵件上限 4MB");
    // Never render mail HTML or fetch remote tracking images.
    res.json(await importMail(o,raw));
  });
  api("post","mail/messages/:uid",async(req,res,o)=>{
    if(o.id!=="hang-fai"||!mailCfg().imap)fail("未接通網站 IMAP");const uid=String(req.params.uid);if(!/^\d{1,12}$/.test(uid))fail("郵件編號無效");
    const client=new ImapFlow({host:process.env.OFFICE_IMAP_HOST!,port:993,secure:true,auth:mailAuth(),logger:false,socketTimeout:20000});
    try{await client.connect();const lock=await client.getMailboxLock("INBOX");try{
      const meta=await client.fetchOne(uid,{size:true},{uid:true});if(!meta||!meta.size||meta.size>4*1024*1024)fail("郵件不存在或超過 4MB");
      const m=await client.fetchOne(uid,{source:true},{uid:true});if(!m||!m.source)fail("未能讀取郵件");res.json(await importMail(o,m.source));
    }finally{lock.release();}}finally{await client.logout().catch(()=>{});}
  });
  api("post","mail/drafts",(req,res,o)=>{
    const b=req.body,to=head(b.to),subject=head(b.subject),text=String(b.text??"").slice(0,30000);if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)||!subject||!text)fail("請輸入有效收件人、主旨及正文");
    const d=load(o),draft:Draft={id:crypto.randomUUID(),to,subject,text,updated:new Date().toISOString()};if(d.drafts.length>=200)fail("草稿數達上限");d.drafts.push(draft);save(o,d);res.json(draft);
  });
  api("post","mail/drafts/:id/review",(req,res,o)=>{
    const d=load(o),draft=d.drafts.find(x=>x.id===req.params.id);if(!draft||draft.sentAt)fail("草稿不存在或已寄出");
    if(req.body.confirm!==true)fail("請先核對收件人及全文");draft.reviewedHash=crypto.createHash("sha256").update(JSON.stringify([draft.to,draft.subject,draft.text])).digest("hex");save(o,d);res.json({reviewed:true});
  });
  api("get","mail/drafts/:id/eml",async(req,res,o)=>{
    const draft=load(o).drafts.find(x=>x.id===req.params.id);if(!draft)fail("草稿不存在");
    const transport=nodemailer.createTransport({streamTransport:true,buffer:true,newline:"windows"});const result=await transport.sendMail({to:draft.to,subject:draft.subject,text:draft.text,headers:{"X-Unsent":"1"}});res.type("message/rfc822").setHeader("Content-Disposition",'attachment; filename="review-draft.eml"');res.send(result.message);
  });
  api("post","mail/drafts/:id/send",async(req,res,o)=>{
    if(o.id!=="hang-fai"||!mailCfg().smtp)fail("未接通網站 SMTP；草稿可下載後由原郵箱寄出");
    const d=load(o),draft=d.drafts.find(x=>x.id===req.params.id);if(!draft||draft.sentAt||req.body.confirm!==true)fail("請先審閱，再逐封確認寄出");
    const hash=crypto.createHash("sha256").update(JSON.stringify([draft.to,draft.subject,draft.text])).digest("hex");if(draft.reviewedHash!==hash)fail("草稿尚未審閱或內容已改動");
    // Write an attempt marker first: uncertain sends must never be automatically retried.
    draft.sentAt="sending-unknown";save(o,d);
    const auth:any=process.env.OFFICE_MAIL_ACCESS_TOKEN?{type:"OAuth2",...mailAuth()}:mailAuth();
    const transport=nodemailer.createTransport({host:process.env.OFFICE_SMTP_HOST!,port:465,secure:true,auth});
    const result=await transport.sendMail({from:process.env.OFFICE_MAIL_USER,to:draft.to,subject:draft.subject,text:draft.text});draft.sentAt=new Date().toISOString();save(o,d);res.json({sent:true,id:result.messageId});
  });
}
