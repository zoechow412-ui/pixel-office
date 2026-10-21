// Regression checks for the one-click Hang Fai Codespaces preview.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const config = JSON.parse(read(".devcontainer/devcontainer.json"));
assert.equal(config.portsAttributes["4747"].visibility, "private", "Codespaces preview must remain private");
assert.equal(config.portsAttributes["4747"].onAutoForward, "openBrowser");
assert.equal(config.postStartCommand, "bash .devcontainer/start-office.sh");
assert.equal(config.postCreateCommand, "bash .devcontainer/setup.sh");

const start = read(".devcontainer/start-office.sh");
assert.ok(start.includes("HOST=127.0.0.1"), "Server must stay on loopback");
assert.ok(start.includes("PIXEL_OFFICE_ALLOWED_HOSTS"), "Private port proxy must be recognized");
assert.ok(start.includes("PIXEL_OFFICE_PROJECT"), "Server must use a project-scoped workspace");

const index = read("web/index.html");
assert.match(index, /href="hq.css"/);
assert.match(index, /src="hq.js"/);
for (const id of ["hqTeam", "hqTasks", "hqCountPeople", "hqCountWorking", "hqCountAction"]) {
  assert.ok(index.includes('id="' + id + '"'), "Missing UI target " + id);
}
const parse = spawnSync(process.execPath, ["--check", path.join(root, "web/hq.js")], { encoding: "utf8" });
assert.equal(parse.status, 0, parse.stderr);

if (process.platform !== "win32") {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "hang-fai-office-test-"));
  try {
    fs.mkdirSync(path.join(sandbox, ".devcontainer"), { recursive: true });
    fs.copyFileSync(path.join(root, ".devcontainer/seed-agents.sh"), path.join(sandbox, ".devcontainer/seed-agents.sh"));
    const run = () => {
      const proc = spawnSync("bash", [".devcontainer/seed-agents.sh"], { cwd: sandbox, encoding: "utf8" });
      assert.equal(proc.status, 0, proc.stderr || proc.stdout);
    };
    run();
    const agentsRoot = path.join(sandbox, ".pixel-office/employees/hang-fai");
    for (const id of ["manager", "developer", "researcher", "marketing"]) {
      const f = path.join(agentsRoot, id, "agent.md");
      assert.ok(fs.existsSync(f), "Employee not in configured office folder: " + id);
      const contents = fs.readFileSync(f, "utf8");
      assert.match(contents, /^---\nname: /, "Invalid agent front matter");
      assert.match(contents, /model: /, "Model missing for agent " + id);
    }
    const agent = path.join(agentsRoot, "manager");
    const oldAgent = path.join(sandbox, ".pixel-office/employees/manager");
    fs.renameSync(agent, oldAgent);
    run();
    assert.ok(fs.existsSync(path.join(agent, "agent.md")), "Previously misplaced agent should be repaired");
    assert.ok(!fs.existsSync(oldAgent), "Misplaced directory should be moved");
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}
console.log("Hang Fai AI HQ preview checks passed.");
