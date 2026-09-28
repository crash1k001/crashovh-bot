"use strict";
/*
 * One-shot DB connectivity probe: tries TLS first, then plain TCP, and
 * prints ONLY the outcome (never the connection string). Reads DATABASE_URL
 * from the environment; exits 0 when the database answered.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log("DATABASE_URL not set");
  process.exit(2);
}

function hostOnly(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "?";
  }
}

(async () => {
  /* pg lives in bot/node_modules (the bot's own dependency) — resolve from there. */
  const path = require("path");
  const { Client } = require(path.join(__dirname, "..", "bot", "node_modules", "pg"));
  for (const mode of ["ssl", "plain"]) {
    try {
      const client = new Client({
        connectionString,
        connectionTimeoutMillis: 8000,
        ssl: mode === "ssl" ? { require: true, rejectUnauthorized: false } : undefined,
      });
      await client.connect();
      const r = await client.query("select version() as v");
      console.log(mode.toUpperCase(), "OK:", String(r.rows[0].v).slice(0, 44));
      await client.end();
      process.exit(0);
    } catch (e) {
      console.log(mode.toUpperCase(), "FAIL:", String(e.message).slice(0, 90));
    }
  }
  console.log("HOST:", hostOnly(connectionString));
  process.exit(1);
})();
