const { Pool } = require('pg');
const config = require('../config.js');

/*
 * Pool hardening (fixes repeated "[Reminders] Connection terminated unexpectedly"):
 *  - keepAlive keeps idle TCP sockets warm so a remote DB/proxy dropping idle
 *    connections is detected and recovered instead of failing the next query.
 *  - a shorter idleTimeoutMillis recycles clients before the server cuts them.
 *  - withRetry transparently re-runs a query once when the connection died
 *    between checks (transient network errors only — real SQL errors bubble up).
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || config.DATABASE_URL,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false,
    statement_timeout: 15000,
    query_timeout: 15000,
});

pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

const TRANSIENT = [
    'Connection terminated',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'Client has encountered a connection error',
    'Connection terminated unexpectedly',
    'server closed the connection'
];

function isTransient(err) {
    const msg = String(err && err.message ? err.message : err);
    return TRANSIENT.some((m) => msg.includes(m));
}

async function withRetry(fn) {
    try {
        return await fn();
    } catch (err) {
        if (!isTransient(err)) throw err;
        // one silent retry on a fresh client from the pool
        await new Promise((r) => setTimeout(r, 150));
        try {
            return await fn();
        } catch (err2) {
            if (!isTransient(err2)) throw err2;
            // second retry after a longer pause — survives DB failover windows
            await new Promise((r) => setTimeout(r, 1000));
            return fn();
        }
    }
}

const query = (text, params) => withRetry(() => pool.query(text, params));

const getOne = async (text, params) => {
    const res = await query(text, params);
    return res.rows[0] || null;
};

const getAll = async (text, params) => {
    const res = await query(text, params);
    return res.rows;
};

const run = async (text, params) => {
    const res = await query(text, params);
    return { changes: res.rowCount };
};

module.exports = { pool, query, getOne, getAll, run };
