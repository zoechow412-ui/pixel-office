import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { OAuthFlows } from '../dist/server/oauth-flows.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'po-oauth-state-'));
const fresh = () => ({id:'example',state:crypto.randomBytes(24).toString('hex'),
  redirectUrl:'https://office.example/api/integrations/oauth/callback',
  verifier:crypto.randomBytes(32).toString('base64url'),at:Date.now()});
try {
  const before = new OAuthFlows(dir);
  const f = fresh(); before.save(f);
  const afterRestart = new OAuthFlows(dir);
  assert.deepEqual(afterRestart.consume(f.state), f, 'state and PKCE survive a new store instance');
  assert.equal(before.consume(f.state), undefined, 'callback is single use');
  assert.equal(before.consume('../integrations'), undefined, 'no path traversal');
  for (const at of [Date.now()-600_001, Date.now()+60_000]) {
    const expired = {...fresh(),at}; before.save(expired);
    assert.equal(afterRestart.consume(expired.state), undefined, 'expired/future flow refused');
  }
  const broken = fresh(); before.save(broken);
  fs.writeFileSync(path.join(dir,broken.state+'.json'),'{broken');
  assert.equal(before.consume(broken.state), undefined, 'corrupt state refused');
  const racing = fresh(); before.save(racing);
  const moduleUrl = new URL('../dist/server/oauth-flows.js',import.meta.url).href;
  const run = () => new Promise((resolve,reject) => {
    const child = spawn(process.execPath,['--input-type=module','-e',
      `import {OAuthFlows} from ${JSON.stringify(moduleUrl)}; process.stdout.write(new OAuthFlows(process.argv[1]).consume(process.argv[2]) ? 'claimed' : 'refused');`,dir,racing.state],
      {stdio:['ignore','pipe','pipe']});
    let out='',err=''; child.stdout.on('data',v=>out+=v); child.stderr.on('data',v=>err+=v);
    child.on('error',reject); child.on('exit',code=>code===0?resolve(out):reject(new Error(err)));
  });
  assert.deepEqual((await Promise.all([run(),run()])).sort(),['claimed','refused'],
    'exactly one callback succeeds across separate Node processes');
  const stale = fresh(); before.save(stale);
  fs.utimesSync(path.join(dir,stale.state+'.json'),new Date(0),new Date(0));
  before.sweep(); assert.equal(before.consume(stale.state),undefined);
  console.log('OAuth state: restart, PKCE, replay, concurrent claim, expiry, corrupt input and cleanup passed.');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
