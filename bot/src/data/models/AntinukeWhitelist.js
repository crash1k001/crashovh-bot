
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AntinukeWhitelist extends BaseModel {
    static CACHE_KEYS = [['guildId', 'userId']];
    
    static EVENTS = {
        ban: 'Анти-бан',
        kick: 'Анти-кик',
        channel_create: 'Анти-создание каналов',
        channel_delete: 'Анти-удаление каналов',
        role_create: 'Анти-создание ролей',
        role_delete: 'Анти-удаление ролей',
        role_update: 'Анти-изменение ролей',
        webhook_create: 'Анти-вебхуки',
        bot_add: 'Анти-бот',
        guild_update: 'Анти-изменение сервера'
    };

    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                userId: { type: DataTypes.STRING, allowNull: false, comment: 'Whitelisted User ID' },
                addedBy: { type: DataTypes.STRING, allowNull: false, comment: 'Who added this user' },
                events: { 
                    type: DataTypes.TEXT, 
                    allowNull: true, 
                    defaultValue: null,
                    comment: 'JSON array of whitelisted events, null means all events',
                    get() {
                        const value = this.getDataValue('events');
                        return value ? JSON.parse(value) : null;
                    },
                    set(value) {
                        this.setDataValue('events', value ? JSON.stringify(value) : null);
                    }
                },
            },
            {
                sequelize,
                modelName: 'AntinukeWhitelist',
                tableName: 'antinuke_whitelist',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId', 'userId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = AntinukeWhitelist;

/*
: ! Aegis !
    + Discord: itsfizys
    + Portfolio: https://itsfiizys.com
    + Community: https://discord.gg/8wfT8SfB5Z  (Niko )
    + for any queries reach out Community or DM me.
*/
