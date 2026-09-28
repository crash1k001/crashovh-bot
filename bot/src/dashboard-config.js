"use strict";
/*
 * Niko Dashboard Config — центральная конфигурация дашборда.
 * Все значения можно переопределить через .env на хосте.
 */

module.exports = {
  BOT_NAME: process.env.BOT_NAME || "Niko",

  // ── Dashboard server ──
  // PORT is injected by hosting platforms; DASHBOARD_PORT wins if set explicitly.
  DASHBOARD_ENABLED: (process.env.DASHBOARD_ENABLED || "true").toLowerCase() === "true",
  DASHBOARD_PORT: parseInt(process.env.DASHBOARD_PORT || process.env.PORT || "3000", 10),
  DASHBOARD_URL: process.env.DASHBOARD_URL || "",

  // ── Discord OAuth2 ──
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
  DASHBOARD_REDIRECT_URI: process.env.DASHBOARD_REDIRECT_URI || "",

  // ── Admin panel (secure-by-default) ──
  // Credentials must be explicitly configured; never ship a working default.
  ADMIN_LOGIN: process.env.DASHBOARD_ADMIN_LOGIN || "",
  ADMIN_PASSWORD: process.env.DASHBOARD_ADMIN_PASSWORD || "",
  // sha256-хэш пароля (hex). Если задан — используется вместо ADMIN_PASSWORD.
  ADMIN_PASSWORD_HASH: process.env.DASHBOARD_ADMIN_PASSWORD_HASH || "",
  // Runtime-only override set by the password-change endpoint.
  adminPasswordOverride: null,

  // ── Sessions ──
  // A configured secret keeps sessions valid across restarts. A random fallback
  // is safe, but intentionally invalidates existing sessions after a restart.
  SESSION_SECRET:
    process.env.DASHBOARD_SESSION_SECRET || require("crypto").randomBytes(32).toString("hex"),

  // ── Bot identity (fallback для статус-страницы) ──
  SUPPORT_SERVER: process.env.SUPPORT_SERVER || "https://discord.gg/aerox",

  // ── Telegram уведомления ──
  // Токен от @BotFather и ID чата/канала, куда слать уведомления
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
  TELEGRAM_NOTIFY_ERRORS: (process.env.TELEGRAM_NOTIFY_ERRORS || "true").toLowerCase() !== "false",

  // ── Внешние API (при необходимости добавить в .env) ──
  SERPAPI_KEY: process.env.SERPAPI_KEY || "",
  GROQ_KEY: process.env.GROQ_KEY || "",
};
