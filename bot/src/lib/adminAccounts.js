"use strict";
/*
 * Dashboard admin accounts, stored in Postgres (dashboard_admins table).
 *
 * The bot owner (OWNER_ID) is always a super-admin: they can sign in through
 * Discord and additionally receive a generated password so they can log in on
 * the login page like everyone else. Extra admin accounts can be created only
 * by the owner and non-owner admins never see the Accounts module. Passwords
 * are salted scrypt hashes; comparisons use timingSafeEqual.
 */

const crypto = require("crypto");
const { pool } = require("../data/pg");
const botConfig = require("../config");

/* ----------------------------- permissions ------------------------------- */

/* One bit per admin capability; accounts get exactly what the owner ticks. */
const PERMS = {
  overview: 1 << 0,
  moderation: 1 << 1,
  security: 1 << 2,
  community: 1 << 3,
  content: 1 << 4,
  system: 1 << 5,
  accounts: 1 << 6,
  giveaways: 1 << 7,
  control: 1 << 8,
  broadcast: 1 << 9,
};

const PERM_INFO = [
  { key: "overview", bit: PERMS.overview, label: "Обзор и статистика", desc: "Живые KPI, серверы, команды, логи" },
  { key: "moderation", bit: PERMS.moderation, label: "Модерация", desc: "Чёрный список, no-prefix, модер-логи, тикеты" },
  { key: "security", bit: PERMS.security, label: "Безопасность", desc: "DDoS-монитор, аудит, журнал бота" },
  { key: "community", bit: PERMS.community, label: "Сообщество", desc: "Тикеты поддержки, обращения" },
  { key: "content", bit: PERMS.content, label: "Контент", desc: "Влоги и публикации" },
  { key: "system", bit: PERMS.system, label: "Система", desc: "База данных, настройки, статус-страница" },
  { key: "accounts", bit: PERMS.accounts, label: "Аккаунты админов", desc: "Создание админов и выдача прав" },
  { key: "giveaways", bit: PERMS.giveaways, label: "Розыгрыши", desc: "Активные розыгрыши, завершение и удаление" },
  { key: "control", bit: PERMS.control, label: "Управление", desc: "Вкл/выкл команд, настройки Telegram/префикса" },
  { key: "broadcast", bit: PERMS.broadcast, label: "Рассылка", desc: "Массовые сообщения на все серверы" },
];

const PERM_LABELS = Object.fromEntries(PERM_INFO.map((p) => [p.key, p.label]));

/* ------------------------------- storage --------------------------------- */

