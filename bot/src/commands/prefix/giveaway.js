
module.exports = {
    name: 'giveaway',
    description: 'Показать команды розыгрышей',
    aliases: ['gw'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('giveaway', message);
        }
        const hybrid = require('../hybrid/giveaway/giveaway');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('giveaway', message);
    }
};
