/* Deterministic local tools. No model requests or agent starts. */
(function () {
  "use strict";
  const stage=document.querySelector(".stage");if(!stage)return;
  const section=document.createElement("section");section.className="hq-local-tools";section.setAttribute("aria-label","本機工具");
  stage.append(section);
  const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  section.append(make("h3","本機工具 · 不啟動模型"));
  const motion=make("button",localStorage.getItem("po.lively")==="0"?"人物動態：柔和":"人物動態：活潑");motion.type="button";
  motion.setAttribute("aria-pressed",localStorage.getItem("po.lively")!=="0"?"true":"false");
  motion.onclick=()=>{const enabled=localStorage.getItem("po.lively")==="0";localStorage.setItem("po.lively",enabled?"1":"0");localStorage.setItem("po.motionConsent",enabled?"1":"0");motion.textContent="人物動態："+(enabled?"活潑":"柔和");motion.setAttribute("aria-pressed",String(enabled));window.dispatchEvent(new CustomEvent("hq-motion",{detail:enabled}));};
  section.append(motion,make("p","行路、休息及氣泡屬畫面動態；實際工作進度以任務板為準。預設跟隨裝置減少動畫設定；重新選擇活潑模式可啟用行走動態。"));
  const motionStatus=make("p","畫面動態準備中…");section.append(motionStatus);window.addEventListener("hq-motion-frame",e=>{motionStatus.textContent="畫面行走："+e.detail.walking+" 人 · 系統減少動畫："+(e.detail.reduced?"開啟":"關閉")+(e.detail.consent?" · 已選擇啟用活潑動態":"");});
  const nav=make("nav"),body=make("div");nav.setAttribute("aria-label","本機工具選擇");body.setAttribute("aria-live","polite");section.append(nav,body);
  const officeId=()=>state.office;
  const url=(r,target=officeId())=>"/api/offices/"+encodeURIComponent(target)+"/local/"+r;
  const request=async(route,data,method,target=officeId())=>{const r=await fetch(url(route,target),data===undefined?{}:{method:method||"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error||"操作未完成");if(target!==officeId())throw new Error("工作空間已切換，操作結果保留於原專案。");return d;};
  const message=(text)=>{const p=make("p",text);p.className="local-message";body.append(p);return p;};
  const button=(parent,text,fn)=>{const b=make("button",text),atOffice=officeId();b.type="button";b.onclick=async()=>{b.disabled=true;try{if(parent!==nav&&atOffice!==officeId())throw new Error("工作空間已切換，請重新選擇工具。");await fn();}catch(e){message(e.message);}finally{b.disabled=false;}};parent.append(b);return b;};
  const field=(parent,label,type="text",value="")=>{const l=make("label",label),input=make(type==="textarea"?"textarea":"input");if(type!=="textarea")input.type=type;input.value=value;l.append(input);parent.append(l);return input;};
  const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=make("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
  const readData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error("讀取檔案失敗"));r.onload=()=>resolve(String(r.result));r.readAsDataURL(file);});
  let current="",generation=0;
  const sidebar=document.querySelector(".hq-nav");if(sidebar){const b=make("button","本機工具及人物動態");b.type="button";b.onclick=()=>section.scrollIntoView({behavior:"smooth",block:"start"});sidebar.append(b);}
  const menu=document.querySelector("#toolsPop");if(menu){const b=make("button","本機工具及人物動態");b.type="button";b.className="menu-item";b.setAttribute("role","menuitem");b.onclick=()=>section.scrollIntoView({behavior:"smooth",block:"start"});menu.append(b);}
  const tab=(title,fn)=>{button(nav,title,async()=>{current=title;const token=++generation;body.replaceChildren(make("h4",title));await fn(token);});};
  tab("CEO 追單及提醒",async(token)=>{
    const d=await request("reminders");if(token!==generation)return;
    message("每分鐘核對；此處只列提醒，不會自動啟動 Codex 或虛報完成。");
    if(!d.items.length)message("目前未有到期、受阻或待審核提醒。");
    for(const e of d.items){const row=make("article");row.append(make("b",e.title),make("p",e.owner+" · "+e.reason));body.append(row);}
  });
  tab("文件搜尋",async()=>{
    message("只搜尋目前工作空間已保存嘅來源、共享筆記及匯入文件；不使用 embeddings。");
    const form=make("form"),q=field(form,"搜尋內容"),results=make("div");q.required=true;q.minLength=2;
    const submit=make("button","搜尋");submit.type="submit";form.append(submit);body.append(form,results);
    form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const d=await request("search?q="+encodeURIComponent(q.value));results.replaceChildren(make("p","已索引 "+d.indexed+" 份文件；找到 "+d.results.length+" 項"));for(const x of d.results){const row=make("article"),pre=make("pre",x.excerpt);row.append(make("b",x.source),pre);if(x.source.startsWith("uploads/")&&x.source.endsWith(".pdf")){const a=make("a","下載保存嘅原 PDF");a.href=url("documents/file?name="+encodeURIComponent(x.source.slice(8)));row.append(a);}results.append(row);}}catch(e){message(e.message);}finally{submit.disabled=false;}};
    const upload=field(body,"匯入文字或 PDF 文件","file");upload.accept=".txt,.md,.csv,.pdf";
    button(body,"保存至此專案文件櫃",async()=>{const f=upload.files[0];if(!f)throw new Error("請選擇文件");if(/\.pdf$/i.test(f.name)){if(f.size>4*1024*1024)throw new Error("PDF 上限 4MB、30 頁");const target=officeId(),raw=await readData(f);await request("documents/pdf",{name:f.name,pdf:raw.split(",")[1]},undefined,target);}else{if(f.size>600000)throw new Error("文字文件上限 600KB");const target=officeId(),text=await f.text();await request("documents",{name:f.name,text},undefined,target);}message("已保存，現在可以搜尋。PDF 原稿會一併保留，不會被覆寫。");});
  });
  tab("報價核算及 PDF",async()=>{
    message("核算草稿不改動原報價單。正式報價、Logo、付款條款及 PDF 仍以原系統為準。");
    const ref=field(body,"原報價編號（選填）"),items=field(body,"每行：項目名稱｜數量｜單價","textarea");items.placeholder="例如：施工材料｜2｜120.50";
    const discount=field(body,"折扣金額（HK$）","number","0"),paid=field(body,"已收金額（HK$）","number","0"),result=make("div");body.append(result);
    discount.step=paid.step="0.01";discount.min=paid.min="0";
    const payload=()=>({reference:ref.value,items:items.value.split(/\n/).filter(x=>x.trim()).map(s=>{const a=s.split(/[｜|]/);return {description:a[0]?.trim(),qty:a[1]?.trim(),rate:a[2]?.trim()};}),discount:discount.value,paid:paid.value});
    button(body,"核算金額",async()=>{const d=await request("quote",payload());result.replaceChildren();for(const [k,label] of [["subtotal","小計"],["discount","折扣"],["total","總額"],["paid","已收"],["due","尚欠"]])result.append(make("p",label+"：HK$"+d[k].toFixed(2)));});
    button(body,"下載內部核算 PDF",async()=>{const r=await fetch(url("quote.pdf"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload())});if(!r.ok)throw new Error((await r.json()).error);download(await r.blob(),"報價核算草稿.pdf");});
    const a=make("a","開原有正式報價系統");a.href="https://unibright-ops.vercel.app/";a.target="_blank";a.rel="noopener";body.append(a);
  });
  let month=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Hong_Kong",year:"numeric",month:"2-digit"}).slice(0,7);
  tab("工程日曆",async(token)=>{
    const data=await request("calendar");if(token!==generation)return;
    const controls=make("div"),grid=make("div"),list=make("div");body.append(controls,grid,list);grid.className="local-calendar";
    const paint=()=>{
      grid.replaceChildren();list.replaceChildren();const [y,m]=month.split("-").map(Number),start=new Date(Date.UTC(y,m-1,1)).getUTCDay(),days=new Date(Date.UTC(y,m,0)).getUTCDate();
      for(const d of ["日","一","二","三","四","五","六"])grid.append(make("b",d));
      for(let i=0;i<start;i++)grid.append(make("span",""));
      for(let day=1;day<=days;day++){const key=month+"-"+String(day).padStart(2,"0"),cell=make("div"),events=data.events.filter(e=>new Date(e.at).toLocaleDateString("en-CA",{timeZone:"Asia/Hong_Kong"})===key);cell.append(make("b",String(day)));for(const e of events)cell.append(make("small",(e.done?"已完成：":"")+e.title));grid.append(cell);}
      for(const e of data.events.filter(e=>new Date(e.at).toLocaleDateString("en-CA",{timeZone:"Asia/Hong_Kong"}).startsWith(month)).sort((a,b)=>a.at.localeCompare(b.at))){const row=make("article");row.append(make("b",e.title),make("p",new Date(e.at).toLocaleString("zh-HK",{timeZone:"Asia/Hong_Kong"})+" · "+e.owner+" · "+e.kind));button(row,e.done?"改為未完成":"標記日程已完成",async()=>{await request("calendar/"+e.id,{done:!e.done},"PUT");e.done=!e.done;paint();});list.append(row);}
    };
    const picker=field(controls,"月份","month",month);picker.onchange=()=>{month=picker.value;paint();};
    const form=make("form"),title=field(form,"日程名稱"),at=field(form,"日期及時間（香港）","datetime-local"),owner=field(form,"負責人"),kind=field(form,"類型","text","跟進");title.required=at.required=true;
    const submit=make("button","新增日程");submit.type="submit";form.append(submit);body.append(form);
    form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const d=await request("calendar",{title:title.value,at:at.value+":00+08:00",owner:owner.value,kind:kind.value});data.events.push(d);title.value="";paint();message("已保存日程；不會啟動模型。");}catch(e){message(e.message);}finally{submit.disabled=false;}};paint();
  });
  tab("圖片文字辨識",async()=>{
    message("本機處理繁體中文及英文圖片，不用模型 API。首次會下載開源語言檔；掃描 PDF 請先轉圖片。金額及內容必須覆核。");
    const file=field(body,"選擇單據圖片（PNG／JPEG，4MB 內）","file");file.accept="image/png,image/jpeg";
    const name=field(body,"保存文件名稱","text","單據辨識待覆核.txt"),text=field(body,"辨識結果（可修正）","textarea");
    button(body,"開始本機辨識",async()=>{const f=file.files[0];if(!f||f.size>4*1024*1024)throw new Error("請選擇 4MB 內 PNG／JPEG");const progress=message("本機辨識中，請稍候…");try{const target=officeId(),image=await readData(f),d=await request("ocr",{image},undefined,target);text.value=d.text;progress.textContent="辨識完成；信心分數 "+Math.round(d.confidence)+"，請覆核後保存。";}catch(e){progress.textContent=e.message;}});
    button(body,"保存已覆核文字至文件櫃",async()=>{await request("documents",{name:name.value,text:text.value});message("文字已保存，可在目前專案搜尋。");});
  });
  tab("秘書電郵及草稿",async(token)=>{
    const data=await request("mail");if(token!==generation)return;
    message(data.connection.imap?"已設定 IMAP 連線，按同步讀取原郵箱。":"網站未有 IMAP 連線憑證；可用現有郵件快照，或匯入 .eml，毋須重新登入。");
    message("此處收發及固定模板不啟動模型。寄出前逐封審閱；無自動寄信。SMTP："+(data.connection.smtp?"已設定":"未設定，可下載草稿由原郵箱寄出"));
    const mailbox=make("div");body.append(mailbox);
    const showMail=d=>{mailbox.replaceChildren(make("h4",d.subject),make("p",d.from),make("pre",d.text));for(const a of d.attachments)button(mailbox,"下載附件："+a.name+"（"+a.bytes+" bytes）",()=>{const bytes=Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0));download(new Blob([bytes],{type:"application/octet-stream"}),a.name);});};
    for(const m of data.imports||[])button(body,"已匯入："+m.subject,async()=>showMail(await request("mail/imports/"+m.id)));
    button(body,"讀已匯入郵件快照",async()=>{const r=await fetch("/api/offices/"+encodeURIComponent(officeId())+"/secretary-mail");const d=await r.json();if(!r.ok)throw new Error(d.error);mailbox.replaceChildren(make("p","快照更新："+new Date(d.syncedAt).toLocaleString("zh-HK")));for(const m of d.messages){const row=make("details");row.append(make("summary",m.subject),make("p",m.from_),make("pre",m.snippet));mailbox.append(row);}});
    const sync=button(body,"同步原郵箱",async()=>{const d=await request("mail/sync",{});mailbox.replaceChildren();for(const m of d.messages)button(mailbox,m.subject+" · "+m.from,async()=>showMail(await request("mail/messages/"+m.uid,{})));});sync.disabled=!data.connection.imap;
    const file=field(body,"匯入郵件及附件（.eml，4MB 內）","file");file.accept=".eml";
    button(body,"讀取郵件及附件",async()=>{const f=file.files[0];if(!f||f.size>4*1024*1024)throw new Error("請選擇 4MB 內 .eml");const target=officeId(),encoded=await readData(f),d=await request("mail/import",{eml:encoded.split(",")[1]},undefined,target);showMail(d);message("原郵件及附件已保存；正文已加入目前專案搜尋。郵件 HTML 及追蹤圖片不會執行。");});
    const to=field(body,"收件人","email"),subject=field(body,"主旨"),text=field(body,"草稿正文","textarea");
    button(body,"套用確認收件模板",()=>{text.value="你好，\n\n已收到你嘅資料，我哋會核對內容後再跟進。\n\n謝謝。";});
    const drafts=make("div");body.append(drafts);
    const render=()=>{drafts.replaceChildren(make("h4","已保存草稿"));for(const d of data.drafts){const row=make("details");row.append(make("summary",d.subject+" → "+d.to+(d.sentAt?"（已送出／狀態待核對）":"")),make("pre",d.text));const reviewed=field(row,"我已核對收件人、主旨及全文","checkbox");button(row,"記錄審閱",async()=>{if(!reviewed.checked)throw new Error("請先核對並勾選審閱");await request("mail/drafts/"+d.id+"/review",{confirm:true});message("已記錄此版本審閱。");});button(row,"下載 .eml 草稿",async()=>{const r=await fetch(url("mail/drafts/"+d.id+"/eml"));if(!r.ok)throw new Error("草稿下載失敗");download(await r.blob(),"待寄草稿.eml");});const send=button(row,"確認寄出此封電郵",async()=>{if(!reviewed.checked||!confirm("寄給 "+d.to+"\n主旨："+d.subject+"\n\n確認寄出已審閱全文？"))return;await request("mail/drafts/"+d.id+"/send",{confirm:true});message("郵箱已回報寄出；請以原郵箱寄件紀錄為準。");send.disabled=true;});send.disabled=!data.connection.smtp||!!d.sentAt;drafts.append(row);}};
    button(body,"保存草稿（不寄出）",async()=>{const d=await request("mail/drafts",{to:to.value,subject:subject.value,text:text.value});data.drafts.push(d);render();message("草稿已保存，未寄出。");});render();
  });
  tab("備份及還原校驗",async(token)=>{
    const data=await request("backups");if(token!==generation)return;
    message("備份全部工作空間嘅資料、記憶、原稿及成果，排除登入憑證；每份 ZIP 會解壓並核對 SHA-256。服務運行期間每日自動備份。本頁不會覆寫現有資料。");
    button(body,"立即建立並校驗備份",async()=>{const d=await request("backups",{});message("備份已保存及校驗："+d.name+" · "+d.files+" 個檔案");const a=make("a","下載新備份");a.href=url("backups/"+d.name);body.append(a);});
    for(const f of data.files.slice(0,15)){const p=make("p"),a=make("a",f.name+"（"+Math.round(f.bytes/1024)+"KB）");a.href=url("backups/"+f.name);p.append(a);body.append(p);}
  });
  if(typeof panelHooks!=="undefined")panelHooks.push((what,id)=>{if(id===officeId()&&what==="office"){generation++;body.replaceChildren(make("p","工作空間已切換，請重新選擇工具。"));}});
  // Reminders refresh a badge only. This interval never starts an employee.
  const badge=make("p","提醒狀態讀取中…");section.prepend(badge);
  let lastOffice="";
  const refresh=async()=>{try{const id=officeId();if(lastOffice&&lastOffice!==id){generation++;body.replaceChildren(make("p","工作空間已切換，請重新選擇工具。"));}lastOffice=id;const d=await request("reminders");badge.textContent="目前專案："+d.items.length+" 項需跟進 · 規則檢查，無模型用量";}catch{badge.textContent="提醒暫時未能讀取";}};
  refresh();setInterval(refresh,60000);
})();
