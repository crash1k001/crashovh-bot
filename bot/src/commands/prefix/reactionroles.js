
module.exports = {
    name: 'reactionroles',
    description: 'Показать команды ролей по реакции',
    aliases: ['rr'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('reactionroles', message);
        }
        const hybrid = require('../hybrid/reactionroles/reactionroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('reactionroles', message);
    }
};
