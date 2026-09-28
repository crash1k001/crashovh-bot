"use strict";
/*
 * Preview bootstrap.
 *
 * Tries the FULL bot first (client.js) so the admin panel gets real servers,
 * users and gateway data. If the environment is not ready for the bot
 * (no BOT_TOKEN / no DATABASE_URL — e.g. a hosted preview sandbox), it falls
 * back to the standalone dashboard server, which serves the same SPA and API
 * and degrades gracefully instead of dying.
 *
 * The child process inherits stdio, so all bot logs stay visible in the
 * preview log stream.
 */

const { spawn } = require("child_process");
const path = require("path");

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

if (!BOT_TOKEN || !DATABASE_URL) {
  const missing = [!BOT_TOKEN && "BOT_TOKEN", !DATABASE_URL && "DATABASE_URL"].filter(Boolean);
  console.log(
    `[preview] ${missing.join(", ")} not configured — starting standalone dashboard ` +
      `(panel works, live bot data disabled until the env vars are set)`
  );
  require("./dashboard-standalone.js");
  process.exitCode = 0;
} else {
  const child = spawn(process.execPath, [path.join(__dirname, "client.js")], {
    stdio: "inherit",
    env: process.env,
  });
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => child.kill(sig));
  }
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}
