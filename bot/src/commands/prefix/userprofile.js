
module.exports = {
    name: 'userprofile',
    description: 'Показать команды профиля пользователя',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('userprofile', message);
        }
        return require('../../lib/helpMenu').sendHelp('userprofile', message);
    }
};
