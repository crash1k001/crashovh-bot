
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('Защитить сервер от нюк-атак')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить антинюк через интерактивный мастер')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Просмотреть и изменить текущие настройки антинюка')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Включить систему антинюка')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Отключить систему антинюка')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Управление списком доверенных пользователей')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Действие для выполнения')
                        .setRequired(false)
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'remove', value: 'remove' },
                            { name: 'list', value: 'list' }
                        )
                )
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь для добавления/удаления из исключений')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить антинюк к настройкам по умолчанию и отключить его')
        ),

    name: 'antinuke',
    aliases: ['an', 'nuke'],
    description: 'Защитить сервер от нюк-атак',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'settings', 'enable', 'disable', 'whitelist', 'reset'].includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('antinuke', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
