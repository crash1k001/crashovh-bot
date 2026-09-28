"use strict";
/*
 * Runtime settings store for values that normally live in config.js /
 * dashboard-config.js. Settings are persisted in the `settings` table via the
 * bot's Sequelize models (falls back to the raw pg pool when the model is
 * unavailable), applied on top of the config objects at runtime, and survive
 * bot restarts. Secrets are masked when read back.
 */

const fs = require("fs");
const path = require("path");

/* Settings editable from the dashboard: key -> metadata. */
const SETTING_DEFS = {
  TELEGRAM_BOT_TOKEN: { group: "telegram", secret: true, min: 0, max: 128, desc: "Токен бота уведомлений (от @BotFather)" },
  TELEGRAM_CHAT_ID: { group: "telegram", secret: false, min: 0, max: 64, desc: "ID чата/канала для уведомлений" },
  TELEGRAM_NOTIFY_ERRORS: { group: "telegram", secret: false, type: "boolean", desc: "Слать критические ошибки в Telegram" },
  PREFIX: { group: "bot", secret: false, min: 1, max: 8, pattern: /^[!?$#%^&*+.a-zа-я0-9]/i, desc: "Префикс текстовых команд (1–8 символов)" },
  STATUS_PRESENCE: { group: "bot", secret: false, min: 3, max: 16, desc: "Статус бота: online / idle / dnd / invisible" },
  STATUS_ACTIVITY: { group: "bot", secret: false, min: 0, max: 64, desc: "Текст активности в статусе" },
  SUPPORT_SERVER: { group: "bot", secret: false, min: 0, max: 200, desc: "Ссылка на сервер поддержки" },
  DASHBOARD_ADMIN_LOGIN: { group: "admin", secret: false, min: 1, max: 64, desc: "Логин администратора дашборда" },
};

const SETTING_GROUPS = ["telegram", "bot", "admin"];

let dbReady = null;
let rawPool = null;

function initDb() {
  if (dbReady) return dbReady;
  dbReady = (async () => {
    const { pool } = require("../data/pg");
    rawPool = pool;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at BIGINT NOT NULL,
        updated_by TEXT
      );
    `);
    return true;
  })().catch((e) => {
    console.error("[settings] db init failed:", e.message);
    return false;
  });
  return dbReady;
}

/* Runtime overrides applied over config objects. */
const runtime = {};
const listeners = new Set();

function loadAll() {
  return initDb().then((ok) => {
    if (!ok) return {};
    return rawPool
      .query("SELECT key, value FROM dashboard_settings")
      .then((res) => {
        for (const row of res.rows) runtime[row.key] = row.value;
        return { ...runtime };
      })
      .catch(() => ({ ...runtime }));
  });
}

async function setMany(updates, updatedBy) {
  const ok = await initDb();
  if (!ok) throw new Error("settings storage unavailable");
  const now = Date.now();
  const applied = {};
  for (const [key, value] of Object.entries(updates)) {
    const def = SETTING_DEFS[key];
    if (!def) continue;
    if (value === null || value === undefined) continue;
    const str = String(value).trim();
    if (def.type === "boolean") {
      if (!["true", "false"].includes(str)) continue;
    } else if (str.length < (def.min ?? 0) || str.length > (def.max ?? 256)) {
      if (str.length === 0 && (def.min ?? 0) === 0) {
        /* allow empty for optional fields */
      } else {
        continue;
      }
    }
    await rawPool.query(
      "INSERT INTO dashboard_settings (key, value, updated_at, updated_by) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3, updated_by = $4",
      [key, str, now, updatedBy ?? null]
    );
    runtime[key] = str;
    applied[key] = str;
  }
  applyToConfig();
  listeners.forEach((fn) => fn({ ...runtime }));
  return applied;
}

function applyToConfig() {
  const botConfig = require("../config");
  const dashConfig = require("../dashboard-config");
  if (runtime.TELEGRAM_BOT_TOKEN) dashConfig.TELEGRAM_BOT_TOKEN = runtime.TELEGRAM_BOT_TOKEN;
  if (runtime.TELEGRAM_CHAT_ID) dashConfig.TELEGRAM_CHAT_ID = runtime.TELEGRAM_CHAT_ID;
  if (runtime.TELEGRAM_NOTIFY_ERRORS) dashConfig.TELEGRAM_NOTIFY_ERRORS = runtime.TELEGRAM_NOTIFY_ERRORS === "true";
  if (runtime.PREFIX) botConfig.PREFIX = runtime.PREFIX;
  if (runtime.STATUS_PRESENCE) botConfig.STATUS.status = runtime.STATUS_PRESENCE;
  if (runtime.STATUS_ACTIVITY !== undefined && runtime.STATUS_ACTIVITY !== "") botConfig.STATUS.activity = runtime.STATUS_ACTIVITY;
  if (runtime.SUPPORT_SERVER) botConfig.SUPPORT_SERVER = runtime.SUPPORT_SERVER;
  if (runtime.DASHBOARD_ADMIN_LOGIN) dashConfig.ADMIN_LOGIN = runtime.DASHBOARD_ADMIN_LOGIN;
}

/* Telegram is considered configured if EITHER env or runtime settings provide
 * both a token and a chat id (applyToConfig copies runtime onto the config). */
function telegramConfigured() {
  applyToConfig();
  const dashConfig = require("../dashboard-config");
  return Boolean(dashConfig.TELEGRAM_BOT_TOKEN && dashConfig.TELEGRAM_CHAT_ID);
}

function getPublic() {
  const out = {};
  for (const [key, def] of Object.entries(SETTING_DEFS)) {
    const raw = runtime[key];
    if (def.secret) {
      out[key] = {
        set: Boolean(raw && raw.length > 0),
        masked: raw ? `${raw.slice(0, 6)}…${raw.slice(-4)}` : "",
      };
    } else {
      out[key] = { set: Boolean(raw), value: raw ?? "" };
    }
    out[key].group = def.group;
    out[key].desc = def.desc;
    out[key].editable = true;
  }
  return out;
}

function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

module.exports = { SETTING_DEFS, SETTING_GROUPS, loadAll, setMany, getPublic, applyToConfig, telegramConfigured, onChange, initDb };
