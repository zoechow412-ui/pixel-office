// End-to-end smoke test of password login, signed cookies, and WebSocket gate.
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createOwnerAuth, allowEmbeddedOwnerRequest } from "../dist/server/owner-auth.js";
import { createGuard } from "../dist/server/security.js";

const host = "office.example.test";
const auth = createOwnerAuth("testing-owner-password-very-long", true);
assert.throws(() => createOwnerAuth("", true), /requires PIXEL_OFFICE_ACCESS_PASSWORD/);
const guard = createGuard({port:4747,host:"0.0.0.0",extraHosts:[host+":80"]});
const app = express();
app.use((req,res,next) => allowEmbeddedOwnerRequest(req,auth,guard.hostOk) ? next() : guard.middleware(req,res,next));
app.get("/healthz", (_req,res) => res.send("OK"));
auth.routes(app);
app.use(auth.middleware);
app.get("/secret", (_req,res) => res.send("only owner"));
const server = http.createServer(app);
const wss = new WebSocketServer({server,verifyClient:(info,cb)=>{
  if(allowEmbeddedOwnerRequest(info.req,auth,guard.hostOk) && auth.verify(info.req)) return cb(true);
  guard.verifyClient(info,(ok)=>{
    if(!ok)return cb(false,403,"Forbidden");
    cb(auth.verify(info.req),auth.verify(info.req)?undefined:401,"Login required");
  });
}});
const port = await new Promise(resolve => server.listen(0,"127.0.0.1",()=>resolve(server.address().port)));
function request(path,{method="GET",cookie,body,origin,accept="application/json"}={}) {
  return new Promise((resolve,reject)=>{
    const r=http.request({host:"127.0.0.1",port,path,method,
      headers:{"Host":host,"Accept":accept,...(cookie?{"Cookie":cookie}:{}),
        ...(origin?{"Origin":origin}:{}),...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{})}},res=>{
      const parts=[];res.on("data",v=>parts.push(v));res.on("end",()=>resolve({code:res.statusCode,body:Buffer.concat(parts).toString(),headers:res.headers}));
    });
    r.on("error",reject);r.end(body);
  });
}
async function socket(cookie,origin="https://"+host) {
  return new Promise((resolve,reject)=>{
    const w=new WebSocket("ws://127.0.0.1:"+port,{origin,
      headers:{"Host":host,...(cookie?{"Cookie":cookie}:{})}});
    const timeout=setTimeout(()=>{w.terminate();reject(new Error("WS timeout"))},3000);
    w.on("open",()=>{clearTimeout(timeout);w.close();resolve({connected:true})});
    w.on("unexpected-response",(_request,response)=>{clearTimeout(timeout);w.terminate();resolve({code:response.statusCode})});
    w.on("error",err=>{clearTimeout(timeout);reject(err)});
  });
}
try {
  assert.equal((await request("/healthz")).code,200);
  assert.equal((await request("/secret")).code,401);
  assert.equal((await request("/secret",{accept:"text/html"})).headers.location,"/login");
  assert.equal((await request("/login")).code,200);
  assert.equal((await request("/login",{method:"POST",origin:"https://"+host,body:"password=wrong"})).code,401);
  const login=await request("/login",{method:"POST",origin:"https://"+host,body:"password=testing-owner-password-very-long"});
  assert.equal(login.code,303);
  const cookie=login.headers["set-cookie"][0].split(";")[0];
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  assert.match(login.headers["set-cookie"][0], /Secure/);
  assert.match(login.headers["set-cookie"][0], /SameSite=Strict/);
  assert.equal((await request("/secret",{cookie})).body,"only owner");
  assert.equal((await request("/secret",{cookie:cookie.replace(/.$/,"0")})).code,401);
  assert.equal((await socket()).code,401);
  assert.equal((await socket(cookie)).connected,true);
  assert.equal((await socket(cookie,"null")).connected,true);
  assert.equal((await socket(cookie,"https://evil.example")).code,403);
  const embeddedLogin = await request("/login",{method:"POST",origin:"null",body:"password=testing-owner-password-very-long"});
  assert.equal(embeddedLogin.code,303);
  assert.equal((await request("/logout",{method:"POST",cookie,origin:"null"})).code,303);
  assert.equal((await request("/logout",{method:"POST",cookie,origin:"https://another.example"})).code,403);
  console.log("Remote owner authentication / WebSocket tests passed.");
} finally {
  for(const c of wss.clients) c.terminate();
  await new Promise(resolve=>wss.close(resolve));
  await new Promise(resolve=>server.close(resolve));
}