let tableReady = null;
function initDb() {
  if (tableReady) return tableReady;
  tableReady = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_admins (
        login TEXT PRIMARY KEY,
        pass_hash TEXT NOT NULL,
        perms BIGINT NOT NULL DEFAULT 0,
        is_owner BOOLEAN NOT NULL DEFAULT FALSE,
        disabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_by TEXT,
        created_at BIGINT NOT NULL,
        last_login BIGINT
      );
    `);
    return true;
  })().catch((e) => {
    console.error("[adminAccounts] init failed:", e.message);
    return false;
  });
  return tableReady;
}

/* ------------------------------ passwords -------------------------------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const hash = crypto.scryptSync(String(password), Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(hash, Buffer.from(hashHex, "hex"));
  } catch {
    return false;
  }
}

/* ------------------------------- helpers --------------------------------- */

function validLogin(login) {
  return typeof login === "string" && /^[a-zA-Z0-9_.-]{3,32}$/.test(login);
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/* Owner is seeded lazily on first use — the accounts module works even on a
 * fresh database. The owner row starts WITHOUT a usable password: the owner
 * signs in through Discord (session-based) and then sets their own password
 * from the Accounts tab. A guessable seeded password would be a hole, so
 * pass_hash stays empty until the owner chooses one. */
function ensureOwner() {
  return initDb().then((ok) => {
    if (!ok) return null;
    const ownerId = process.env.OWNER_ID || (typeof botConfig.OWNER_ID === "string" && botConfig.OWNER_ID) || "";
    if (!ownerId) return null;
    return pool
      .query("SELECT login, is_owner FROM dashboard_admins WHERE is_owner = TRUE LIMIT 1")
      .then((res) => {
        if (res.rows.length > 0) return res.rows[0];
        return pool
          .query(
            "INSERT INTO dashboard_admins (login, pass_hash, perms, is_owner, disabled, created_by, created_at) VALUES ('owner', '', $1, TRUE, FALSE, 'system', $2) ON CONFLICT (login) DO NOTHING",
            [ALL_PERMS, Date.now()]
          )
          .then(() => ({ login: "owner", is_owner: true, seeded: true }));
      });
  });
}

const ALL_PERMS = Object.values(PERMS).reduce((a, b) => a | b, 0);

/* ------------------------------- CRUD ------------------------------------ */

function listAccounts() {
  return initDb().then((ok) =>
    ok
      ? pool
          .query("SELECT login, perms, is_owner, disabled, created_by, created_at, last_login FROM dashboard_admins ORDER BY is_owner DESC, created_at ASC")
          .then((r) => r.rows)
      : []
  );
}

function createAccount({ login, password, perms, createdBy }) {
  return ensureOwner().then(() => {
    if (!validLogin(login)) return { ok: false, error: "Логин: 3–32 символа, латиница/цифры/._-" };
    if (!validPassword(password)) return { ok: false, error: "Пароль: минимум 8 символов, буквы и цифры" };
    const mask = Number(perms) || 0;
    return pool
      .query("SELECT login FROM dashboard_admins WHERE login = $1", [login])
      .then((dup) => {
        if (dup.rows.length > 0) return { ok: false, error: "Такой логин уже существует" };
        return pool
          .query(
            "INSERT INTO dashboard_admins (login, pass_hash, perms, is_owner, disabled, created_by, created_at) VALUES ($1,$2,$3,FALSE,FALSE,$4,$5)",
            [login, hashPassword(password), mask, createdBy || "owner", Date.now()]
          )
          .then(() => ({ ok: true }));
      });
  });
}

function updateAccount(login, { password, perms, disabled }, byOwner) {
  return ensureOwner().then(() => {
    if (!validLogin(login)) return { ok: false, error: "Неверный логин" };
    const sets = [];
    const args = [];
    if (password != null) {
      if (!validPassword(password)) return { ok: false, error: "Пароль: минимум 8 символов, буквы и цифры" };
      args.push(hashPassword(password));
      sets.push(`pass_hash = $${args.length}`);
    }
    if (perms != null && byOwner) {
      args.push(Number(perms) || 0);
      sets.push(`perms = $${args.length}`);
    }
    if (disabled != null) {
      args.push(Boolean(disabled));
      sets.push(`disabled = $${args.length}`);
    }
    if (sets.length === 0) return { ok: false, error: "Нечего обновлять" };
    args.push(login);
    return pool
      .query(`UPDATE dashboard_admins SET ${sets.join(", ")} WHERE login = $1 AND is_owner = FALSE`, args)
      .then((r) => (r.rowCount > 0 ? { ok: true } : { ok: false, error: "Аккаунт не найден" }));
  });
}

function deleteAccount(login) {
  return ensureOwner().then(() =>
    pool
      .query("DELETE FROM dashboard_admins WHERE login = $1 AND is_owner = FALSE", [login])
      .then((r) => (r.rowCount > 0 ? { ok: true } : { ok: false, error: "Нельзя удалить: аккаунт не найден или это овнер" }))
  );
}

/* Owner (or any admin changing their own password) sets a usable password;
 * unlike updateAccount this also works on the owner row. */
function setPassword(login, password) {
  return ensureOwner().then(() => {
    if (!validPassword(password)) return { ok: false, error: "Пароль: минимум 8 символов, буквы и цифры" };
    return pool
      .query("UPDATE dashboard_admins SET pass_hash = $2 WHERE login = $1", [login, hashPassword(password)])
      .then((r) => (r.rowCount > 0 ? { ok: true } : { ok: false, error: "Аккаунт не найден" }));
  });
}

/* Point the owner row at a chosen login + password so the owner can use the
 * regular login page. Targets the is_owner row regardless of its current
 * login (the seeded row starts as "owner" with no password). */
function setOwnerCredentials(login, password) {
  return ensureOwner().then(() => {
    if (!validLogin(login)) return { ok: false, error: "Логин: 3–32 символа, латиница/цифры/._-" };
    if (!validPassword(password)) return { ok: false, error: "Пароль: минимум 8 символов, буквы и цифры" };
    return pool
      .query("UPDATE dashboard_admins SET login = $1, pass_hash = $2 WHERE is_owner = TRUE", [login, hashPassword(password)])
      .then((r) => (r.rowCount > 0 ? { ok: true } : { ok: false, error: "Овнер не найден" }));
  });
}

/* Change the owner row's login-page password (login stays as-is). */
function setOwnerPassword(password) {
  return ensureOwner().then(() => {
    if (!validPassword(password)) return { ok: false, error: "Пароль: минимум 8 символов, буквы и цифры" };
    return pool
      .query("UPDATE dashboard_admins SET pass_hash = $1 WHERE is_owner = TRUE", [hashPassword(password)])
      .then((r) => (r.rowCount > 0 ? { ok: true } : { ok: false, error: "Овнер не найден" }));
  });
}

/* Login check used by /auth/admin-login: DB account first, then env fallback. */
function checkAccount(login, password) {
  return ensureOwner()
    .then(() =>
      pool.query("SELECT login, pass_hash, perms, is_owner, disabled FROM dashboard_admins WHERE login = $1", [login])
    )
    .then((r) => {
      const row = r.rows[0];
      if (!row) return { ok: false, notFound: true };
      if (row.disabled) return { ok: false, error: "Аккаунт отключён" };
      if (!row.pass_hash) return { ok: false, noPassword: true, isOwner: row.is_owner };
      if (!verifyPassword(password, row.pass_hash)) return { ok: false, error: "Неверный логин или пароль" };
      return pool
        .query("UPDATE dashboard_admins SET last_login = $2 WHERE login = $1", [row.login, Date.now()])
        .then(() => ({ ok: true, login: row.login, perms: Number(row.perms), isOwner: row.is_owner }));
    })
    .catch((e) => {
      console.error("[adminAccounts] check failed:", e.message);
      return { ok: false, error: "Ошибка базы данных" };
    });
}

module.exports = {
  PERMS,
  PERM_INFO,
  PERM_LABELS,
  ALL_PERMS,
  ensureOwner,
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  checkAccount,
  setPassword,
  setOwnerCredentials,
  setOwnerPassword,
  validPassword,
};
