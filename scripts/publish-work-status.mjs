// Explicit non-sensitive progress only: never pass mail, customer data or tool arguments.
import fs from 'node:fs';
const [status,summary]=process.argv.slice(2);
if(!['working','done','blocked'].includes(status)||!summary||summary.length>180)throw Error('Use status plus a non-sensitive summary under 180 characters');
fs.writeFileSync(new URL('../web/work-status.json',import.meta.url),JSON.stringify({status,summary,source:'本專案 Codex 工作對話',updatedAt:Date.now()}));
