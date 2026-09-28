
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Управление настройками приветственного сообщения')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить приветствие для новых участников')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить все настройки приветствия')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Показать текущие настройки приветствия')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Предпросмотр приветствия на вашем профиле')
        ),

    name: 'welcome',
    aliases: ['welcomer', 'greet'],
    description: 'Управление настройками приветственного сообщения',

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
            return require('../../lib/helpMenu').sendHelp('welcome', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
