"use strict";
/*
 * Niko Dashboard API — Express server that runs INSIDE the bot process.
 * Shares the live discord.js client + Sequelize DB, so every number the
 * dashboard shows is real. Zero demo/fake data: if something is not
 * available yet, endpoints return null / [] and UI shows "—".
 *
 * Auth:
 *   - Users log in via Discord OAuth2 (identify + guilds).
 *   - /admin additionally requires login + password (dashboard-config.js).
 *
 * Everything is served on the same host/port as the bot process.
 */

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const process = require("process");
const cfg = require("./dashboard-config");
const telegram = require("./telegram");
/* The bot's own config: source of truth for OWNER_ID, PREFIX, STATUS, etc. */
const botConfig = require("./config");
/* Persistent runtime settings (dashboard_settings table) */
const settings = require("./lib/settings");
/* Dashboard admin accounts (dashboard_admins table, scrypt-hashed) */
const adminAccounts = require("./lib/adminAccounts");
/* Fallback for sessions created before per-account permissions existed. */
const ALL_PERMS_VALUE = adminAccounts.ALL_PERMS;

/* ------------------------------ vlogs store ------------------------------- */
// Persistent JSON store so admin-written vlogs survive bot restarts.
const VLOGS_FILE = path.join(__dirname, "data", "vlogs.json");

