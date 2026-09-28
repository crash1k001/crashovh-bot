"use strict";
/* Read-only emoji probe: lists the emojis owned by the bot's application and
 * cross-checks every ID referenced by bot/src/emojis.json. Prints names/ids
 * and a verdict only — never the token. Exit 0 = all referenced IDs owned. */

const path = require("path");

(async () => {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.log("BOT_TOKEN not set");
    process.exit(2);
  }
    const emojis = require(path.join(__dirname, "..", "bot", "src", "emojis.json"));

    /* Decode the application id from the token (same trick emojiSync uses) —
     * the @me/emojis route rejects bot-token auth with 400, but the explicit
     * /applications/:id/emojis route works. */
    const appId = Buffer.from(token.split(".")[0], "base64").toString("utf8");
    if (!/^\d{17,20}$/.test(appId)) {
      console.log("could not decode application id from BOT_TOKEN");
      process.exit(2);
    }

    const owned = new Map();
  try {
    const r = await fetch(`https://discord.com/api/v10/applications/${appId}/emojis`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!r.ok) {
      console.log("applications/:id/emojis failed:", r.status);
      process.exit(1);
    }
    const app = await r.json();
    const list = Array.isArray(app) ? app : (app.items ?? []);
    console.log("emojis owned:", list.length);
    for (const e of list) owned.set(e.id, e.name);
  } catch (e) {
    console.log("network error:", String(e.message).slice(0, 80));
    process.exit(1);
  }

  let missing = 0;
  for (const [name, str] of Object.entries(emojis)) {
    const m = /^<a?:(\w+):(\d+)>$/.exec(String(str));
    if (!m) continue;
    if (!owned.has(m[2])) {
      console.log(`NOT OWNED: ${name} -> :${m[1]}:${m[2]}`);
      missing++;
    }
  }
  console.log(missing === 0 ? "VERDICT: all emojis.json IDs are owned by this application" : `VERDICT: ${missing} emoji(s) not owned — ,help text cannot render them`);
  process.exit(missing === 0 ? 0 : 1);
})();
