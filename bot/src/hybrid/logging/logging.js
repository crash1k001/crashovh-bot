
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Управление настройками логирования сервера')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить каналы логирования для разных событий')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить все настройки логирования')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Показать текущие настройки логирования')
        ),

    name: 'logging',
    aliases: ['logs', 'log'],
    description: 'Управление настройками логирования сервера',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'reset', 'config'].includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('logging', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