function loadVlogs() {
  try {
    const raw = fs.readFileSync(VLOGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVlogs(list) {
  try {
    fs.mkdirSync(path.dirname(VLOGS_FILE), { recursive: true });
    fs.writeFileSync(VLOGS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("[dashboard] failed to save vlogs:", e.message);
  }
}

const DISCORD_API = "https://discord.com/api/v10";
const OAUTH_SCOPES = "identify guilds";
const CLIENT_ID = cfg.DISCORD_CLIENT_ID;
const CLIENT_SECRET = cfg.DISCORD_CLIENT_SECRET;

function buildAuthorizeUrl(state, redirectUri) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES,
    state,
    prompt: "consent",
  });
  return `${DISCORD_API}/oauth2/authorize?${params}`;
}

async function exchangeCode(code, redirectUri) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchMe(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchUserGuilds(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds?with_counts=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  return res.json();
}

function createDashboardServer(client, models) {
  const app = express();
  app.disable("x-powered-by");
  /* gzip every response above 1kb: the SPA bundle and JSON payloads shrink
   * ~70%, which matters on slow VPS uplink under load. */
  app.use(require("compression")({ threshold: 1024 }));
  // Behind nginx/Cloudflare/tunnels req.protocol would report "http" and break
  // the OAuth redirect_uri match — trust the proxy headers instead.
  app.set("trust proxy", 1);
  /* Body size cap: default 100kb is generous for this API; 32kb comfortably
   * fits every legitimate payload (vlog bodies are capped at 8000 chars) and
   * shrinks the DoS surface for unauthenticated JSON posts. */
  app.use(express.json({ limit: "32kb" }));

  const startTime = Date.now();
  const telemetry = []; // rolling memory/ping/guilds history
  const cmdStats = new Map(); // commandName -> { uses, lastUsed, users:Set }
  const EVENT_LOG = []; // in-memory audit of dashboard admin actions
  const guildCache = new Map(); // user -> { guilds, ts }
  const BOT_LOGS = []; // live gateway activity feed (real events only)

  /*
   * Some models (SupportTicket, Blacklist, …) are plain objects that wrap the
   * real Sequelize model in `.model`. Unwrap them once here so `models.X.findAll()`
   * works identically in the bot process and in standalone mode. Before this,
   * support tickets and the blacklist silently failed when running client.js.
   */
  {
    const normalized = {};
    for (const [name, val] of Object.entries(models || {})) {
      normalized[name] =
        val && typeof val === "object" && val.model && typeof val.model.findAll === "function"
          ? val.model
          : val;
    }
    models = normalized;
  }

  /* Real row counts per table (used by the admin «База данных» tab). */
  async function tableCounts() {
    const out = [];
    for (const [name, model] of Object.entries(models || {})) {
      if (!model || typeof model.count !== "function" || !model.getTableName) continue;
      const table = String(model.getTableName());
      try {
        out.push({ model: name, table, rows: await model.count() });
      } catch (e) {
        out.push({ model: name, table, rows: null, error: "count_unavailable" });
      }
    }
    out.sort((a, b) => (b.rows ?? -1) - (a.rows ?? -1));
    return out;
  }

  function botLog(level, text) {
    BOT_LOGS.unshift({ ts: Date.now(), level, text: String(text).slice(0, 300) });
    if (BOT_LOGS.length > 150) BOT_LOGS.pop();
  }
  botLog("info", "Дашборд запущен");

  function audit(action, details) {
    EVENT_LOG.unshift({ id: crypto.randomUUID(), action, details, ts: Date.now() });
    if (EVENT_LOG.length > 200) EVENT_LOG.pop();
    botLog("admin", `${action} — ${details ?? ""}`);
  }

  app.use(
    session({
      secret: cfg.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      /* rolling: each authenticated request extends the window, so an active
       * owner isn't logged out mid-work, while idle sessions still expire. */
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        /* "auto": Secure is set automatically when the request is https
         * (behind a proxy) and omitted on plain http — works for both
         * http://IP:port and https://domain deployments. */
        secure: "auto",
      },
    })
  );

  /* ---------------------------- security headers --------------------------- */
  // Baseline hardening (security-scan skill): no sniffing, no framing, tight referrer.
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  /* ------------------------- DDoS / flood protection ----------------------- */
  // Two layers:
  //   1. burst guard — a small token bucket per IP that absorbs short spikes
  //      (page loads fire several parallel API calls) without page-breaking;
  //   2. sustained guard — requests-per-minute per IP; crossing it escalates:
  //      first warnings, then a 10-minute cooldown for that IP, and every
  //      escalation is pushed to Telegram so the owner sees an attack live.
  const ddos = {
    burst: new Map(), // ip -> { tokens, last }
    sustained: new Map(), // ip -> number[] timestamps (last 60s)
    cooldowns: new Map(), // ip -> untilTs
    alerts: new Map(), // ip -> lastAlertTs
    stats: { blocked: 0, flagged: 0, cooldowns: 0 },
  };
  const BURST_CAPACITY = 40; // tokens; refills 20/sec
  const SUSTAINED_LIMIT = 300; // requests / minute / ip
  const COOLDOWN_MS = 10 * 60 * 1000;
  const ALERT_DEDUPE_MS = 2 * 60 * 1000; // one Telegram alert per IP per 2min

  function clientIp(req) {
    return req.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "?";
  }

  function ddosAlert(level, ip, detail) {
    if (!telegram.isConfigured()) return;
    const now = Date.now();
    const last = ddos.alerts.get(ip) ?? 0;
    if (now - last < ALERT_DEDUPE_MS) return; // do not flood Telegram either
    ddos.alerts.set(ip, now);
    void telegram.events.ddosAlert(level, ip, detail, { ...ddos.stats });
  }

  setInterval(() => {
    const now = Date.now();
    for (const [ip, ts] of ddos.cooldowns) if (ts <= now) ddos.cooldowns.delete(ip);
    for (const [ip, arr] of ddos.sustained) {
      const fresh = arr.filter((t) => now - t < 60_000);
      if (fresh.length === 0) ddos.sustained.delete(ip);
      else ddos.sustained.set(ip, fresh);
    }
    for (const [ip, t] of ddos.alerts) if (now - t > 30 * 60_000) ddos.alerts.delete(ip);
  }, 60_000).unref();

  app.use((req, res, next) => {
    const ip = clientIp(req);
    const now = Date.now();

    // currently cooling down after abuse
    const until = ddos.cooldowns.get(ip);
    if (until && until > now) {
      ddos.stats.blocked += 1;
      res.setHeader("Retry-After", Math.ceil((until - now) / 1000));
      return res.status(429).json({ error: "Слишком много запросов. Подождите немного." });
    }

    // burst bucket (only counts API/auth paths; static assets are cheap)
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
      let bucket = ddos.burst.get(ip);
      if (!bucket) { bucket = { tokens: BURST_CAPACITY, last: now }; ddos.burst.set(ip, bucket); }
      bucket.tokens = Math.min(BURST_CAPACITY, bucket.tokens + ((now - bucket.last) / 1000) * 20);
      bucket.last = now;
      if (bucket.tokens < 1) {
        ddos.stats.flagged += 1;
        ddosAlert("burst", ip, `всплеск запросов (${Math.round(bucket.tokens)}/${BURST_CAPACITY})`);
        return res.status(429).json({ error: "Слишком быстро. Притормозите." });
      }
      bucket.tokens -= 1;

      // sustained window
      const arr = (ddos.sustained.get(ip) || []).filter((t) => now - t < 60_000);
      arr.push(now);
      ddos.sustained.set(ip, arr);
      if (arr.length > SUSTAINED_LIMIT) {
        ddos.cooldowns.set(ip, now + COOLDOWN_MS);
        ddos.stats.cooldowns += 1;
        ddos.sustained.delete(ip);
        ddosAlert("ALERT", ip, `превышен лимит ${SUSTAINED_LIMIT} req/min — IP в cooldown на 10 минут`);
        return res.status(429).json({ error: "Доступ временно ограничен (10 минут)." });
      }
    }

    next();
  });

  /* ------------------------ CSRF defense-in-depth -------------------------- */
  // Session cookie is SameSite=Lax already; additionally reject cross-origin
  // state-changing requests by checking Origin when the header is present.
  const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  app.use((req, res, next) => {
    if (!MUTATING.has(req.method)) return next();
    const origin = req.get("origin");
    if (!origin) return next(); // same-origin fetch/curl without Origin
    const host = req.get("x-forwarded-host") || req.get("host");
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: "Cross-origin запрос запрещён" });
      }
    } catch {
      return res.status(403).json({ error: "Некорректный Origin" });
    }
    next();
  });

  /* -------------------------- brute-force protection ----------------------- */
  // Sliding window per IP for the admin login endpoint (security-review skill).
  const loginAttempts = new Map(); // ip -> number[] timestamps
  function loginRateLimited(ip) {
    const now = Date.now();
    const arr = (loginAttempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
    loginAttempts.set(ip, arr);
    return arr.length >= 8;
  }
  function recordLoginAttempt(ip) {
    const arr = loginAttempts.get(ip) || [];
    arr.push(Date.now());
    loginAttempts.set(ip, arr);
  }
  setInterval(() => {
    const now = Date.now();
    for (const [ip, arr] of loginAttempts) {
      const fresh = arr.filter((t) => now - t < 15 * 60 * 1000);
      if (fresh.length === 0) loginAttempts.delete(ip);
      else loginAttempts.set(ip, fresh);
    }
  }, 5 * 60 * 1000).unref();

  /* ------------------------------- helpers -------------------------------- */

  /* Generic per-user sliding-window limiter for expensive authenticated
   * actions (support tickets, giveaways). Prevents spam that would turn into
   * real Discord messages / DB rows. */
  const actionHits = new Map(); // key -> number[] timestamps
  function actionLimited(key, max, windowMs) {
    const now = Date.now();
    const arr = (actionHits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    actionHits.set(key, arr);
    return arr.length > max;
  }
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of actionHits) {
      const fresh = arr.filter((t) => now - t < 60 * 60 * 1000);
      if (fresh.length === 0) actionHits.delete(k);
      else actionHits.set(k, fresh);
    }
  }, 10 * 60 * 1000).unref();

  /* Timing-safe string comparison via SHA-256 (avoids length leaks). */
  function safeEqual(a, b) {
    const ha = crypto.createHash("sha256").update(String(a)).digest();
    const hb = crypto.createHash("sha256").update(String(b)).digest();
    try {
      return crypto.timingSafeEqual(ha, hb);
    } catch {
      return false;
    }
  }

  /* Owner fallback: when dedicated admin credentials are not configured, the
   * bot owner (OWNER_ID) signed in via Discord keeps full admin access. This
   * used to hard-503 the whole panel with no way in — now the owner is never
   * locked out, while password auth remains the primary path once configured. */
  /* Owner of the bot: env wins, else fall back to the bot config (the same
   * id that gates owner-only commands). Previously the dashboard only read
   * process.env.OWNER_ID, so an owner configured in bot/src/config.js could
   * never reach the admin panel without extra env setup. */
  const OWNER_ID = process.env.OWNER_ID || (typeof botConfig?.OWNER_ID === "string" && botConfig.OWNER_ID) || "";
  function isOwner(req) {
    return Boolean(OWNER_ID && req.session?.user?.id && req.session.user.id === OWNER_ID);
  }

  function hasAdminCredentials() {
    return Boolean(cfg.ADMIN_LOGIN && (cfg.ADMIN_PASSWORD || cfg.ADMIN_PASSWORD_HASH));
  }

  function checkPassword(password) {
    // Runtime password changes are intentionally memory-only.
    if (cfg.adminPasswordOverride) return safeEqual(password, cfg.adminPasswordOverride);
    if (cfg.ADMIN_PASSWORD_HASH) {
      const expected = String(cfg.ADMIN_PASSWORD_HASH).toLowerCase().replace(/[^0-9a-f]/g, "");
      if (!/^[0-9a-f]{64}$/.test(expected)) return false;
      const actual = crypto.createHash("sha256").update(String(password)).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
    }
    return Boolean(cfg.ADMIN_PASSWORD) && safeEqual(password, cfg.ADMIN_PASSWORD);
  }

  function avatarUrl(user) {
    if (!user) return null;
    if (user.avatar)
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    const idx = (BigInt(user.id) >> BigInt(22)) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  function canManage(permBigInt) {
    return (permBigInt & 0x8n) === 0x8n || (permBigInt & 0x20n) === 0x20n;
  }

  function trackCommand(name, userId) {
    const cur = cmdStats.get(name) || { uses: 0, lastUsed: 0, users: new Set() };
    cur.uses += 1;
    cur.lastUsed = Date.now();
    cur.users.add(userId);
    cmdStats.set(name, cur);
  }

  /* Total command count across ALL registries: slash (client.commands),
   * prefix aliases included in client.prefixCommands (name+aliases), plus
   * hybrid commands (they live in BOTH maps — counted once via slash side).
   * The old "60" was slash-only while the bot actually ships 280+ commands. */
  function totalCommandCount() {
    const slash = client?.commands?.size ?? 0;
    const prefixUnique = client?.prefixCommands
      ? new Set([...client.prefixCommands.values()].map((c) => c.name)).size
      : 0;
    return slash + prefixUnique;
  }

  /* Unique prefix-registry command count (aliases collapse to one command). */
  function prefixCommandCount() {
    return client?.prefixCommands
      ? new Set([...client.prefixCommands.values()].map((c) => c.name)).size
      : 0;
  }

  function snapshot() {
    const mem = process.memoryUsage();
    return {
      t: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      memory: Math.round(mem.rss / 1024 / 1024),
      ping: client?.ws?.ping && Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : 0,
      guilds: client?.guilds?.cache.size ?? 0,
      users: client ? client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0) : 0,
    };
  }

  // record telemetry snapshot every 30s so charts always have real history
  setInterval(() => {
    telemetry.push(snapshot());
    if (telemetry.length > 120) telemetry.shift();
  }, 30000).unref();

  /* --------------------------------- hooks -------------------------------- */

  // Track real command usage from the bot's interactionCreate flow
  if (client) {
    client.on("interactionCreate", (interaction) => {
      if (interaction.isChatInputCommand()) {
        trackCommand(interaction.commandName, interaction.user.id);
        botLog("cmd", `/${interaction.commandName} — ${interaction.user.tag}`);
      }
    });

    /* --------------------------- telegram notifications --------------------- */

    client.on("guildCreate", (g) => {
      botLog("success", `Добавлен на сервер: ${g.name} (${g.memberCount ?? "?"} участников)`);
      void telegram.events.guildJoin(g.name, g.id, g.memberCount ?? 0);
    });

    client.on("guildDelete", (g) => {
      botLog("warn", `Удалён с сервера: ${g.name}`);
      void telegram.events.guildLeave(g.name, g.id);
    });

    client.on("error", (err) => {
      botLog("error", `Discord client: ${err?.message ?? String(err)}`);
      if (cfg.TELEGRAM_NOTIFY_ERRORS) void telegram.events.error("Discord client", err?.message ?? String(err));
    });

    client.on("warn", (info) => botLog("warn", `Discord warn: ${info}`));
    client.on("shardDisconnect", (_ev, id) => botLog("error", `Шард ${id} отключился`));
    client.on("shardResume", (_ev, id) => botLog("success", `Шард ${id} восстановился`));
    client.on("shardReady", (id) => botLog("success", `Шард ${id} готов`));
  }

  if (cfg.TELEGRAM_NOTIFY_ERRORS) {
    process.on("unhandledRejection", (reason) => {
      void telegram.events.error("unhandledRejection", reason?.message ?? String(reason));
    });
  }

  /* ------------------------------ auth helpers ---------------------------- */

  function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    req.user = req.session.user;
    next();
  }

  /*
   * Admin session guard. A signed-in Discord owner always passes (full
   * rights). Otherwise the session must carry adminAuthed=true from the
   * login page (env credentials or a dashboard_admins account).
   */
  function requireAdminSession(req, res, next) {
    if (req.session?.user && isOwner(req)) return next();
    if (req.session && req.session.adminAuthed === true) return next();
    /* DB accounts (dashboard_admins) always exist after startup seeding, so
     * there is always a way in: Discord (owner) or the login page. */
    res.status(401).json({ error: "Требуется вход администратора", code: "admin_auth_required" });
  }

  /* Permission gate for specific admin capabilities. Owner (Discord session)
   * always passes; account admins need the matching bit in session.perms. */
  function requirePerm(perm) {
    return (req, res, next) => {
      if (req.session?.user && isOwner(req)) return next();
      if (req.session?.adminAuthed === true) {
        const perms = Number(req.session.adminPerms ?? ALL_PERMS_VALUE);
        if (Number.isFinite(perms) && (perms & adminAccounts.PERMS[perm]) !== 0) return next();
        return res.status(403).json({ error: "Нет прав на это действие" });
      }
      return requireAdminSession(req, res, next);
    }
  }

  /*
   * Redirect URI priority:
   *   1. DASHBOARD_REDIRECT_URI from .env (pin it on one-host deployments)
   *   2. derived from the incoming request (works for any domain/proxy)
   * The SAME value must be whitelisted in the Discord Developer Portal →
   * OAuth2 → Redirects. /api/oauth-info shows the exact string to paste.
   */
  function redirectUriFor(req) {
    if (cfg.DASHBOARD_REDIRECT_URI) return cfg.DASHBOARD_REDIRECT_URI;
    const host = req.get("x-forwarded-host") || req.get("host");
    return `${req.protocol}://${host}/auth/callback`;
  }

  /* ------------------------------ Discord OAuth --------------------------- */

  app.get("/auth/login", (req, res) => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res
        .status(500)
        .send("OAuth не настроен: задайте DISCORD_CLIENT_ID и DISCORD_CLIENT_SECRET в .env");
    }
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;
    res.redirect(buildAuthorizeUrl(state, redirectUriFor(req)));
  });

  app.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      return res.status(400).send("Неверный state — попробуйте войти снова");
    }
    delete req.session.oauthState;

    const token = await exchangeCode(String(code), redirectUriFor(req));
    if (!token) return res.status(502).send("Discord не выдал токен");
    const me = await fetchMe(token.access_token);
    if (!me) return res.status(502).send("Не удалось получить профиль Discord");

    req.session.user = {
      id: String(me.id),
      username: me.global_name || me.username,
      avatar: avatarUrl(me),
    };
    req.session.accessToken = token.access_token;
    req.session.refreshToken = token.refresh_token;
    guildCache.set(String(me.id), { guilds: null, ts: 0 });
    req.session.save(() => res.redirect("/dashboard"));
  });

  app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  });

  app.get("/auth/me", (req, res) => {
    res.json({
      user: req.session?.user ?? null,
      isAdmin: req.session?.adminAuthed === true || (req.session?.user ? isOwner(req) : false),
    });
  });

  /* ----------------------------- admin auth (login+pass) ------------------ */

  app.post("/auth/admin-login", async (req, res) => {
    if (loginRateLimited(clientIp(req))) {
      audit("admin_login_ratelimit", `IP ${clientIp(req)}`);
      void telegram.events.adminLoginFailed(clientIp(req));
      return res.status(429).json({ error: "Слишком много попыток. Подождите 15 минут." });
    }
    // Discord-signed-in owner can enter without the admin password when no
    // dedicated credentials exist (otherwise the panel would be unreachable).
    if (req.session?.user && isOwner(req)) {
      req.session.adminAuthed = true;
      audit("admin_login_owner", `IP ${clientIp(req)}`);
      return res.json({ ok: true });
    }
    const { login, password } = req.body || {};
    const badInput =
      typeof login !== "string" || typeof password !== "string" ||
      login.length < 1 || login.length > 64 ||
      password.length < 1 || password.length > 128;
    if (badInput) {
      recordLoginAttempt(clientIp(req));
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    /* 1) Dashboard accounts (dashboard_admins): per-account permissions are
     *    stored in the session so every guarded route can check them. */
    const acct = await adminAccounts.checkAccount(login, password);
    if (acct.ok) {
      req.session.adminAuthed = true;
      req.session.adminLogin = acct.login;
      req.session.adminPerms = acct.isOwner ? adminAccounts.ALL_PERMS : Number(acct.perms) || 0;
      audit("admin_login", `IP ${clientIp(req)} · ${acct.login}`);
      void telegram.events.adminLogin(clientIp(req), acct.login);
      return res.json({ ok: true });
    }
    if (acct.noPassword && acct.isOwner) {
      /* The owner row exists but has no password yet: they sign in through
       * Discord and set one from the Accounts tab. */
      return res.status(409).json({ error: "У овнера ещё нет пароля — войдите через Discord и задайте его во вкладке «Аккаунты»" });
    }

    /* 2) Legacy env credentials still work as a super-admin fallback. */
    if (
      hasAdminCredentials() &&
      safeEqual(login, cfg.ADMIN_LOGIN) &&
      checkPassword(password)
    ) {
      req.session.adminAuthed = true;
      req.session.adminPerms = adminAccounts.ALL_PERMS;
      audit("admin_login_env", `IP ${clientIp(req)}`);
      void telegram.events.adminLogin(clientIp(req), login);
      return res.json({ ok: true });
    }

    recordLoginAttempt(clientIp(req));
    audit("admin_login_failed", `IP ${clientIp(req)}`);
    void telegram.events.adminLoginFailed(clientIp(req));
    return res.status(401).json({ error: "Неверный логин или пароль" });
  });

  app.post("/auth/admin-logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  /* ------------------------------- public API ----------------------------- */

  app.get("/api/status", (req, res) => {
    res.json({ bot: { ...snapshot(), online: client?.isReady?.() ?? false, uptimeSec: Math.floor((Date.now() - startTime) / 1000), name: client?.user?.username ?? cfg.BOT_NAME, tag: client?.user?.tag ?? null, id: client?.user?.id ?? null, avatar: avatarUrl(client?.user), channels: client?.channels?.cache.size ?? 0, commands: totalCommandCount(), status: client?.isReady?.() ? "online" : "offline" },      host: { memoryMb: snapshot().memory, nodeVersion: process.version, platform: process.platform, shards: client ? [...(client.ws.shards?.values() ?? [])].map((s) => ({ id: s.id, status: s.status, ping: Number.isFinite(s.ping) ? s.ping : null })) : [] }, timestamp: new Date().toISOString() });
  });

  /* Shows the exact Redirect URI to whitelist in the Discord Developer Portal */
  app.get("/api/oauth-info", (req, res) => {
    const redirectUri = redirectUriFor(req);
    res.json({
      configured: Boolean(CLIENT_ID && CLIENT_SECRET),
      redirectUri,
      envExample: `DASHBOARD_REDIRECT_URI=${redirectUri}`,
    });
  });

  /* Real process metrics for any signed-in dashboard user (no admin needed). */
  app.get("/api/metrics", requireAuth, (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      memoryMb: Math.round(mem.rss / 1024 / 1024),
      heapMb: Math.round(mem.heapUsed / 1024 / 1024),
      ping: client?.ws?.ping ?? null,
      guilds: client?.guilds?.cache.size ?? 0,
      users: client ? client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0) : 0,
      channels: client?.channels?.cache.size ?? 0,
      commands: totalCommandCount(),
      commandsSlash: client?.commands?.size ?? 0,
      commandsPrefix: prefixCommandCount(),
      telemetry,
      commandUsage: [...cmdStats.entries()].sort((a, b) => b[1].uses - a[1].uses).slice(0, 10).map(([name, s]) => ({ name, uses: s.uses, users: s.users.size, lastUsed: s.lastUsed })),
      totalCommandUses: [...cmdStats.values()].reduce((a, s) => a + s.uses, 0),
    });
  });

  /* Live gateway activity feed — OWNER ONLY. These are bot internals
   * (dashboard boot, shards, gateway errors); regular members have no
   * business seeing them, so this requires the admin session.
   * Admin-actions are filtered out; the stream is real, never synthesized. */
  app.get("/api/activity", requireAdminSession, (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 60, 150);
    const items = BOT_LOGS.filter((l) => l.level !== "admin").slice(0, limit);
    res.json({ activity: items });
  });

  /* ---------------------------- user (OAuth) API --------------------------- */

  app.get("/api/me/guilds", requireAuth, async (req, res) => {
    const cached = guildCache.get(req.user.id);
    if (cached?.guilds && Date.now() - cached.ts < 60_000) {
      return res.json({ guilds: cached.guilds });
    }
    let userGuilds = [];
    try {
      userGuilds = await fetchUserGuilds(req.session.accessToken);
    } catch {
      userGuilds = [];
    }
    const result = [];
    for (const ug of userGuilds) {
      const perms = BigInt(ug.permissions || "0");
      const manager = canManage(perms) || ug.owner;
      if (!manager) continue;
      const g = client?.guilds?.cache.get(ug.id);
      if (g) {
        result.push({
          id: g.id, name: g.name,
          icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
          members: g.memberCount || 0, botPresent: true, role: ug.owner ? "owner" : "manager",
        });
      } else if (ug.owner || (perms & 0x20n) === 0x20n) {
        result.push({
          id: ug.id, name: ug.name,
          icon: ug.icon ? `https://cdn.discordapp.com/icons/${ug.id}/${ug.icon}.png?size=128` : null,
          members: ug.approximate_member_count || 0, botPresent: false, role: ug.owner ? "owner" : "manager",
          inviteUrl: `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID || client.user?.id || ""}&permissions=8&scope=bot%20applications.commands&guild_id=${ug.id}&disable_guild_select=true`,
        });
      }
    }
    result.sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));
    guildCache.set(req.user.id, { guilds: result, ts: Date.now() });
    res.json({ guilds: result });
  });

  app.get("/api/guilds/:id", requireAuth, async (req, res) => {
    const g = client?.guilds?.cache.get(req.params.id);
    if (!g) return res.status(404).json({ error: "Бот не на этом сервере" });
    const m = await g.members.fetch(req.user.id).catch(() => null);
    if (!m || !(canManage(m.permissions) || g.ownerId === req.user.id)) {
      return res.status(403).json({ error: "Нет прав управления на этом сервере" });
    }
    const channels = await g.channels.fetch().catch(() => null);
    const roles = await g.roles.fetch().catch(() => null);
    let config = null;
    try {
      config = (await models.GuildConfig.findOne({ where: { guildId: g.id } }))?.toJSON() ?? null;
    } catch { /* table may not exist */ }
    let modActions = [];
    try {
      modActions = (await models.ModLog.findAll({ where: { guildId: g.id }, order: [["createdAt", "DESC"]], limit: 25 })).map((r) => r.toJSON());
    } catch { /* ignore */ }
    /* Real per-guild module stats (tables giveaways/tickets/auto_react/…) */
    let stats = null;
    try {
      const [giveawaysTotal, giveawaysActive, ticketsOpen, ticketsTotal, autoReact, tempChannels] = await Promise.all([
        models.Giveaway.count({ where: { guildId: g.id } }),
        models.Giveaway.count({ where: { guildId: g.id, ended: false } }),
        models.Ticket.count({ where: { guildId: g.id, status: "open" } }),
        models.Ticket.count({ where: { guildId: g.id } }),
        models.AutoReact.count({ where: { guildId: g.id } }),
        models.TempChannel.count({ where: { guildId: g.id } }),
      ]);
      stats = { giveawaysTotal, giveawaysActive, ticketsOpen, ticketsTotal, autoReact, tempChannels };
    } catch { /* tables may be missing */ }
    let antinuke = null;
    try { const an = await models.AntinukeConfig.findOne({ where: { guildId: g.id } }); antinuke = an ? antinukeJson(an) : null; } catch { /* ignore */ }
    /* AI-chat channels + custom prefix (for the guild "Модули" tab) */
    let aiChannels = [];
    let prefix = null;
    try { aiChannels = Array.isArray(config?.aiChannelIds) ? config.aiChannelIds : []; } catch { /* ignore */ }
    try { prefix = (await models.GuildPrefix.getPrefix(g.id)) ?? null; } catch { /* ignore */ }
    let automod = null;
    try { const am = await models.AutomodConfig.findOne({ where: { guildId: g.id } }); automod = am ? automodJson(am) : null; } catch { /* ignore */ }
    res.json({
      id: g.id, name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` : null,
      owner: g.ownerId, members: g.memberCount || 0, createdAt: g.createdTimestamp,
      boosts: g.premiumSubscriptionCount || 0,
      channels: channels ? { text: channels.filter((c) => c.type === 0).size, voice: channels.filter((c) => c.type === 2).size, total: channels.size } : null,
      /* Real text-channel list for pickers (giveaway target, log channels). */
      textChannelList: channels
        ? channels.filter((c) => c.type === 0 && c.permissionsFor(g.members.me)?.has("SendMessages"))
            .sort((a, b) => a.rawPosition - b.rawPosition)
            .map((c) => ({ id: c.id, name: c.name }))
        : [],
      roles: roles?.size ?? null,
      features: g.features || [],
      config, modActions,
      stats,
      antinuke: antinuke ? { enabled: Boolean(antinuke.enabled), punishment: antinuke.punishment, threshold: antinuke.threshold } : null,
      automod: automod ? { enabled: Boolean(automod.enabled) } : null,
      aiChannels,
      prefix,
    });
  });

  /* ---- guild management: antinuke / automod (managers only) ----
   * These write the SAME rows the bot's gateway handlers read
   * (AntinukeConfig / AutomodConfig), so changes apply immediately —
   * no restart, no fakes. */

  const ANTINUKE_BOOLS = [
    "enabled", "antiBan", "antiKick", "antiChannelCreate", "antiChannelDelete",
    "antiRoleCreate", "antiRoleDelete", "antiRoleUpdate", "antiWebhook",
    "antiBot", "antiGuildUpdate", "antiEmoji", "antiChannelEdit",
  ];
  const ANTINUKE_INTS = ["threshold", "timeframe"];
  const ANTINUKE_PUNISHMENTS = ["stripall", "kick", "ban"];
  const AUTOMOD_BOOLS = [
    "enabled", "antiSpam", "antiLink", "antiInvite", "antiBadWords",
    "antiMassMention", "antiCaps", "antiPing",
  ];
  const AUTOMOD_INTS = ["spamThreshold", "spamInterval", "mentionLimit", "capsPercentage", "capsMinLength", "muteDuration"];
  const AUTOMOD_PUNISHMENTS = ["delete", "warn", "mute", "kick", "ban"];

  function antinukeJson(row) {
    const j = row.toJSON();
    const out = { enabled: Boolean(j.enabled), punishment: j.punishment, threshold: j.threshold, timeframe: j.timeframe };
    for (const k of ANTINUKE_BOOLS) if (k !== "enabled") out[k] = Boolean(j[k]);
    return out;
  }
  function automodJson(row) {
    const j = row.toJSON();
    const out = { enabled: Boolean(j.enabled), punishment: j.punishment, muteDuration: j.muteDuration };
    for (const k of AUTOMOD_BOOLS) if (k !== "enabled") out[k] = Boolean(j[k]);
    for (const k of ["spamThreshold", "spamInterval", "mentionLimit", "capsPercentage", "capsMinLength"]) out[k] = j[k];
    return out;
  }

  /* Resolves the guild and checks the Discord user can manage it. Responds and
   * returns null on failure; returns the guild on success. */
  const permCache = new Map(); // "uid:gid" -> { ok, ts }
  const PERM_CACHE_TTL = 60_000;

  async function getManagedGuild(req, res) {
    const g = client?.guilds?.cache.get(req.params.id);
    if (!g) { res.status(404).json({ error: "Бот не на этом сервере" }); return null; }
    /* Owner of the guild always passes without a member fetch. */
    if (g.ownerId !== req.user.id) {
      const key = `${req.user.id}:${g.id}`;
      const cached = permCache.get(key);
      let allowed = false;
      if (cached && Date.now() - cached.ts < PERM_CACHE_TTL) {
        allowed = cached.ok;
      } else {
        const m = await g.members.fetch(req.user.id).catch(() => null);
        allowed = Boolean(m && canManage(m.permissions));
        permCache.set(key, { ok: allowed, ts: Date.now() });
      }
      if (!allowed) {
        res.status(403).json({ error: "Нет прав управления на этом сервере" });
        return null;
      }
    }
    return g;
  }
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of permCache) if (now - v.ts > PERM_CACHE_TTL * 5) permCache.delete(k);
  }, 5 * 60_000).unref();

  app.patch("/api/guilds/:id/antinuke", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const [row] = await models.AntinukeConfig.findOrCreate({ where: { guildId: g.id } });
      const b = req.body || {};
      for (const k of ANTINUKE_BOOLS) if (typeof b[k] === "boolean") row[k] = b[k];
      for (const k of ANTINUKE_INTS) if (Number.isFinite(b[k])) row[k] = Math.min(999, Math.max(1, Math.floor(b[k])));
      if (typeof b.punishment === "string" && ANTINUKE_PUNISHMENTS.includes(b.punishment)) row.punishment = b.punishment;
      await row.save();
      audit("guild_antinuke", `${g.name}: antinuke updated`);
      res.json({ ok: true, antinuke: antinukeJson(row) });
    } catch {
      res.status(500).json({ error: "Не удалось сохранить настройки антинуке" });
    }
  });

  app.patch("/api/guilds/:id/automod", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const [row] = await models.AutomodConfig.findOrCreate({ where: { guildId: g.id } });
      const b = req.body || {};
      for (const k of AUTOMOD_BOOLS) if (typeof b[k] === "boolean") row[k] = b[k];
      for (const k of AUTOMOD_INTS) if (Number.isFinite(b[k])) row[k] = Math.min(36000, Math.max(0, Math.floor(b[k])));
      if (typeof b.punishment === "string" && AUTOMOD_PUNISHMENTS.includes(b.punishment)) row.punishment = b.punishment;
      await row.save();
      audit("guild_automod", `${g.name}: automod updated`);
      res.json({ ok: true, automod: automodJson(row) });
    } catch {
      res.status(500).json({ error: "Не удалось сохранить настройки автомода" });
    }
  });

  app.post("/api/guilds/:id/settings", requireAuth, async (req, res) => {
    const { loggingEnabled, welcomeInOn, welcomeOutOn, autoreactEnabled } = req.body || {};
    const g = await getManagedGuild(req, res);
    if (!g) return;
    const [row] = await models.GuildConfig.findOrCreate({ where: { guildId: g.id } });
    if (typeof loggingEnabled === "boolean") row.loggingEnabled = loggingEnabled;
    if (typeof welcomeInOn === "boolean") row.welcomeInOn = welcomeInOn;
    if (typeof welcomeOutOn === "boolean") row.welcomeOutOn = welcomeOutOn;
    if (typeof autoreactEnabled === "boolean") row.autoreactEnabled = autoreactEnabled;
    await row.save();
    audit("guild_settings", `${g.name}: switches updated`);
    res.json({ ok: true, config: row.toJSON() });
  });

  /* ---- guild logging channels (writes LoggingConfig, read by the bot live) ---- */
  const LOG_CHANNEL_FIELDS = {
    messageLogsChannelId: "Сообщения",
    memberLogsChannelId: "Участники",
    moderationLogsChannelId: "Модерация",
    serverLogsChannelId: "Сервер",
    voiceLogsChannelId: "Голос",
  };

  app.post("/api/guilds/:id/logging", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const [row] = await models.LoggingConfig.findOrCreate({ where: { guildId: g.id } });
      const updates = [];
      for (const [field] of Object.entries(LOG_CHANNEL_FIELDS)) {
        const v = req.body?.[field];
        if (typeof v === "string") {
          if (v === "") { row[field] = null; updates.push(`${field}: сброшен`); continue; }
          const ch = g.channels.cache.get(v);
          if (!ch || ch.type !== 0) return res.status(400).json({ error: "Канал не найден или не текстовый" });
          const perms = ch.permissionsFor(g.members.me);
          if (!perms?.has(["ViewChannel", "SendMessages"])) return res.status(400).json({ error: `Нет прав писать в #${ch.name}` });
          row[field] = v;
          updates.push(`${field}: #${ch.name}`);
        }
      }
      if (typeof req.body?.loggingEnabled === "boolean") row.loggingEnabled = req.body.loggingEnabled;
      await row.save();
      audit("guild_logging", `${g.name}: ${updates.join(", ") || "toggle"}`);
      res.json({ ok: true, config: row.toJSON() });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- AI chat channels (writes GuildConfig.aiChannelIds, read live by
   * the bot's messageCreate AI hook) ---- */
  app.post("/api/guilds/:id/ai-channels", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    const { channelId, action } = req.body || {};
    const ch = g.channels.cache.get(String(channelId || ""));
    if (!ch || ch.type !== 0) return res.status(400).json({ error: "Канал не найден или не текстовый" });
    try {
      const [row] = await models.GuildConfig.findOrCreate({ where: { guildId: g.id } });
      const list = Array.isArray(row.aiChannelIds) ? [...row.aiChannelIds] : [];
      if (action === "remove") {
        const idx = list.indexOf(ch.id);
        if (idx !== -1) list.splice(idx, 1);
      } else if (!list.includes(ch.id)) {
        list.push(ch.id);
      }
      row.aiChannelIds = list;
      await row.save();
      audit("guild_ai_channels", `${g.name}: ${action ?? "add"} #${ch.name} (${list.length} всего)`);
      res.json({ ok: true, channels: list });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- guild prefix (writes GuildPrefix, same row the bot's messageCreate
   * reads with a 30s cache — applies within half a minute) ---- */
  app.post("/api/guilds/:id/prefix", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    const prefix = String(req.body?.prefix ?? "").trim();
    if (prefix.length < 1 || prefix.length > 8) {
      return res.status(400).json({ error: "Префикс: от 1 до 8 символов" });
    }
    if (!/^[\w!?$#%^&*+.,;:~\-\\/<>@ ]+$/.test(prefix)) {
      return res.status(400).json({ error: "Префикс: буквы, цифры или знаки !?$#%^&*+." });
    }
    try {
      await models.GuildPrefix.setPrefix(g.id, prefix);
      audit("guild_prefix", `${g.name}: "${prefix}"`);
      res.json({ ok: true, prefix });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- per-guild command toggles (writes disabled_commands; enforced in
   * the bot's interactionCreate + messageCreate with a 30s cache) ---- */
  app.get("/api/guilds/:id/commands", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    const registry = client?.commands; // slash commands
    const slash = registry
      ? [...registry.values()].map((c) => ({
          name: c.data?.name ?? c.name,
          desc: c.data?.description ?? c.description ?? "",
        }))
      : [];
    let overrides = {};
    try {
      const rows = await models.DisabledCommand.findAll({ where: { guildId: g.id } });
      overrides = Object.fromEntries(rows.map((r) => [r.commandName, Boolean(r.enabled)]));
    } catch { /* table may not exist yet */ }
    res.json({ commands: slash, overrides });
  });

  app.post("/api/guilds/:id/commands/:name", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    /* Anti-spam: max 30 toggles per user per minute (each is a DB write). */
    if (actionLimited(`cmdtoggle:${req.user.id}`, 30, 60 * 1000)) {
      return res.status(429).json({ error: "Слишком часто. Подождите минуту." });
    }
    const name = String(req.params.name || "").toLowerCase();
    if (!/^[a-z0-9_-]{1,32}$/.test(name)) return res.status(400).json({ error: "Некорректное имя команды" });
    if (typeof req.body?.enabled !== "boolean") return res.status(400).json({ error: "enabled: true|false" });
    try {
      await models.DisabledCommand.setOverride(g.id, name, req.body.enabled, req.user.username);
      audit("guild_command_toggle", `${g.name}: /${name} → ${req.body.enabled ? "on" : "off"}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- antinuke whitelist (table antinuke_whitelist; read live by the
   * bot's antinuke event handlers) ---- */
  app.get("/api/guilds/:id/antinuke-whitelist", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const rows = await models.AntinukeWhitelist.findAll({ where: { guildId: g.id } });
      res.json({ entries: rows.map((r) => ({ userId: r.userId, events: r.events ?? null, addedBy: r.addedBy })) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера", entries: [] });
    }
  });

  app.post("/api/guilds/:id/antinuke-whitelist", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    if (actionLimited(`anwl:${req.user.id}`, 20, 60 * 1000)) {
      return res.status(429).json({ error: "Слишком часто. Подождите минуту." });
    }
    const userId = String(req.body?.userId ?? "").trim();
    if (!/^\d{5,25}$/.test(userId)) return res.status(400).json({ error: "Числовой Discord ID обязателен" });
    try {
      await models.AntinukeWhitelist.findOrCreate({
        where: { guildId: g.id, userId },
        defaults: { addedBy: req.user.username, events: null },
      });
      audit("an_whitelist_add", `${g.name}: ${userId}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/guilds/:id/antinuke-whitelist/:userId", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      await models.AntinukeWhitelist.destroy({ where: { guildId: g.id, userId: req.params.userId } });
      audit("an_whitelist_remove", `${g.name}: ${req.params.userId}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- automod whitelist (table automod_whitelist; user/role/channel) ---- */
  const AM_TARGETS = new Set(["user", "role", "channel"]);
  app.get("/api/guilds/:id/automod-whitelist", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const rows = await models.AutomodWhitelist.findAll({ where: { guildId: g.id } });
      res.json({ entries: rows.map((r) => ({ targetId: r.targetId, targetType: r.targetType, modules: (() => { try { return JSON.parse(r.modules || "[]"); } catch { return []; } })() })) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера", entries: [] });
    }
  });

  app.post("/api/guilds/:id/automod-whitelist", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    if (actionLimited(`amwl:${req.user.id}`, 20, 60 * 1000)) {
      return res.status(429).json({ error: "Слишком часто. Подождите минуту." });
    }
    const targetId = String(req.body?.targetId ?? "").trim();
    const targetType = String(req.body?.targetType ?? "");
    if (!/^\d{5,25}$/.test(targetId)) return res.status(400).json({ error: "Числовой Discord ID обязателен" });
    if (!AM_TARGETS.has(targetType)) return res.status(400).json({ error: "targetType: user | role | channel" });
    try {
      await models.AutomodWhitelist.findOrCreate({
        where: { guildId: g.id, targetId },
        defaults: { targetType, modules: JSON.stringify([]) },
      });
      audit("am_whitelist_add", `${g.name}: ${targetType} ${targetId}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/guilds/:id/automod-whitelist/:targetId", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      await models.AutomodWhitelist.destroy({ where: { guildId: g.id, targetId: req.params.targetId } });
      audit("am_whitelist_remove", `${g.name}: ${req.params.targetId}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- guild giveaways: create / list / delete (dashboard ⇄ bot DB) ---- */
  app.get("/api/guilds/:id/giveaways", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const rows = await models.Giveaway.findAll({ where: { guildId: g.id }, order: [["endTime", "DESC"]], limit: 50 });
      const out = [];
      for (const r of rows) {
        const j = r.toJSON();
        let entries = 0;
        try { entries = await models.GiveawayEntry.count({ where: { giveawayId: j.id } }); } catch { /* ignore */ }
        out.push({ id: j.id, prize: j.prize, winners: j.winners, ended: Boolean(j.ended), endTime: Number(j.endTime), entries, channelId: j.channelId, messageId: j.messageId, hostId: j.hostId });
      }
      res.json({ giveaways: out });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* Shared builder: the dashboard posts the EXACT same ComponentsV2 giveaway
   * message as `/giveaway start` — same container, separators, buttons. The
   * enter/participants button handlers are custom-id based, so they work on
   * dashboard-created giveaways with zero differences for users. */
  function buildGiveawayComponents(prize, winnersCount, endSec, hostId) {
    const {
      ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
      ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
    } = require("discord.js");
    const emojis = require("./emojis.json");
    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emojis.gift || "🎁"} **${prize}** ${emojis.gift || "🎁"}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emojis.dots || ""} **Победителей:** ${winnersCount}\n` +
        `${emojis.dots || ""} **Окончание:** <t:${endSec}:R>\n` +
        `${emojis.dots || ""} **Организатор:** <@${hostId}>`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Участвовать").setStyle(ButtonStyle.Primary).setCustomId("giveaway_enter_ID"),
      new ButtonBuilder().setLabel("Участники").setStyle(ButtonStyle.Secondary).setCustomId("giveaway_participants_ID")
    );
    container.addActionRowComponents(row);
    return { container, MessageFlags };
  }

  app.post("/api/guilds/:id/giveaways", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    /* Anti-spam: max 10 giveaways per user per hour (each one sends a real
     * Discord message and creates DB rows). */
    if (actionLimited(`giveaway:${req.user.id}`, 10, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "Слишком много розыгрышей. Подождите час." });
    }
    const { prize, winners, durationMinutes, channelId } = req.body || {};
    if (!prize || typeof prize !== "string" || prize.trim().length < 1 || prize.length > 200) {
      return res.status(400).json({ error: "Укажите приз (до 200 символов)" });
    }
    const w = Number(winners);
    if (!Number.isFinite(w) || w < 1 || w > 20) return res.status(400).json({ error: "Победителей: от 1 до 20" });
    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur < 1 || dur > 60 * 24 * 30) return res.status(400).json({ error: "Длительность: от 1 минуты до 30 дней" });
    /* Channel is REQUIRED now: a giveaway silently landing in a "random"
     * text channel was a bug, not a feature. */
    const ch = g.channels.cache.get(String(channelId || ""));
    if (!ch || ch.type !== 0) return res.status(400).json({ error: "Выберите текстовый канал для розыгрыша" });
    const perms = ch.permissionsFor(g.members.me);
    if (!perms?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
      return res.status(400).json({ error: `Нет прав писать в #${ch.name}` });
    }
    try {
      const endSec = Math.floor((Date.now() + Math.floor(dur) * 60_000) / 1000);
      const { container, MessageFlags } = buildGiveawayComponents(prize.trim(), Math.floor(w), endSec, req.user.id);
      const msg = await ch.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
      const giveaway = await models.Giveaway.create({
        guildId: g.id, channelId: ch.id, messageId: msg.id,
        hostId: req.user.id, prize: prize.trim(), winners: Math.floor(w),
        endTime: endSec, ended: false,
      });
      /* Swap placeholder customIds for real ones now that we know the DB id,
       * exactly like a message the bot's own command would have created. */
      const realRow = new (require("discord.js").ActionRowBuilder)().addComponents(
        new (require("discord.js").ButtonBuilder)().setLabel("Участвовать").setStyle(require("discord.js").ButtonStyle.Primary).setCustomId(`giveaway_enter_${giveaway.id}`),
        new (require("discord.js").ButtonBuilder)().setLabel("Участники").setStyle(require("discord.js").ButtonStyle.Secondary).setCustomId(`giveaway_participants_${giveaway.id}`)
      );
      const fixed = buildGiveawayComponents(prize.trim(), Math.floor(w), endSec, req.user.id);
      fixed.container.addActionRowComponents(realRow);
      await msg.edit({ components: [fixed.container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      audit("giveaway_create", `${g.name}: ${prize.trim().slice(0, 40)} в #${ch.name}`);
      res.json({ ok: true, giveaway: { id: giveaway.id, prize: giveaway.prize, endTime: endSec * 1000, channelId: ch.id } });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/guilds/:id/giveaways/:gid", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    try {
      const row = await models.Giveaway.findOne({ where: { id: req.params.gid, guildId: g.id } });
      if (!row) return res.status(404).json({ error: "Розыгрыш не найден" });
      await models.GiveawayEntry.destroy({ where: { giveawayId: row.id } }).catch(() => {});
      await row.destroy();
      audit("giveaway_delete", `${g.name}: #${req.params.gid}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- guild welcome/farewell config read for the dashboard ---- */
  app.get("/api/guilds/:id/extends", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    const safe = async (p) => { try { return (await p)?.toJSON() ?? null; } catch { return null; } };
    try {
      const [welcome, farewell, logging] = await Promise.all([
        safe(models.WelcomeConfig.findOne({ where: { guildId: g.id } })),
        safe(models.FarewellConfig.findOne({ where: { guildId: g.id } })),
        safe(models.LoggingConfig.findOne({ where: { guildId: g.id } })),
      ]);
      res.json({ welcome, farewell, logging });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* ---- welcome / farewell editor: writes WelcomeConfig / FarewellConfig —
   * the exact rows welcomeEvent / farewellEvent read (60s cache in the bot). ---- */
  const safeUrl = (v) => {
    if (v == null || String(v).trim() === "") return { ok: true, value: null };
    const s = String(v).trim();
    if (s.length > 500) return { ok: false, error: "Слишком длинная ссылка на изображение" };
    if (!/^https:\/\//i.test(s)) return { ok: false, error: "Изображение должно быть по https-ссылке" };
    return { ok: true, value: s };
  };
  const trimOrNull = (v, max) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s.slice(0, max) : null;
  };

  app.post("/api/guilds/:id/welcome", requireAuth, async (req, res) => {
    const g = await getManagedGuild(req, res);
    if (!g) return;
    /* Cheap write flood guard — the row is shared by the whole guild, so a
     * spammy client should not be able to hammer the table. */
    if (actionLimited(`greet:${req.user.id}`, 30, 60 * 1000)) {
      return res.status(429).json({ error: "Слишком много сохранений. Подождите минуту." });
    }
    const kind = req.body?.kind === "farewell" ? "farewell" : "welcome";
    const Model = kind === "farewell" ? models.FarewellConfig : models.WelcomeConfig;
    const b = req.body || {};
    const type = b.type === "container" ? "container" : "simple";

    /* Channel is optional: clearing it turns the greeting off (the bot's
     * events already skip greetings without a channel). */
    let channelId = b.channelId == null ? "" : String(b.channelId).trim();
    if (channelId) {
      const ch = g.channels.cache.get(channelId);
      if (!ch || ch.type !== 0) return res.status(400).json({ error: "Канал не найден или не текстовый" });
      const perms = ch.permissionsFor(g.members.me);
      if (!perms?.has(["ViewChannel", "SendMessages"])) {
        return res.status(400).json({ error: `Нет прав писать в #${ch.name}` });
      }
      channelId = ch.id;
    }

    let color = null;
    if (b.color != null && String(b.color).trim() !== "") {
      const m = /^#?([0-9a-fA-F]{6})$/.exec(String(b.color).trim());
      if (!m) return res.status(400).json({ error: "Цвет — в формате #RRGGBB" });
      color = parseInt(m[1], 16);
    }
    const thumb = safeUrl(b.thumbnailUrl);
    if (!thumb.ok) return res.status(400).json({ error: thumb.error });
    const image = safeUrl(b.imageUrl);
    if (!image.ok) return res.status(400).json({ error: image.error });

    try {
      const [row] = await Model.findOrCreate({ where: { guildId: g.id } });
      row.channelId = channelId || null;
      row.type = type;
      row.message = trimOrNull(b.message, 1500);
      row.title = trimOrNull(b.title, 256);
      row.description = trimOrNull(b.description, 2000);
      row.color = color;
      row.thumbnailUrl = thumb.value;
      row.imageUrl = image.value;
      await row.save();
      audit(
        `guild_${kind}`,
        `${g.name}: ${channelId ? `#${g.channels.cache.get(channelId)?.name ?? channelId}` : "выключено"} · ${type}`
      );
      res.json({ ok: true, config: row.toJSON() });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/commands/stats", (req, res) => {
    const registry = client?.commands || new Map();
    const byCategory = {};
    for (const [, cmd] of registry) {
      const cat = cmd.category || cmd.data?.category || "Прочее";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    res.json({
      online: client?.isReady?.() ?? false,
      total: registry.size,
      byCategory,
      names: [...registry.keys()].slice(0, 500),
    });
  });

  /* ------------------------------ support API ------------------------------ */
  // Authorized dashboard users open threads; the owner answers in /admin.
  // All state lives in PostgreSQL (SupportTicket model) — survives restarts.

  function ticketJson(row) {
    const j = row.toJSON();
    return {
      id: j.ticketId,
      userId: j.userId,
      username: j.username,
      avatar: j.avatar,
      subject: j.subject,
      status: j.status,
      messages: Array.isArray(j.messages) ? j.messages : [],
      createdAt: new Date(j.createdAt).getTime(),
      updatedAt: new Date(j.updatedAt).getTime(),
    };
  }

  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const rows = await models.SupportTicket.findAll({
        where: { userId: req.user.id },
        order: [["updatedAt", "DESC"]],
        limit: 50,
      });
      res.json({ tickets: rows.map(ticketJson) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    /* Anti-spam: max 5 new tickets per user per hour. */
    if (actionLimited(`ticket:${req.user.id}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "Слишком много обращений. Попробуйте позже." });
    }
    const { subject, text } = req.body || {};
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return res.status(400).json({ error: "Опишите тему обращения" });
    }
    if (subject.length > 200) return res.status(400).json({ error: "Тема слишком длинная" });
    try {
      const row = await models.SupportTicket.create({
        userId: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        subject: subject.trim(),
        status: "open",
        messages: text
          ? [{ from: "user", author: req.user.username, text: String(text).slice(0, 2000), ts: Date.now() }]
          : [],
      });
      audit("support_new", `${req.user.username}: ${subject.slice(0, 60)}`);
      void telegram.events.supportNew(req.user.username, subject.slice(0, 80));
      res.json({ ok: true, ticket: ticketJson(row) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/support/tickets/:id/messages", requireAuth, async (req, res) => {
    /* Anti-spam: max 30 messages per user per 10 minutes. */
    if (actionLimited(`ticketmsg:${req.user.id}`, 30, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Слишком много сообщений. Подождите немного." });
    }
    const { text } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Пустое сообщение" });
    }
    try {
      const row = await models.SupportTicket.findOne({ where: { ticketId: req.params.id, userId: req.user.id } });
      if (!row) return res.status(404).json({ error: "Тикет не найден" });
      if (row.status === "closed") return res.status(400).json({ error: "Тикет закрыт" });
      const msgs = Array.isArray(row.messages) ? [...row.messages] : [];
      msgs.push({ from: "user", author: req.user.username, text: String(text).trim().slice(0, 2000), ts: Date.now() });
      row.messages = msgs;
      row.status = "open";
      row.updatedAt = new Date();
      await row.save();
      audit("support_user_msg", `${req.user.username}: ${row.subject.slice(0, 40)}`);
      void telegram.events.supportReply(req.user.username, row.subject.slice(0, 60), String(text).trim().slice(0, 100));
      res.json({ ok: true, ticket: ticketJson(row) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  /* -------------------------------- admin API ------------------------------ */
  // EVERY /api/admin/* route requires adminAuthed session (login+password)

  app.get("/api/admin/check", requireAdminSession, (req, res) => res.json({ ok: true }));
  /* ---------------- runtime settings (config.js values editable live) ------ */

  app.get("/api/admin/settings", requirePerm("system"), async (req, res) => {
    await settings.loadAll();
    res.json({
      settings: settings.getPublic(),
      presence: botConfig.STATUS?.status ?? "online",
      activity: botConfig.STATUS?.activity ?? "",
    });
  });

  app.post("/api/admin/settings", requirePerm("system"), async (req, res) => {
    const updates = req.body?.updates;
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res.status(400).json({ error: "updates: объект {ключ: значение}" });
    }
    const flat = {};
    for (const [k, v] of Object.entries(updates).slice(0, 32)) {
      if (typeof v !== "string" && typeof v !== "boolean" && v !== null) {
        return res.status(400).json({ error: "Некорректный тип значения" });
      }
      flat[k] = v;
    }
    try {
      const applied = await settings.setMany(flat, req.session?.user?.username ?? "admin");
      audit("settings_update", Object.keys(applied).join(",").slice(0, 120));
      res.json({ ok: true, applied: Object.keys(applied) });
    } catch (e) {
      res.status(500).json({ error: "Не удалось сохранить настройки" });
    }
  });

  /* ---------------- admin accounts (owner-only management) ---------------- */

  function hasAccountsPerm(req) {
    if (req.session?.user && isOwner(req)) return true;
    return req.session?.adminAuthed === true &&
      (Number(req.session?.adminPerms ?? 0) & adminAccounts.PERMS.accounts) !== 0;
  }

  function accountView(row) {
    return {
      login: row.login,
      perms: Number(row.perms) || 0,
      isOwner: row.is_owner,
      disabled: row.disabled,
      createdBy: row.created_by,
      createdAt: row.created_at,
      lastLogin: row.last_login,
    };
  }

  app.get("/api/admin/accounts", requireAdminSession, async (req, res) => {
    if (!hasAccountsPerm(req)) return res.status(403).json({ error: "Только владелец управляет аккаунтами" });
    try {
      await adminAccounts.ensureOwner();
      const rows = await adminAccounts.listAccounts();
      res.json({
        accounts: rows.map(accountView),
        perms: adminAccounts.PERM_INFO,
        selfLogin: req.session?.adminLogin ?? null,
        isOwner: Boolean(req.session?.user && isOwner(req)),
      });
    } catch {
      res.status(500).json({ error: "Не удалось загрузить аккаунты" });
    }
  });

  app.post("/api/admin/accounts", requireAdminSession, async (req, res) => {
    if (!hasAccountsPerm(req)) return res.status(403).json({ error: "Только владелец управляет аккаунтами" });
    const { login, password, perms } = req.body || {};
    const r = await adminAccounts.createAccount({ login, password, perms, createdBy: req.session?.adminLogin ?? req.session?.user?.username ?? "owner" });
    if (!r.ok) return res.status(400).json({ error: r.error });
    audit("admin_account_create", String(login || "").slice(0, 32));
    res.json({ ok: true });
  });

  app.patch("/api/admin/accounts/:login", requireAdminSession, async (req, res) => {
    if (!hasAccountsPerm(req)) return res.status(403).json({ error: "Только владелец управляет аккаунтами" });
    const body = req.body || {};
    const target = String(req.params.login || "");
    /* Password self-service: any authed admin may change their OWN password;
     * perms/disabled stay owner-only. */
    const isSelf = req.session?.adminLogin === target;
    if (body.password != null && body.perms == null && body.disabled == null && isSelf) {
      const r = await adminAccounts.setPassword(target, body.password);
      if (!r.ok) return res.status(400).json({ error: r.error });
      audit("admin_account_self_password", target.slice(0, 32));
      return res.json({ ok: true });
    }
    if (!(req.session?.user && isOwner(req))) return res.status(403).json({ error: "Только владелец управляет аккаунтами" });
    const r = await adminAccounts.updateAccount(target, { password: body.password, perms: body.perms, disabled: body.disabled }, true);
    if (!r.ok) return res.status(400).json({ error: r.error });
    audit("admin_account_update", target.slice(0, 32));
    res.json({ ok: true });
  });

  app.delete("/api/admin/accounts/:login", requireAdminSession, async (req, res) => {
    if (!hasAccountsPerm(req)) return res.status(403).json({ error: "Только владелец управляет аккаунтами" });
    const r = await adminAccounts.deleteAccount(String(req.params.login || ""));
    if (!r.ok) return res.status(400).json({ error: r.error });
    audit("admin_account_delete", String(req.params.login || "").slice(0, 32));
    res.json({ ok: true });
  });

  /* Owner sets their own login-page password (the seeded owner row has none). */
  app.post("/api/admin/owner-password", requireAdminSession, async (req, res) => {
    if (!(req.session?.user && isOwner(req)) && req.session?.adminLogin !== "owner") {
      return res.status(403).json({ error: "Только владелец" });
    }
    const { password, login } = req.body || {};
    /* Optional login change + required password, applied to the is_owner row. */
    const r = login != null
      ? await adminAccounts.setOwnerCredentials(String(login), password)
      : await adminAccounts.setOwnerPassword(password);
    if (!r.ok) return res.status(400).json({ error: r.error });
    audit("admin_owner_password_set", "login page credentials");
    res.json({ ok: true });
  });

  /* ---- global command locks (locked_commands; enforced by the bot) ---- */
  const commandLockDb = require("./data/commandLock");

  app.get("/api/admin/locks", requirePerm("control"), async (req, res) => {
    try {
      const rows = await commandLockDb.getAllLocked();
      res.json({ locks: rows });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/admin/locks/:name", requirePerm("control"), async (req, res) => {
    const name = String(req.params.name || "").toLowerCase();
    if (!/^[a-z0-9 _-]{1,32}$/.test(name)) return res.status(400).json({ error: "Некорректное имя команды" });
    await commandLockDb.lock(name, req.session?.user?.id ?? "admin");
    audit("command_lock", name);
    res.json({ ok: true });
  });

  app.delete("/api/admin/locks/:name", requirePerm("control"), async (req, res) => {
    const name = String(req.params.name || "").toLowerCase();
    if (!/^[a-z0-9 _-]{1,32}$/.test(name)) return res.status(400).json({ error: "Некорректное имя команды" });
    await commandLockDb.unlock(name);
    audit("command_unlock", name);
    res.json({ ok: true });
  });

  /* Apply the bot presence (status/activity) live via the Discord API. */
  app.post("/api/admin/presence", requirePerm("control"), async (req, res) => {
    const { status, activity } = req.body || {};
    const allowed = ["online", "idle", "dnd", "invisible"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: "status: online | idle | dnd | invisible" });
    }
    if (activity != null && (typeof activity !== "string" || activity.length > 64)) {
      return res.status(400).json({ error: "activity: до 64 символов" });
    }
    try {
      if (client?.user) {
        client.user.setPresence({
          status: status || client.user.presence.status,
          activities: activity ? [{ name: activity, type: 0 }] : [],
        });
      }
      audit("presence_update", `${status ?? "-"} · ${String(activity ?? "").slice(0, 40)}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Не удалось применить статус" });
    }
  });

  app.get("/api/admin/overview", requirePerm("overview"), async (req, res) => {
    const mem = process.memoryUsage();
    const upSec = Math.floor((Date.now() - startTime) / 1000);
    /* Real DB counters — shown as KPIs, never invented. */
    const counts = { tickets: null, ticketsOpen: null, giveawaysActive: null, profiles: null, blacklist: null, noprefix: null };
    try { counts.tickets = await models.Ticket.count(); } catch { /* ignore */ }
    try { counts.ticketsOpen = await models.Ticket.count({ where: { status: "open" } }); } catch { /* ignore */ }
    try { counts.giveawaysActive = await models.Giveaway.count({ where: { ended: false } }); } catch { /* ignore */ }
    try { counts.profiles = await models.Profile.count(); } catch { /* ignore */ }
    try { counts.blacklist = await models.Blacklist.count(); } catch { /* ignore */ }
    try { counts.noprefix = await models.NoPrefix.count(); } catch { /* ignore */ }
    res.json({
      counts,
      uptimeSec: upSec,
      memoryMb: Math.round(mem.rss / 1024 / 1024),
      heapMb: Math.round(mem.heapUsed / 1024 / 1024),
      ping: client?.ws?.ping ?? null,
      guilds: client?.guilds?.cache.size ?? 0,
      users: client ? client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0) : 0,
      channels: client?.channels?.cache.size ?? 0,
      commands: totalCommandCount(),
      shards: client?.ws?.shards?.size ?? 0,
      shardStatus: client ? [...(client.ws.shards?.values() ?? [])].map((s) => ({ id: s.id, status: s.status, ping: Number.isFinite(s.ping) ? s.ping : null })) : [],
      voice: client?.voice?.adapters.size ?? 0,
      telemetry,
      commandUsage: [...cmdStats.entries()].sort((a, b) => b[1].uses - a[1].uses).slice(0, 10).map(([name, s]) => ({ name, uses: s.uses, users: s.users.size, lastUsed: s.lastUsed })),
      totalCommandUses: [...cmdStats.values()].reduce((a, s) => a + s.uses, 0),
    });
  });

  app.get("/api/admin/guilds", requirePerm("overview"), (req, res) => {
    const out = client ? [...client.guilds.cache.values()].map((g) => ({
      id: g.id, name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
      members: g.memberCount || 0, boosts: g.premiumSubscriptionCount || 0,
      createdAt: g.createdTimestamp, owner: g.ownerId,
    })) : [];
    out.sort((a, b) => b.members - a.members);
    res.json({ guilds: out });
  });

  app.post("/api/admin/guilds/:id/leave", requirePerm("moderation"), async (req, res) => {
    const g = client?.guilds?.cache.get(req.params.id);
    if (!g) return res.status(404).json({ error: "Сервер не найден" });
    try {
      await g.leave();
      audit("guild_leave", g.name);
      void telegram.events.guildLeave(g.name, g.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/admin/guilds/:id/leave-unknown", requirePerm("moderation"), async (req, res) => {
    // leave a guild the client has cached but can't reach normally (fetch first)
    try {
      const g = await client.guilds.fetch(req.params.id).catch(() => null);
      await g.leave();
      audit("guild_leave", g.name);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/admin/modlogs", requirePerm("moderation"), async (req, res) => {
    try {
      const logs = (await models.ModLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 })).map((r) => r.toJSON());
      res.json({ logs });
    } catch {
      res.json({ logs: [] });
    }
  });

  app.get("/api/admin/giveaways", requirePerm("giveaways"), async (req, res) => {
    try {
      const rows = await models.Giveaway.findAll({ order: [["createdAt", "DESC"]], limit: 50 });
      const giveaways = await Promise.all(
        rows.map(async (r) => {
          const j = r.toJSON();
          let entries = null;
          try {
            entries = await models.GiveawayEntry.count({ where: { giveawayId: j.id } });
          } catch { /* table missing */ }
          const g = client?.guilds?.cache.get(j.guildId);
          return {
            ...j,
            entries,
            guildName: g?.name ?? null,
            timeLeftMs: Math.max(0, Number(j.endTime) - Date.now()),
          };
        })
      );
      const active = giveaways.filter((g) => !g.ended && g.timeLeftMs > 0).length;
      res.json({ giveaways, active, total: giveaways.length });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера", giveaways: [] });
    }
  });

  /* End a giveaway right now (real bot-side action, not a UI flag). */
  app.post("/api/admin/giveaways/:id/end", requirePerm("giveaways"), async (req, res) => {
    try {
      const row = await models.Giveaway.findByPk(Number(req.params.id));
      if (!row) return res.status(404).json({ error: "Розыгрыш не найден" });
      if (row.ended) return res.json({ ok: true, already: true });
      /* Real ending: pick winners, edit the Discord message, notify the channel
       * — the exact routine the bot's own timer uses. (The old code only set
       * ended=true with a millisecond endTime the checker never matched.) */
      const { endGiveaway } = require("./lib/giveawayUtils");
      await endGiveaway(client, row);
      row.ended = true;
      row.endTime = Math.floor(Date.now() / 1000);
      await row.save();
      audit("giveaway_end", `#${row.id} ${row.prize}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/admin/giveaways/:id", requirePerm("giveaways"), async (req, res) => {
    const id = Number(req.params.id);
    try {
      await models.GiveawayEntry.destroy({ where: { giveawayId: id } }).catch(() => {});
      const deleted = await models.Giveaway.destroy({ where: { id } });
      if (!deleted) return res.status(404).json({ error: "Розыгрыш не найден" });
      audit("giveaway_delete", `#${id}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/admin/tickets", requirePerm("moderation"), async (req, res) => {
    try {
      const total = await models.Ticket.count();
      const open = await models.Ticket.count({ where: { status: "open" } });
      const recent = (await models.Ticket.findAll({ order: [["createdAt", "DESC"]], limit: 30 })).map((r) => {
        const j = r.toJSON();
        const g = client?.guilds?.cache.get(j.guildId);
        return {
          id: j.id,
          guildId: j.guildId,
          guildName: g?.name ?? null,
          userId: j.userId,
          categoryName: j.categoryName,
          status: j.status,
          claimedBy: j.claimedBy ?? null,
          createdAt: j.createdAt,
        };
      });
      res.json({ total, open, recent });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера", total: null, open: null, recent: [] });
    }
  });

  /* Real PostgreSQL row counts — powers the admin «База данных» tab. */
  app.get("/api/admin/database", requirePerm("system"), async (req, res) => {
    try {
      const tables = await tableCounts();
      res.json({
        tables,
        totalRows: tables.reduce((a, t) => a + (t.rows ?? 0), 0),
        dialect: models.sequelize?.getDialect?.() ?? "postgres",
      });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера", tables: [] });
    }
  });

  /* Per-guild detail for the admin server list (channels, roles, antinuke…). */
  app.get("/api/admin/guilds/:id", requirePerm("overview"), async (req, res) => {
    const g = client?.guilds?.cache.get(req.params.id);
    if (!g) return res.status(404).json({ error: "Бот не на этом сервере" });
    const channels = await g.channels.fetch().catch(() => null);
    const roles = await g.roles.fetch().catch(() => null);
    let config = null;
    let antinuke = null;
    let autoReact = 0;
    try { config = (await models.GuildConfig.findOne({ where: { guildId: g.id } }))?.toJSON() ?? null; } catch { /* ignore */ }
    try { antinuke = (await models.AntinukeConfig.findOne({ where: { guildId: g.id } }))?.toJSON() ?? null; } catch { /* ignore */ }
    try { autoReact = await models.AutoReact.count({ where: { guildId: g.id } }); } catch { /* ignore */ }
    res.json({
      id: g.id,
      name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` : null,
      owner: g.ownerId,
      members: g.memberCount || 0,
      boosts: g.premiumSubscriptionCount || 0,
      createdAt: g.createdTimestamp,
      channels: channels ? { text: channels.filter((c) => c.type === 0).size, voice: channels.filter((c) => c.type === 2).size, total: channels.size } : null,
      roles: roles?.size ?? null,
      features: g.features ?? [],
      config,
      antinuke,
      autoReact,
    });
  });

  /* The real table (model Blacklist) uses entityId/addedAt — map them to the
   * shape the UI reads (targetId/createdAt) instead of inventing columns. */
  function blacklistJson(r) {
    const j = r.toJSON();
    return {
      id: j.id,
      type: j.type,
      targetId: j.entityId,
      reason: j.reason,
      createdAt: j.addedAt,
    };
  }

  app.get("/api/admin/blacklist", requirePerm("moderation"), async (req, res) => {
    try {
      const rows = await models.Blacklist.findAll({ order: [["addedAt", "DESC"]], limit: 200 });
      res.json({ blacklist: rows.map(blacklistJson) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/admin/blacklist", requirePerm("moderation"), async (req, res) => {
    const body = req.body || {};
    const type = body.type;
    const targetId = String(body.targetId ?? body.entityId ?? "").trim();
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    if (!["user", "guild"].includes(type) || !/^\d{5,25}$/.test(targetId)) {
      return res.status(400).json({ error: "type=user|guild и числовой Discord ID обязательны" });
    }
    try {
      const [row, created] = await models.Blacklist.findOrCreate({
        where: { type, entityId: targetId },
        defaults: { reason, addedAt: new Date() },
      });
      if (!created && reason) {
        row.reason = reason;
        await row.save();
      }
      audit("blacklist_add", `${type}:${targetId}`);
      res.json({ ok: true, created });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/admin/blacklist/:id", requirePerm("moderation"), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Некорректный id" });
    try {
      await models.Blacklist.destroy({ where: { id } });
      audit("blacklist_remove", String(id));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/admin/noprefix", requirePerm("moderation"), async (req, res) => {
    try {
      const rows = await models.NoPrefix.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
      res.json({ noprefix: rows.map((r) => r.toJSON()) });
    } catch {
      res.json({ noprefix: [] });
    }
  });

  app.post("/api/admin/noprefix", requirePerm("moderation"), async (req, res) => {
    const { userId, username } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId обязателен" });
    try {
      await models.NoPrefix.findOrCreate({
        where: { userId },
        defaults: { userId, username: username || "unknown", grantedBy: "dashboard", grantedByUsername: "dashboard", duration: "permanent" },
      });
      audit("noprefix_add", userId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/admin/noprefix/:userId", requirePerm("moderation"), async (req, res) => {
    try {
      await models.NoPrefix.destroy({ where: { userId: req.params.userId } });
      audit("noprefix_remove", req.params.userId);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/admin/broadcast", requirePerm("broadcast"), async (req, res) => {
    const { message } = req.body || {};
    if (!message || typeof message !== "string" || message.length > 1800) {
      return res.status(400).json({ error: "message обязателен (до 1800 символов)" });
    }
    let sent = 0, failed = 0;
    for (const g of client?.guilds?.cache.values() ?? []) {
      const channel = g.systemChannel || g.channels.cache.find((c) => c.type === 0 && c.permissionsFor(g.members.me)?.has("SendMessages"));
      if (channel) {
        try {
          await channel.send({ content: message });
          sent += 1;
        } catch {
          failed += 1;
        }
      }
    }
    audit("broadcast", `sent:${sent} failed:${failed}`);
    void telegram.events.broadcast(sent, failed, message.slice(0, 120));
    res.json({ ok: true, sent, failed });
  });

  app.post("/api/admin/reload-commands", requirePerm("control"), async (req, res) => {
    try {
      const { reloadAllCommands } = require("./lib/commandLoader");
      const result = reloadAllCommands(client, __dirname);
      audit("reload_commands", result.message);
      void telegram.events.commandsReloaded(result.message);
      res.json({ ok: true, message: result.message });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/admin/audit", requirePerm("security"), (req, res) => {
    res.json({ audit: EVENT_LOG });
  });

  /* Live gateway activity feed (real bot events only) */
  app.get("/api/admin/logs", requirePerm("security"), (req, res) => {
    res.json({ logs: BOT_LOGS });
  });

  /* Change admin password at runtime (memory only until restart; persists via env) */
  app.post("/api/admin/password", requireAdminSession, (req, res) => {
    const { current, next } = req.body || {};
    if (typeof current !== "string" || typeof next !== "string") {
      return res.status(400).json({ error: "current и next обязательны" });
    }
    if (next.length < 12 || next.length > 128 || !/[A-Za-zА-Яа-я]/.test(next) || !/\d/.test(next)) {
      return res.status(400).json({ error: "Новый пароль: 12–128 символов, минимум одна буква и одна цифра" });
    }
    if (!checkPassword(current)) {
      recordLoginAttempt(clientIp(req));
      return res.status(401).json({ error: "Текущий пароль неверен" });
    }
    cfg.adminPasswordOverride = next;
    audit("password_change", `IP ${clientIp(req)}`);
    void telegram.events.adminLogin(clientIp(req), "password change");
    res.json({ ok: true, note: "После перезапуска задайте DASHBOARD_ADMIN_PASSWORD в .env" });
  });

  /* Download the full audit trail as JSON (admin evidence / backup) */
  app.get("/api/admin/audit/export", requirePerm("security"), (req, res) => {
    res.setHeader("Content-Disposition", 'attachment; filename="niko-audit.json"');
    res.setHeader("Content-Type", "application/json");
    res.json({ exportedAt: new Date().toISOString(), entries: EVENT_LOG, botLogs: BOT_LOGS });
  });

  /* -------------------------------- telegram ------------------------------- */

  app.get("/api/admin/telegram", requirePerm("system"), (req, res) => {
    res.json({ configured: telegram.isConfigured() || settings.telegramConfigured() });
  });

  /* DDoS protection stats for the admin security tab */
  app.get("/api/admin/ddos", requirePerm("security"), (req, res) => {
    const now = Date.now();
    const activeCooldowns = [...ddos.cooldowns.entries()].filter(([, t]) => t > now);
    const topIps = [...ddos.sustained.entries()]
      .map(([ip, arr]) => ({ ip, rpm: arr.length }))
      .sort((a, b) => b.rpm - a.rpm)
      .slice(0, 10);
    res.json({
      ...ddos.stats,
      limits: { burst: BURST_CAPACITY, sustainedPerMin: SUSTAINED_LIMIT, cooldownMinutes: COOLDOWN_MS / 60000 },
      activeCooldowns: activeCooldowns.map(([ip, until]) => ({ ip, minutesLeft: Math.ceil((until - now) / 60000) })),
      topIps,
      trackedIps: ddos.sustained.size,
      telegramAlerts: telegram.isConfigured(),
    });
  });

  /* Release an IP from cooldown (false positive case) */
  app.post("/api/admin/ddos/unblock", requirePerm("security"), (req, res) => {
    const ip = String(req.body?.ip ?? "").trim();
    if (!ip) return res.status(400).json({ error: "ip обязателен" });
    ddos.cooldowns.delete(ip);
    ddos.sustained.delete(ip);
    audit("ddos_unblock", ip);
    res.json({ ok: true });
  });

  app.post("/api/admin/telegram/test", requirePerm("system"), async (req, res) => {
    const r = await telegram.events.test();
    audit("telegram_test", r.ok ? "sent" : r.error || "failed");
    if (!r.ok) return res.status(502).json({ error: r.error || "не отправлено" });
    res.json({ ok: true });
  });

  /* --------------------------------- vlogs -------------------------------- */

  app.get("/api/vlogs", (req, res) => {
    const list = loadVlogs()
      .filter((v) => v.published)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12);
    res.json({ vlogs: list });
  });

  app.get("/api/vlogs/:id", (req, res) => {
    const v = loadVlogs().find((x) => x.id === req.params.id && x.published);
    if (!v) return res.status(404).json({ error: "Влог не найден" });
    res.json({ vlog: v });
  });

  /* ---------------------------- admin: support ----------------------------- */

  app.get("/api/admin/support", requirePerm("community"), async (req, res) => {
    try {
      const rows = await models.SupportTicket.findAll({ order: [["updatedAt", "DESC"]], limit: 200 });
      const open = rows.filter((r) => r.status !== "closed").length;
      res.json({ tickets: rows.map(ticketJson), open });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/admin/support/:id/reply", requirePerm("community"), async (req, res) => {
    const { text } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Пустой ответ" });
    }
    try {
      const row = await models.SupportTicket.findOne({ where: { ticketId: req.params.id } });
      if (!row) return res.status(404).json({ error: "Тикет не найден" });
      const msgs = Array.isArray(row.messages) ? [...row.messages] : [];
      msgs.push({ from: "admin", author: "Администратор", text: String(text).trim().slice(0, 2000), ts: Date.now() });
      row.messages = msgs;
      row.status = "answered";
      row.updatedAt = new Date();
      await row.save();
      audit("support_admin_reply", `${row.username}: ${row.subject.slice(0, 40)}`);
      res.json({ ok: true, ticket: ticketJson(row) });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.patch("/api/admin/support/:id", requirePerm("community"), async (req, res) => {
    const { status } = req.body || {};
    if (!"open answered closed".split(" ").includes(status)) {
      return res.status(400).json({ error: "status: open | answered | closed" });
    }
    try {
      const [updated] = await models.SupportTicket.update(
        { status, updatedAt: new Date() },
        { where: { ticketId: req.params.id } }
      );
      if (!updated) return res.status(404).json({ error: "Тикет не найден" });
      audit("support_status", `${req.params.id.slice(0, 8)} → ${status}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/admin/support/:id", requirePerm("community"), async (req, res) => {
    try {
      const deleted = await models.SupportTicket.destroy({ where: { ticketId: req.params.id } });
      if (!deleted) return res.status(404).json({ error: "Тикет не найден" });
      audit("support_delete", req.params.id.slice(0, 8));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/admin/vlogs", requirePerm("content"), (req, res) => {
    res.json({ vlogs: loadVlogs().sort((a, b) => b.createdAt - a.createdAt) });
  });

  /* Vlog image URLs: validated to safe http(s) links, max 6 per vlog. */
  function cleanImageUrls(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((u) => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => /^https:\/\/[\w.-]+(\/[^\s]*)?$/i.test(u) || /^http:\/\/localhost(:\d+)?(\/[^\s]*)?$/i.test(u))
      .slice(0, 6);
  }

  app.post("/api/admin/vlogs", requirePerm("content"), (req, res) => {
    const { title, body, tag, published, images } = req.body || {};
    if (!title || typeof title !== "string" || title.length > 160) {
      return res.status(400).json({ error: "title обязателен (до 160 символов)" });
    }
    if (!body || typeof body !== "string" || body.length > 8000) {
      return res.status(400).json({ error: "body обязателен (до 8000 символов)" });
    }
    const list = loadVlogs();
    const vlog = {
      id: crypto.randomUUID(),
      title: title.trim(),
      body: body.trim(),
      tag: typeof tag === "string" && tag.trim() ? tag.trim().slice(0, 32) : "Новости",
      images: cleanImageUrls(images),
      author: req.session?.user?.username ?? cfg.ADMIN_LOGIN,
      authorAvatar: req.session?.user?.avatar ?? null,
      published: published !== false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    list.push(vlog);
    saveVlogs(list);
    audit("vlog_create", vlog.title);
    if (vlog.published) void telegram.events.vlogPublished(vlog.title, vlog.author);
    res.json({ ok: true, vlog });
  });

  app.patch("/api/admin/vlogs/:id", requirePerm("content"), (req, res) => {
    const list = loadVlogs();
    const idx = list.findIndex((x) => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Влог не найден" });
    const { title, body, tag, published, images } = req.body || {};
    if (typeof title === "string" && title.trim()) list[idx].title = title.trim().slice(0, 160);
    if (typeof body === "string" && body.trim()) list[idx].body = body.trim().slice(0, 8000);
    if (typeof tag === "string" && tag.trim()) list[idx].tag = tag.trim().slice(0, 32);
    if (Array.isArray(images)) list[idx].images = cleanImageUrls(images);
    if (typeof published === "boolean") list[idx].published = published;
    list[idx].updatedAt = Date.now();
    saveVlogs(list);
    audit("vlog_update", list[idx].title);
    res.json({ ok: true, vlog: list[idx] });
  });

  app.delete("/api/admin/vlogs/:id", requirePerm("content"), (req, res) => {
    const list = loadVlogs();
    const next = list.filter((x) => x.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: "Влог не найден" });
    saveVlogs(next);
    audit("vlog_delete", req.params.id);
    res.json({ ok: true });
  });

  /* ------------------------- SPA static + fallback ------------------------- */

  const distDir = path.join(__dirname, "..", "..", "dashboard-dist");
  app.use(express.static(distDir, { index: false }));
  // SPA fallback: serve the app for every page EXCEPT real server endpoints
  // (/api/*, /auth/login, /auth/callback, ...). The bare /auth page is a React
  // route and must be served — it used to 404 when the bot hosted the SPA.
  app.get(/^\/(?!api(\/|$)|auth\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  return app;
}

module.exports = { createDashboardServer };
