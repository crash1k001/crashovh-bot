
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Настроить автоматическую модерацию сообщений')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить автомодерацию через интерактивный мастер')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Просмотреть и изменить текущие настройки автомодерации')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Включить систему автомодерации')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Отключить систему автомодерации')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Управление списком исключений: пользователи, роли, каналы')
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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить автомодерацию к настройкам по умолчанию и отключить её')
        ),

    name: 'automod',
    aliases: ['am', 'automoderation'],
    description: 'Настроить автоматическую модерацию сообщений',

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
            return require('../../lib/helpMenu').sendHelp('automod', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
