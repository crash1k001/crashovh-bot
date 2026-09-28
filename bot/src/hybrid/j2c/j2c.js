
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('j2c')
        .setDescription('Управление системой Join2Create')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить систему Join2Create')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Показать текущие настройки J2C')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить настройки J2C')
        ),

    name: 'j2c',
    aliases: ['join2create'],
    description: 'Управление системой Join2Create',
    category: 'general',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();

        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'config', 'reset'].includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('j2c', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
