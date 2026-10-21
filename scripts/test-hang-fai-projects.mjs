import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
const original=process.cwd();
const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),"hang-fai-workspace-test-"));
try {
  fs.mkdirSync(path.join(sandbox,"scripts"));
  for(const p of ["scripts/seed-hang-fai.mjs","scripts/configure-hang-fai-projects.mjs","HANG-FAI-OPERATIONS.md"]) {
    fs.copyFileSync(path.join(original,p),path.join(sandbox,p));
  }
  function run(file){
    const r=spawnSync(process.execPath,[file],{cwd:sandbox,encoding:"utf8"});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
  run("scripts/seed-hang-fai.mjs");
  run("scripts/configure-hang-fai-projects.mjs");
  const config=JSON.parse(fs.readFileSync(path.join(sandbox,".pixel-office/config.json"),"utf8"));
  const expected=["hang-fai","bhu-housing","construction","derfoe","driver-app","tailoring","marketing-studio"];
  assert.deepEqual(config.offices.map(o=>o.id),expected);
  const base=path.join(sandbox,".pixel-office/employees");
  assert.equal(fs.readdirSync(path.join(base,"hang-fai")).length,14);
  for(const office of config.offices.slice(1)){
    const folder=path.join(base,office.id);
    assert.ok(fs.readdirSync(folder).length>=4,office.id+" lacks specialized staff");
    const p=path.join(sandbox,office.cwd,"PROJECT.md");
    assert.ok(fs.existsSync(p),office.id+" lacks project instructions");
    const m=path.join(folder,"manager/memory.md");
    assert.ok(fs.existsSync(m),office.id+" lacks own employee memory");
    const content=fs.readFileSync(path.join(folder,"manager/agent.md"),"utf8");
    assert.match(content,/專案專屬指令/);
  }
  const d=path.join(base,"derfoe/manager/memory.md");
  const bh=path.join(base,"bhu-housing/manager/memory.md");
  fs.appendFileSync(d,"DERFOE private records are independent\n");
  run("scripts/configure-hang-fai-projects.mjs");
  assert.match(fs.readFileSync(d,"utf8"),/DERFOE private records/);
  assert.doesNotMatch(fs.readFileSync(bh,"utf8"),/DERFOE private records/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(sandbox,".pixel-office/config.json"))).offices.length,7,"No duplicate project tabs");
  assert.match(fs.readFileSync(path.join(base,"derfoe/video/agent.md"),"utf8"),/model: gemini-2.5-flash/);
  assert.match(fs.readFileSync(path.join(base,"bhu-housing/plumbing/agent.md"),"utf8"),/model: gpt-5.3-codex/);
  assert.match(fs.readFileSync(path.join(base,"tailoring/developer/agent.md"),"utf8"),/訂製西裝/);
  console.log("Seven isolated business workspaces and project-professional roles verified.");
} finally {
  fs.rmSync(sandbox,{recursive:true,force:true});
}
