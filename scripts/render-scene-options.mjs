import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
const root=process.cwd(),out=path.resolve(root,'../../outputs');
if(fs.existsSync('C:/Windows/Fonts/arial.ttf'))GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','Arial');
let tick=1000;
const css={paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0',display:'block'};
const stage={clientWidth:960,clientHeight:544,querySelector:()=>null};
function element(){return {style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:544})};}
function canvas(){const c=createCanvas(960,544);Object.assign(c,element(),{addEventListener(){},parentElement:{parentElement:stage}});return c;}
const ctx={console,Math,performance:{now:()=>tick},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:()=>null,setItem(){}},location:{search:'?hour=12'},document:{hidden:false,createElement:n=>n==='canvas'?canvas():element(),addEventListener(){},body:{classList:{contains:()=>false}}},addEventListener(){},requestAnimationFrame(){},getComputedStyle:()=>css,setTimeout,clearTimeout,devicePixelRatio:1,innerWidth:1600,__poHour:12};
ctx.window=ctx;vm.createContext(ctx);
for(const file of ['web/layout.js','web/office.js','web/scene-options.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const roster=(await (await fetch('http://127.0.0.1:4747/api/offices')).json()).find(o=>o.id==='hang-fai').employees;
fs.mkdirSync(out,{recursive:true});
for(const key of ['space','wood','neon']){
 tick=1000;const c=canvas(),o=new ctx.Office(c,element());o.setEmployees(roster.map(e=>({...e,status:'idle'})));o.motionConsent=true;o.lively=true;ctx.SceneOptions.apply(o,key);
 for(const id of ['manager','finance','architectural','developer','marketing','estimating'])o.setStatus(id,'working');
 for(let i=0;i<180;i++){tick+=50;o.update(.05,tick);}
 o.draw(tick);const b=o.b;b.font='bold 11px Arial';b.textAlign='center';
 for(const e of o.emps){const x=e.x+16,y=e.y+32+(o.atSeat(e)?28:2),w=b.measureText(e.name).width+12;b.fillStyle='rgba(13,30,47,.9)';b.fillRect(x-w/2,y,w,17);b.fillStyle='#fff1d2';b.fillText(e.name,x,y+12);}
 const target=path.join(out,'native-office-'+key+'.png');fs.writeFileSync(target,o.buf.toBuffer('image/png'));
 console.log(JSON.stringify({style:key,file:target,people:o.emps.length,sitting:o.emps.filter(e=>o.atSeat(e)&&e.anim==='type').length,walking:o.emps.filter(e=>e.anim==='walk').length}));
}
