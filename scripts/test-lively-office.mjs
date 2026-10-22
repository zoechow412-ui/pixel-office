import assert from 'node:assert/strict';
import {loadOffice} from './lib/office-harness.mjs';
const h=loadOffice(),o=h.makeOffice();h.ctx.o=o;
const ids=['architectural','developer','documentation','electrical-fire','estimating','finance','manager','marketing','plumbing','procurement','project-manager','researcher','sales','video'];
o.setEmployees(ids.map(id=>({id,name:id,role:id,status:'idle',color:'#61afef'})));
const walked=new Set(),poses=new Set();let walls=0,maxMoving=0;const start=performance.now();
for(let t=0;t<90000;t+=50){o.update(.05,start+t);maxMoving=Math.max(maxMoving,o.emps.filter(e=>e.path.length).length);for(const e of o.emps){poses.add(e.anim);if(e.anim==='walk'){walked.add(e.id);if(o.blocked.has(e.tx+','+e.ty))walls++;}}}
console.log(JSON.stringify({walked:[...walked],poses:[...poses],walls,maxMoving}));
assert.equal(walked.size,14,'Every idle HQ colleague should walk during a 90 second observation');assert.equal(walls,0,'Walking must stay outside walls and furniture');
o.setStatus('manager','working');let returned=false;
for(let t=90000;t<120000;t+=50){o.update(.05,start+t);const e=o.emps.find(e=>e.id==='manager');if(o.atSeat(e)&&e.anim==='type')returned=true;}
assert(returned,'Real working status returns to the assigned desk and types');
o.setMeeting(ids);let joined=false;
for(let t=120000;t<150000;t+=50){o.update(.05,start+t);joined=ids.every(id=>{const e=o.emps.find(x=>x.id===id);return e.meet&&!e.path.length;});}
assert(joined,'Meeting participants must physically reach the meeting room');
assert(o.emps.every(e=>e.spot&&e.tx>=23&&e.tx<=29&&e.ty>=2&&e.ty<=8),'All 14 participants physically enter the meeting room');
assert.equal(new Set(o.emps.map(e=>e.tx+","+e.ty)).size,14,'Every participant has a separate place');
o.setMeeting(null);for(let t=150000;t<180000;t+=50)o.update(.05,start+t);
assert(!o.emps.some(e=>e.meet));
console.log('PASS: 14 independently moving characters, physical paths, real working state and meeting arrival/exit. No model requests.');
