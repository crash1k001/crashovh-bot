
const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'moderation',
    description: 'Показать команды модерации',
    aliases: ['mod'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('moderation', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'moderation', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../lib/helpMenu').sendHelp('moderation', message);
    }
};
