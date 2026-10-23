// Launch a short-lived, password-protected Vercel Sandbox demo of Hang Fai HQ.
// The credential remains in a private file outside Git. Never used for Railway production.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.argv[2] || "";
if (!/^[a-z0-9-]+\.vercel\.run$/.test(host)) throw new Error("Expected one official preview hostname");
const secretFile = "/tmp/hq-department-password";
if (!fs.existsSync(secretFile)) throw new Error("No private password file");
const password = fs.readFileSync(secretFile, "utf8").trim();
if (password.length < 16) throw new Error("Preview password too short");
const output = fs.openSync("/tmp/hq-departments.log", "a");
const child = spawn(process.execPath, ["dist/server/index.js"], {
  cwd: root, detached: true, stdio: ["ignore", output, output],
  env: {
    ...process.env,
    HOST: "0.0.0.0", PORT: "4747",
    PIXEL_OFFICE_ALLOW_REMOTE: "1",
    PIXEL_OFFICE_PROJECT: root,
    PIXEL_OFFICE_ALLOWED_HOSTS: host + ":80," + host + ":443",
    PIXEL_OFFICE_ACCESS_PASSWORD: password
  }
});
child.unref();
fs.closeSync(output);
fs.writeFileSync("/tmp/hq-departments.pid", String(child.pid));
console.log("Secure Hang Fai preview started; pid=" + child.pid + ", hostname=" + host);
