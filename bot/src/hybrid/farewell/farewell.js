
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farewell')
        .setDescription('Управление настройками прощального сообщения')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить прощание для выходящих участников')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить все настройки прощания')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Показать текущие настройки прощания')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Предпросмотр прощания на вашем профиле')
        ),

    name: 'farewell',
    aliases: ['goodbye', 'leave'],
    description: 'Управление настройками прощального сообщения',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'reset', 'config', 'test'].includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('farewell', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
