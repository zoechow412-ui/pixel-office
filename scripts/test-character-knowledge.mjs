import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { characterProjects, characterKnowledgePrompt } from '../dist/server/character-knowledge.js';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'po-character-'));
try {
  const office=(id,roles)=>{
    const cwd=path.join(root,id), employeesDir=path.join(cwd,'staff');
    fs.mkdirSync(path.join(cwd,'sources'),{recursive:true});
    fs.writeFileSync(path.join(cwd,'PROJECT.md'),'Background of '+id);
    for(const role of roles){fs.mkdirSync(path.join(employeesDir,role),{recursive:true});fs.writeFileSync(path.join(employeesDir,role,'agent.md'),'assigned');}
    return {id,name:id,cwd,employeesDir,extraEmployees:[],theme:'default'};
  };
  const a=office('water',['manager','plumbing']), b=office('video',['manager','video']);
  fs.writeFileSync(path.join(a.cwd,'sources','water-context.md'),'Replace the original water meter.');
  fs.writeFileSync(path.join(a.cwd,'sources','.env'),'OPENAI_API_KEY=do-not-read');
  fs.writeFileSync(path.join(a.cwd,'sources','redact.md'),'OPENAI_API_KEY=never-include-this-value');
  fs.writeFileSync(path.join(a.employeesDir,'plumbing','memory.md'),'Water project note.');
  const offices=[a,b];
  assert.deepEqual(characterProjects({id:'manager',officeId:'hang-fai'},offices).map(p=>p.id),['water','video']);
  assert.deepEqual(characterProjects({id:'plumbing',officeId:'hang-fai'},offices).map(p=>p.id),['water']);
  assert.deepEqual(characterProjects({id:'manager',officeId:'water'},offices).map(p=>p.id),['water'],'project role stays scoped');
  assert.equal(characterProjects({id:'../manager',officeId:'hang-fai'},offices).length,0);
  const text=characterKnowledgePrompt({id:'plumbing',officeId:'hang-fai'},offices);
  assert.ok(text.includes('Replace the original water meter.') && text.includes('Water project note.'));
  assert.ok(!text.includes('never-include-this-value') && !text.includes('do-not-read'));
  fs.appendFileSync(path.join(a.cwd,'sources','water-context.md'),' Updated requirement.');
  assert.ok(characterKnowledgePrompt({id:'plumbing',officeId:'hang-fai'},offices).includes('Updated requirement.'),'live sources are reloaded');
  assert.ok(new TextEncoder().encode(text).length>0);
  console.log('Character knowledge: assigned projects, role memory, live source reload, scoped access and credential exclusion passed.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
