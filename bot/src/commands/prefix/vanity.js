
module.exports = {
    name: 'vanity',
    description: 'Показать команды vanity-ролей',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('vanity', message);
        }
        const hybrid = require('../hybrid/vanityroles/vanityroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('vanity', message);
    }
};
