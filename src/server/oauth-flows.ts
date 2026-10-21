import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface OAuthFlow {
  id: string;
  state: string;
  redirectUrl: string;
  verifier?: string;
  at: number;
}

// Keep PKCE state across process restarts. This directory must live on durable
// storage in a hosted deployment; it is not a replacement for shared storage.
// Atomic rename claims a callback exactly once, including across processes.
export class OAuthFlows {
  constructor(private dir: string, private ttl = 10 * 60_000) {}

  private filename(state: string) {
    if (!/^[a-f0-9]{48}$/.test(state)) return undefined;
    return path.join(this.dir, state + ".json");
  }

  save(flow: OAuthFlow) {
    const file = this.filename(flow.state);
    if (!file) throw new Error("Invalid OAuth state");
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    const tmp = file + ".tmp-" + crypto.randomBytes(8).toString("hex");
    try {
      fs.writeFileSync(tmp, JSON.stringify(flow), { mode: 0o600, flag: "wx" });
      fs.renameSync(tmp, file);
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  }

  remove(state: string) {
    const file = this.filename(state);
    if (file) try { fs.unlinkSync(file); } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  consume(state: string): OAuthFlow | undefined {
    const file = this.filename(state);
    if (!file) return undefined;
    const claim = file + ".claim-" + crypto.randomBytes(8).toString("hex");
    try { fs.renameSync(file, claim); } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw err;
    }
    try {
      const f = JSON.parse(fs.readFileSync(claim, "utf8")) as OAuthFlow;
      if (!f || typeof f !== "object") return undefined;
      const age = Date.now() - f.at;
      if (f.state !== state || typeof f.id !== "string" ||
          typeof f.redirectUrl !== "string" || typeof f.verifier !== "string" ||
          !f.verifier || !Number.isFinite(age) || age < 0 || age > this.ttl) return undefined;
      return f;
    } catch (err) {
      if (err instanceof SyntaxError) return undefined;
      throw err;
    } finally { fs.unlinkSync(claim); }
  }

  sweep() {
    let names: string[];
    try { names = fs.readdirSync(this.dir); } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }
    for (const name of names) {
      if (!/^[a-f0-9]{48}\.json(?:\.(?:claim|tmp)-[a-f0-9]{16})?$/.test(name)) continue;
      const file = path.join(this.dir, name);
      try {
        if (Date.now() - fs.statSync(file).mtimeMs > this.ttl) fs.unlinkSync(file);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
  }
}
