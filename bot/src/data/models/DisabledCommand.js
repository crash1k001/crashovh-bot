const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

/* Per-guild command overrides, written by the dashboard and enforced in the
 * bot's interactionCreate/messageCreate flows. enabled=false disables the
 * command on that guild; a missing row keeps defaults. */
class DisabledCommand extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                commandName: { type: DataTypes.STRING, allowNull: false, comment: 'Command name without prefix/slash' },
                enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
                updatedBy: { type: DataTypes.STRING, allowNull: true, comment: 'Who changed it (dashboard/Discord tag)' },
            },
            {
                sequelize,
                modelName: 'DisabledCommand',
                tableName: 'disabled_commands',
                timestamps: true,
                indexes: [
                    { unique: true, fields: ['guildId', 'commandName'] },
                    { fields: ['guildId'] },
                ],
            }
        );
        return this;
    }

    /* Fast in-memory cache (30s) mirroring GuildPrefix so the hot path
     * (every message / interaction) doesn't hit PostgreSQL. */
    static _cache = new Map();
    static _CACHE_TTL = 30_000;

    static invalidate(guildId) {
        this._cache.delete(guildId);
    }

    static async getOverrides(guildId) {
        const cached = this._cache.get(guildId);
        if (cached && Date.now() - cached.ts < this._CACHE_TTL) return cached.map;
        let map = new Map();
        try {
            const rows = await this.findAll({ where: { guildId } });
            map = new Map(rows.map((r) => [r.commandName, Boolean(r.enabled)]));
        } catch {
            map = new Map();
        }
        this._cache.set(guildId, { map, ts: Date.now() });
        return map;
    }

    static async setOverride(guildId, commandName, enabled, updatedBy = null) {
        const [row] = await this.findOrCreate({
            where: { guildId, commandName },
            defaults: { enabled, updatedBy },
        });
        if (row.enabled !== enabled || (updatedBy && row.updatedBy !== updatedBy)) {
            row.enabled = enabled;
            if (updatedBy) row.updatedBy = updatedBy;
            await row.save();
        }
        this.invalidate(guildId);
        return row;
    }
}

module.exports = DisabledCommand;
