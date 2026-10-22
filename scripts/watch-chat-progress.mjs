// Watch one explicitly selected Codex chat. Publish lifecycle only, never content.
import fs from 'node:fs';
import path from 'node:path';
const [logFile,outFile]=process.argv.slice(2);
if(!logFile||!outFile||!logFile.endsWith('.jsonl'))throw Error('Provide one chat log and status destination');
let offset=fs.statSync(logFile).size, pending='', lastStatus='', lastPublished=0;
const summaries={working:'本專案工作對話正在處理及執行操作',done:'本專案工作對話已完成本輪回覆',blocked:'本專案工作對話已中斷或遇到問題'};
function publish(status){
  if(status===lastStatus && Date.now()-lastPublished<15000)return;lastStatus=status;lastPublished=Date.now();
  const temp=outFile+'.tmp';fs.writeFileSync(temp,JSON.stringify({status,summary:summaries[status],source:'本專案 Codex 工作對話 自動同步',updatedAt:Date.now()}));fs.renameSync(temp,outFile);
}
export function statusOf(event){
  const p=event.payload??{};
  if(event.type==='event_msg'){
    if(['task_started','user_message'].includes(p.type))return 'working';
    if(['task_complete','task_completed'].includes(p.type))return 'done';
    if(['turn_aborted','task_aborted'].includes(p.type))return 'blocked';
  }
  if(event.type==='response_item'){
    if(p.type==='message'&&p.role==='assistant'&&p.phase==='final_answer')return 'done';
    if(['function_call','custom_tool_call'].includes(p.type))return 'working';
  }
}
publish('working');
setInterval(()=>{
  try{
    const size=fs.statSync(logFile).size;if(size<offset){offset=0;pending='';}
    if(size===offset)return;
    const length=Math.min(size-offset,2*1024*1024),data=Buffer.alloc(length),fd=fs.openSync(logFile,'r');
    try{fs.readSync(fd,data,0,length,offset);}finally{fs.closeSync(fd);}offset+=length;
    pending+=data.toString('utf8');let end;
    while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);try{const status=statusOf(JSON.parse(line));if(status)publish(status);}catch{}}
    if(pending.length>16*1024*1024)pending='';
  }catch{publish('blocked');}
},1000);
