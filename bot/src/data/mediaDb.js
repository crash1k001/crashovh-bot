const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS media_channels (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS media_bypass (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY (guild_id, user_id)
        );
    `);
}

const setMediaChannel = (guildId, channelId) =>
    run('INSERT INTO media_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2', [guildId, channelId]);
const getMediaChannel = (guildId) =>
    getOne('SELECT channel_id FROM media_channels WHERE guild_id = $1', [guildId]);
const removeMediaChannel = (guildId) =>
    run('DELETE FROM media_channels WHERE guild_id = $1', [guildId]);

const addBypass = (guildId, userId) => {
    bypassCache.set(`${guildId}:${userId}`, { val: true, ts: Date.now() });
    return run('INSERT INTO media_bypass (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, userId]);
};
const removeBypass = (guildId, userId) => {
    bypassCache.set(`${guildId}:${userId}`, { val: false, ts: Date.now() });
    return run('DELETE FROM media_bypass WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
};
/* Per-message hot path (media channel enforcement) — served from cache. */
const bypassCache = new Map();
const BYPASS_TTL = 60000;
const getBypass = async (guildId, userId) => {
    const key = `${guildId}:${userId}`;
    const cached = bypassCache.get(key);
    if (cached && Date.now() - cached.ts < BYPASS_TTL) return cached.val ? { user_id: userId } : null;
    const row = await getOne('SELECT 1 FROM media_bypass WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    bypassCache.set(key, { val: !!row, ts: Date.now() });
    return row;
};
const getAllBypasses = (guildId) =>
    getAll('SELECT user_id FROM media_bypass WHERE guild_id = $1', [guildId]);
const getBypassCount = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as count FROM media_bypass WHERE guild_id = $1', [guildId]);
    return parseInt(result?.count || 0);
};

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    setMediaChannel,
    getMediaChannel,
    removeMediaChannel,
    addBypass,
    removeBypass,
    getBypass,
    getAllBypasses,
    getBypassCount,
};
