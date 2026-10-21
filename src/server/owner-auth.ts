// Optional password gate for a remotely hosted Pixel Office.
// Keep this in front of HTTP *and* WebSocket entry points: employees can execute shell commands.
import crypto from "node:crypto";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { IncomingMessage } from "node:http";

const COOKIE = "hq_session";
const SESSION_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_ATTEMPTS = 20;

export function createOwnerAuth(password: string | undefined, remote: boolean) {
  const secret = password?.trim() || "";
  if (remote && secret.length < 16) {
    throw new Error("Remote Pixel Office requires PIXEL_OFFICE_ACCESS_PASSWORD (at least 16 characters). Refusing unsafe public startup.");
  }
  const enabled = secret.length > 0;
  const passHash = crypto.createHash("sha256").update(secret).digest();
  const signingKey = crypto.createHash("sha256").update("pixel-office-owner-session-v1:").update(secret).digest();
  const attempts = new Map<string, { count: number; until: number }>();

  const sign = (text: string) => crypto.createHmac("sha256", signingKey).update(text).digest("hex");
  const issue = () => {
    const payload = "v1." + (Date.now() + SESSION_MS);
    return payload + "." + sign(payload);
  };
  const cookieValue = (req: IncomingMessage) => {
    const header = req.headers.cookie || "";
    for (const item of header.split(";")) {
      const [name, ...value] = item.trim().split("=");
      if (name === COOKIE) return value.join("=");
    }
    return "";
  };
  const valid = (req: IncomingMessage): boolean => {
    if (!enabled) return true;
    const token = cookieValue(req);
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "v1" || !/^\d{13}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
    const expiry = Number(parts[1]);
    if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + SESSION_MS) return false;
    const expected = Buffer.from(sign(parts[0] + "." + parts[1]), "hex");
    return crypto.timingSafeEqual(Buffer.from(parts[2], "hex"), expected);
  };
  const securityHeaders = (res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
  };
  const loginPage = (bad = false) => `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>恒輝 AI 總部｜私人登入</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 20% 10%,#26395c,#081321 70%);font-family:system-ui,"Noto Sans TC",sans-serif;color:#f5eddb;padding:20px}
main{background:#122137;padding:38px;max-width:420px;width:100%;border:1px solid #88734b;border-radius:20px;box-shadow:0 30px 70px #0006}
small{color:#d2b675;letter-spacing:.2em}h1{font-size:27px;line-height:1.3;margin:14px 0}p{color:#b8c7d5}label{display:block;margin-top:25px;font-weight:600}
input{width:100%;padding:14px 16px;border:1px solid #8191a6;border-radius:10px;background:#0b1929;color:white;font-size:18px;margin:10px 0 20px}
button{width:100%;border:0;border-radius:10px;padding:14px;background:#e4bb6e;color:#172337;font-weight:800;font-size:16px;cursor:pointer}
.error{color:#ffc1b8;font-weight:700}footer{margin-top:20px;color:#8c9bae;font-size:12px}
</style></head><body><main><small>HANG FAI · PRIVATE OFFICE</small><h1>恒輝 AI 總部</h1><p>私人工作空間，請輸入你設定嘅辦公室密碼。</p>${bad ? '<p class="error">密碼唔正確，請再試。</p>' : ''}
<form method="post" action="/login"><label for="password">辦公室密碼</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">登入 AI 總部 →</button></form>
<footer>為安全起見，未登入前無法存取任務、對話或控制 AI 員工。</footer></main></body></html>`;

  function routes(app: Express) {
    if (!enabled) return;
    app.get("/login", (req, res) => {
      securityHeaders(res);
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
      if (valid(req)) return res.redirect(303, "/");
      res.type("html").send(loginPage());
    });
    app.post("/login", express.urlencoded({ extended: false, limit: "2kb" }), (req, res) => {
      securityHeaders(res);
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
      const key = req.ip || "unknown";
      const now = Date.now();
      if (attempts.size > 5000) attempts.clear();
      let attempt = attempts.get(key);
      if (!attempt || attempt.until < now) attempt = { count: 0, until: now + LOGIN_WINDOW_MS };
      attempt.count++;
      attempts.set(key, attempt);
      if (attempt.count > LOGIN_ATTEMPTS) return res.status(429).type("html").send(loginPage(true));
      const supplied = crypto.createHash("sha256").update(String(req.body?.password || "")).digest();
      if (!crypto.timingSafeEqual(supplied, passHash)) return res.status(401).type("html").send(loginPage(true));
      attempts.delete(key);
      res.setHeader("Set-Cookie", COOKIE + "=" + issue() + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200" + (remote ? "; Secure" : ""));
      res.redirect(303, "/");
    });
    app.post("/logout", (req, res) => {
      securityHeaders(res);
      res.setHeader("Set-Cookie", COOKIE + "=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" + (remote ? "; Secure" : ""));
      res.redirect(303, "/login");
    });
  }

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();
    securityHeaders(res);
    if (req.path === "/login" || req.path === "/healthz") return next();
    if (!valid(req)) {
      if (req.method === "GET" && (req.accepts("html") || "").includes("html")) {
        return res.redirect(303, "/login");
      }
      res.status(401).json({ error: "Login required" });
      return;
    }
    next();
  };

  return { enabled, middleware, routes, verify: valid };
}

// Some in-app browsers use an opaque ("null") Origin for same-window forms,
// fetches and WebSocket upgrades. A valid owner's signed, SameSite=Strict
// session cookie can be accepted with that Origin; a foreign named Origin is
// still refused by the standard guard. The unauthenticated exception is only
// the rate-limited password form, not task execution or agent WebSockets.
export function allowEmbeddedOwnerRequest(
  req: IncomingMessage,
  auth: ReturnType<typeof createOwnerAuth>,
  hostOk: (host: string | undefined) => boolean,
): boolean {
  if (req.headers.origin !== "null" || !hostOk(req.headers.host)) return false;
  if (auth.enabled && auth.verify(req)) return true;
  const target = (req.url || "").split("?")[0];
  return req.method === "POST" && target === "/login" &&
    String(req.headers["content-type"] || "").startsWith("application/x-www-form-urlencoded");
}
