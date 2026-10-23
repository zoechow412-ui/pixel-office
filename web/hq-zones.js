/* Office locations open the existing scoped tools; no model turns on click. */
(function(){
  const pads=[
    {id:'design',label:'圖則及列印',x:8.4,y:8,w:4.8,h:3.8,color:'#629cb5',tool:'文件搜尋'},
    {id:'materials',label:'物料樣本',x:16,y:8,w:5.8,h:3.8,color:'#be9d64',tool:'文件搜尋'},
    {id:'pantry',label:'茶水補給',x:8.1,y:12,w:5,h:3.7,color:'#6d9c8a',tool:'pantry'},
    {id:'files',label:'專案文件及影音',x:16,y:12,w:5.8,h:4.5,color:'#9f83bc',tool:'文件搜尋'},
    {id:'rest',label:'休息交流',x:.2,y:13,w:6.5,h:3.8,color:'#788f9c',tool:'rest'}
  ];
  const panelActions=[['CEO 工作總覽','CEO 追蹤'],['秘書電郵','秘書電郵及草稿'],['設計原稿','文件搜尋'],['工程物料','文件搜尋'],['財務報價','報價核算及 PDF'],['影音腳本','video'],['專案文件櫃','文件搜尋'],['會議室','meeting'],['工程排期','工程日曆'],['備份保管','備份及還原校驗']];
  function open(tool){
    if(tool==='pantry'||tool==='rest'){
      const items=tool==='pantry'?['zone-coffee','zone-water']:['zone-sofa'];
      const meeting=typeof cur==='function'?cur()?.meeting:null;
      const participants=new Set(meeting&&!meeting.endedAt?meeting.participants.map(p=>p.id):[]);
      const candidates=office.emps.filter(e=>e.status==='idle'&&!e.meet&&!participants.has(e.id)&&!e.path.length&&!e.act);
      const used=new Set(office.emps.filter(e=>e.spot).map(e=>e.spot.key));
      let name='';for(const e of candidates){for(const s of office.spots.filter(s=>items.includes(s.item)&&!used.has(s.key))){if(office.goToSpot(e,s)){e.spot=s;e.restUntil=performance.now()+14000;name=e.name;break;}}if(name)break;}
      let note=document.getElementById('hqZoneNotice');if(!note){note=document.createElement('p');note.id='hqZoneNotice';note.setAttribute('role','status');document.getElementById('officeWrap')?.after(note);}
      note.textContent=name?name+' 正行去'+(tool==='pantry'?'茶水區':'休息區')+'。只係人物動作，冇呼叫模型。':'暫時冇可安排嘅待命同事或空位；工作同會議保持進行。';
      return;
    }
    if(tool==='video'){if(typeof openChat==='function')openChat('video');return;}
    if(tool==='meeting'){document.getElementById('btnMeeting')?.click();return;}
    const buttons=[...document.querySelectorAll('.hq-local-tools nav button, .hq-command button')];
    const target=buttons.find(b=>b.textContent.trim()===tool);
    if(target){target.click();target.closest('section')?.scrollIntoView({behavior:'smooth',block:'center'});}
  }
  function drawFloor(b){
    for(const p of pads){b.save();b.globalAlpha=.18;b.fillStyle=p.color;b.fillRect(p.x*32,p.y*32,p.w*32,p.h*32);b.globalAlpha=.75;b.strokeStyle=p.color;b.lineWidth=2;b.strokeRect(p.x*32+2,p.y*32+2,p.w*32-4,p.h*32-4);b.restore();}
  }
  function sync(o){
    const enabled=typeof state!=='undefined'&&state.office==='hang-fai'&&POLayout.isHangFaiTeam(o.rosterIds)&&!o.editing;
    if(!o.zoneButtons)o.zoneButtons=new Map();
    for(const p of pads){
      let b=o.zoneButtons.get(p.id);
      if(!b){b=document.createElement('button');b.type='button';b.className='hq-zone-link';b.textContent=p.label;b.title=p.label+'：開啟本機工具，不啟動模型';b.onclick=()=>open(p.tool);o.zoneButtons.set(p.id,b);}
      if(b.parentElement!==o.labelsEl)o.labelsEl.appendChild(b);
      b.hidden=!enabled;b.style.left=(p.x*32+5)*o.scale+'px';b.style.top=(p.y*32+3)*o.scale+'px';
    }
    let bar=document.getElementById('hqFunctionAreas');
    if(!bar){const command=document.getElementById('hqCommand');if(command){bar=document.createElement('section');bar.id='hqFunctionAreas';bar.className='hq-function-areas';const h=document.createElement('h3');h.textContent='功能區';bar.appendChild(h);const nav=document.createElement('nav');nav.setAttribute('aria-label','辦公室功能區');for(const [label,tool] of panelActions){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>open(tool);nav.appendChild(b);}bar.appendChild(nav);command.before(bar);}}
    if(bar)bar.hidden=!enabled;
  }
  window.HQZones={pads,drawFloor,sync};
})();
