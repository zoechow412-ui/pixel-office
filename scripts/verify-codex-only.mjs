import fs from 'node:fs';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const base='http://127.0.0.1:4747';
const opts=await (await fetch(base+'/api/options')).json();
assert.equal(opts.codexOnly,true);assert.equal(opts.models.length,0);assert(opts.extraModels.length>0&&opts.extraModels.every(m=>m.provider==='codex'));
const offices=await (await fetch(base+'/api/offices')).json();const employees=offices.flatMap(o=>o.employees);
assert(employees.every(e=>e.model==='gpt-6.1-sol'));console.log(JSON.stringify({offices:offices.length,employees:employees.length,hq:offices.find(o=>o.id==='hang-fai').employees.length,allCodex:true}));
for(const [url,method,body] of [['/api/offices/hang-fai/employees/finance','PUT',{model:'claude-sonnet-5-5'}],['/api/providers/gemini','PUT',{enabled:true}],['/api/providers/codex','PUT',{apiKey:'test-rejected'}]]){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});assert.equal(r.status,400);}
console.log('Non-Codex model/provider and API-key mutations rejected.');
const ws=new WebSocket('ws://127.0.0.1:4747',{headers:{Origin:base}});let sent=false,own=false,finished=false;
const send=d=>ws.send(JSON.stringify({office:'hang-fai',...d}));
const timer=setTimeout(()=>{console.log('Meeting test timeout: no verified reply.');if(own)send({type:'meeting_end',summary:false,memory:false});ws.close();process.exitCode=1;},150000);
ws.on('message',raw=>{const d=JSON.parse(raw);if(d.type==='init'){const o=d.offices.find(o=>o.id==='hang-fai');if(o.meeting&&!o.meeting.endedAt){console.log('Existing user meeting preserved; test skipped.');clearTimeout(timer);ws.close();return;}own=true;send({type:'meeting_start',topic:'Codex 訂閱模式驗收',ids:['manager','finance'],interrupt:false});}
if(d.type==='meeting'&&d.office==='hang-fai'&&d.meeting?.participants.every(p=>p.joined)&&!sent){sent=true;send({type:'meeting_say',text:'只讀現有任務板，揀最優先三項工作同負責人，150字內。唔好用 shell、唔好研究、唔好派工作、唔好新增任務、唔好寄信或改檔。清楚標示未完成，唔好虛報。'});}
if(d.type==='meeting_entry'&&d.office==='hang-fai'&&d.entry?.from==='manager'&&d.entry.kind==='say'&&!finished){finished=true;fs.mkdirSync('../../outputs',{recursive:true});fs.writeFileSync('../../outputs/codex-meeting-verification.json',JSON.stringify({at:new Date().toISOString(),meetingId:d.meetingId,engine:'codex',auth:'chatgpt',reply:d.entry.text},null,2));console.log('Verified actual meeting reply: '+d.entry.text);send({type:'meeting_end',summary:false,memory:false});setTimeout(()=>{send({type:'meeting_close'});clearTimeout(timer);ws.close();},800);}});
