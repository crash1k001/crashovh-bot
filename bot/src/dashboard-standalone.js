"use strict";
/*
 * Niko Dashboard — standalone mode.
 *
 * Runs the same dashboard server as the bot, but WITHOUT the Discord client:
 * used for previewing/developing the dashboard while the bot token is offline,
 * or when the real bot runs on a different host.
 *
 * The full setup (bot + dashboard in ONE process) starts with:
 *
 *   cd bot && node src/client.js
 *
 * Data is real: PostgreSQL models are loaded here too, so support tickets,
 * mod logs and guild configs live in the same database. Guild-dependent
 * endpoints honestly return empty lists — never fake data.
 */

async function main() {
  const { createDashboardServer } = require("./dashboard-server");
  const cfg = require("./dashboard-config");

  // Load the real DB models so support tickets etc. persist exactly like in bot mode.
  // Object-style models (SupportTicket, Blacklist, ...) wrap the sequelize model in
  // `.model` — unwrap them so `models.X.findAll(...)` works uniformly.
  let models = {};
  try {
    const raw = require("./data/models");
    await raw.dbReady;
    for (const [name, m] of Object.entries(raw)) {
      if (!m || typeof m !== "object") { models[name] = m; continue; }
      const target = typeof m.findAll === "function" ? m : m.model;
      models[name] = target && typeof target.findAll === "function" ? target : m;
    }
    console.log("[dashboard] PostgreSQL connected — support/mod data is live");
  } catch (e) {
    console.error("[dashboard] DB unavailable, running without persistence:", e.message);
  }

  const app = createDashboardServer(null, models);
  const port = cfg.DASHBOARD_PORT;
  app.listen(port, "0.0.0.0", () => {
    console.log("");
    console.log("  ┌───────────────────── Niko Control Center (standalone) ──────────────────┐");
    console.log(`  │  Лендинг + дашборд:   http://localhost:${port}/                          │`);
    console.log(`  │  Вход через Discord:  http://localhost:${port}/auth                       │`);
    console.log(`  │  Админ-панель:        http://localhost:${port}/admin                     │`);
    console.log("  │  Redirect URI (Discord Developer Portal → OAuth2 → Redirects):          │");
    console.log(`  │    ${cfg.DASHBOARD_REDIRECT_URI || `http://localhost:${port}/auth/callback`}`.padEnd(74) + "│");
    console.log("  └─────────────────────────────────────────────────────────────────────────┘");
    console.log("");
  });
}

main().catch((err) => {
  console.error("[dashboard] failed to start standalone:", err.message);
  process.exit(1);
});
