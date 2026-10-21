import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"hang-fai-roster-"));
try{
  fs.mkdirSync(path.join(tmp,"scripts"),{recursive:true});
  fs.copyFileSync(path.join(root,"scripts/seed-hang-fai.mjs"),path.join(tmp,"scripts/seed-hang-fai.mjs"));
  fs.copyFileSync(path.join(root,"HANG-FAI-OPERATIONS.md"),path.join(tmp,"HANG-FAI-OPERATIONS.md"));
  function run(){
    const r=spawnSync(process.execPath,["scripts/seed-hang-fai.mjs"],{cwd:tmp,encoding:"utf8"});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  run();
  const base=path.join(tmp,".pixel-office/employees/hang-fai");
  const employees=fs.readdirSync(base).sort();
  assert.equal(employees.length,14,"Expected 14 distinct engineering company roles");
  const ids=["manager","sales","marketing","project-manager","architectural","plumbing","electrical-fire","researcher","documentation","estimating","procurement","finance","developer","video"];
  assert.deepEqual(employees,ids.sort());
  for(const id of ids){
    const file=fs.readFileSync(path.join(base,id,"agent.md"),"utf8");
    assert.match(file, /^---\nname: /);
    assert.match(file, /恒輝 AI 總部工作規範/);
    assert.match(file, /Agency Agents 專家模板/);
    assert.match(file, /https:\/\/github.com\/msitarzewski\/agency-agents/);
    assert.match(file,/model: /);
    if(id==="video") assert.match(file,/model: gemini-2.5-flash/);
    else assert.match(file,/model: gpt-6.1-sol/);
  }
  const memory=path.join(base,"manager/memory.md");
  fs.appendFileSync(memory,"重要客戶記錄：不可清除\n");
  run();
  assert.match(fs.readFileSync(memory,"utf8"),/重要客戶記錄：不可清除/);
  assert.equal(fs.readdirSync(base).length,14,"Repeat must not duplicate employees");
  const manager=fs.readFileSync(path.join(base,"manager/agent.md"),"utf8");
  assert.equal((manager.match(/## 恒輝 AI 總部工作規範/g)||[]).length,1,"SOP must not duplicate");
  const old=path.join(tmp,".pixel-office/employees/manager");
  fs.renameSync(path.join(base,"manager"),old);
  run();
  assert.ok(fs.existsSync(path.join(base,"manager/agent.md")),"Migrate previously misplaced manager");
  console.log("Agency Agents HK roster tests passed: 13 Codex + 1 Gemini video.");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
