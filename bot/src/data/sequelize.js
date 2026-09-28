const { Sequelize } = require('sequelize');
const config = require('../config.js');

const DATABASE_URL = process.env.DATABASE_URL || config.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured; add a PostgreSQL connection URL to the environment');
}

/* TLS policy: managed cloud Postgres (Neon, Tiger, RDS, Supabase…) requires
 * SSL and signals it via sslmode in the URL — honor that. Self-hosted boxes
 * usually listen plain TCP (SSL handshake kills the connection). So: explicit
 * sslmode always wins; otherwise SSL only for known managed hosts. */
const dbUrl = (() => {
    try { return new URL(DATABASE_URL); } catch { return null; }
})();
const dbHost = dbUrl?.hostname ?? "";
const sslMode = (dbUrl?.searchParams.get("sslmode") || "").toLowerCase();
const MANAGED_DB_HOSTS = /(?:^|\.)(neon\.tech|timescale\.com|tigerdata\.com|amazonaws\.com|azure\.com|supabase\.(co|com)|render\.com|aivencloud\.com|railway\.(app|io)|planetscale\.com|clever-cloud\.com)$/i;
const wantsSsl =
    (sslMode && sslMode !== "disable" && sslMode !== "prefer") ||
    (!sslMode && MANAGED_DB_HOSTS.test(dbHost));
const sslOptions = wantsSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    define: {
        timestamps: true,
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        // TCP keepalive: remote DB/proxies kill idle sockets, which surfaced as
        // "Connection terminated due to connection timeout" on long-lived loops
        // (reminders, vanity roles). keepAlive probes keep them warm.
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        ...sslOptions,
    },
    retry: {
        max: 5,
        match: [
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /ECONNRESET/,
            /ECONNREFUSED/,
        ],
    }
});

module.exports = sequelize;
