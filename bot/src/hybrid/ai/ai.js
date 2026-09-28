
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI-команды')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ask')
                .setDescription('Пообщаться с AI')
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('Ваше сообщение для AI')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('analyse')
                .setDescription('Проанализировать изображение через AI')
                .addAttachmentOption(option =>
                    option.setName('image')
                        .setDescription('Изображение для анализа')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('Что вы хотите узнать об изображении?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Включить AI-ответы в текущем канале')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Отключить AI-ответы в текущем канале')
        ),

    name: 'ai',
    aliases: ['ai ask', 'ai analyse', 'ai analyze', 'ai enable', 'ai disable', 'luna ask', 'luna analyse', 'luna analyze', 'luna enable', 'luna disable'],
    description: 'AI-команды',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();

        
        const subcommands = {
            'ask': require('./subcommands/ask.js'),
            'analyse': require('./subcommands/analyse.js'),
            'analyze': require('./subcommands/analyse.js'),
            'enable': require('./subcommands/enable.js'),
            'disable': require('./subcommands/disable.js')
        };

        let subcommandName;

        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            const messageText = interactionOrMessage.content.toLowerCase();

            if (messageText.includes('enable')) {
                subcommandName = 'enable';
            } else if (messageText.includes('disable')) {
                subcommandName = 'disable';
            } else if (messageText.includes('analyse') || messageText.includes('analyze')) {
                subcommandName = 'analyse';
            } else if (messageText.includes('ask')) {
                subcommandName = 'ask';
                if (args.length > 0 && args[0].toLowerCase() === 'ask') {
                    args = args.slice(1);
                }
            } else if (args.length === 0) {
                return require('../../lib/helpMenu').sendHelp('ai', interactionOrMessage);
            } else {
                subcommandName = 'ask';
            }
        }

        const subcommand = subcommands[subcommandName];

        if (!subcommand) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Неизвестная подкоманда: ${subcommandName}\n\nИспользуйте \`ai ask\`, \`ai analyse\`, \`ai enable\` или \`ai disable\``)
                );

            const replyOptions = {
                components: [container],
                flags: MessageFlags.IsComponentsV2
            };

            return interactionOrMessage.reply(replyOptions);
        }

        await subcommand.execute(interactionOrMessage, args);
    }
};
