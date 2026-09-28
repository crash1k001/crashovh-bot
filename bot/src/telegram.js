"use strict";
/*
 * Telegram notifications for Niko.
 * Notifies the owner about important events: bot start, new/left guilds,
 * dashboard admin logins, published vlogs, broadcasts, errors.
 *
 * Configure via .env:
 *   TELEGRAM_BOT_TOKEN=123456:ABC...   (from @BotFather)
 *   TELEGRAM_CHAT_ID=123456789         (your user id or channel id)
 *
 * Optional:
 *   TELEGRAM_NOTIFY_ERRORS=false       (disable error notifications)
 */

const cfg = require("./dashboard-config");

const API = "https://api.telegram.org";

function isConfigured() {
  return Boolean(cfg.TELEGRAM_BOT_TOKEN && cfg.TELEGRAM_CHAT_ID);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Send a raw HTML message to the configured chat. Never throws. */
async function sendTelegram(text, { silent = false } = {}) {
  if (!isConfigured()) return { ok: false, error: "telegram не настроен" };
  try {
    const res = await fetch(`${API}/bot${cfg.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        disable_notification: silent,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Build and send a titled notification block. */
async function notify(title, lines = [], { silent = false } = {}) {
  const body = [title, ...lines.filter(Boolean).map((l) => `• ${l}`)].join("\n");
  return sendTelegram(escapeHtml(body), { silent });
}

/* --------------------------- ready-made event senders ---------------------- */

const t = () => new Date().toLocaleString("ru-RU", { timeZone: process.env.TZ || "Europe/Berlin" });

const events = {
  botStarted: (tag, guilds) =>
    notify("🟢 Niko запущен", [`Аккаунт: ${tag}`, `Серверов: ${guilds}`, `Время: ${t()}`]),

  guildJoin: (name, id, members) =>
    notify("➕ Бота добавили на сервер", [name, `ID: ${id}`, `Участников: ${members}`, t()]),

  guildLeave: (name, id) =>
    notify("➖ Бот покинул сервер", [name, `ID: ${id}`, t()]),

  adminLogin: (ip, user) =>
    notify("🔐 Вход в админ-панель", [`Пользователь: ${user || "admin"}`, `IP: ${ip}`, t()]),

  adminLoginFailed: (ip) =>
    notify("⚠️ Неудачная попытка входа в админку", [`IP: ${ip}`, t()]),

  vlogPublished: (title, author) =>
    notify("📝 Опубликован влог", [title, `Автор: ${author}`, t()]),

  broadcast: (sent, failed, preview) =>
    notify("📢 Рассылка отправлена", [`Доставлено: ${sent}`, `Ошибок: ${failed}`, `Текст: ${preview}`, t()]),

  commandsReloaded: (message) => notify("♻️ Команды перезагружены", [message, t()]),

  error: (context, message) =>
    notify("🔴 Ошибка бота", [`Контекст: ${context}`, `Текст: ${message}`, t()]),

  ddosAlert: (level, ip, detail, stats) =>
    notify(
      level === "ALERT" ? "🚨 DDoS-АТАКА — IP ЗАБЛОКИРОВАН" : "⚠️ Подозрительная активность",
      [`IP: ${ip}`, detail, stats ? `Заблокировано запросов: ${stats.blocked}` : null, `Время: ${t()}`],
      { silent: level !== "ALERT" }
    ),

  supportNew: (username, subject) =>
    notify("🆕 Новый тикет поддержки", [`От: ${username}`, `Тема: ${subject}`, t()]),

  supportReply: (username, subject, preview) =>
    notify("💬 Новое сообщение в поддержке", [`От: ${username}`, `Тема: ${subject}`, `Текст: ${preview}`, t()]),

  test: () => notify("✅ Тест уведомлений Niko", ["Если вы видите это сообщение — Telegram подключён корректно.", t()]),
};

module.exports = { isConfigured, sendTelegram, notify, events };
