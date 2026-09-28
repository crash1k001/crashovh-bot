
module.exports = {
    name: 'botprofile',
    description: 'Показать команды профиля бота',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('botprofile', message);
        }
        return require('../../lib/helpMenu').sendHelp('botprofile', message);
    }
};
