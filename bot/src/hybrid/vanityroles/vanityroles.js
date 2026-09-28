
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vanity')
        .setDescription('Управление vanity-ролями, выдаваемыми за vanity-код в статусе')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить vanity-роли для сервера')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Показать настройки vanity-ролей')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить все данные vanity-ролей')
        ),

    name: 'vanity',
    aliases: [],
    description: 'Управление vanity-ролями',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const subcommandsPath = path.join(__dirname, 'subcommands');
        const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));

        let subcommandName;
        
        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            subcommandName = args[0];
            if (!subcommandName) {
                const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize} = require('discord.js');
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Команды vanity-ролей')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            'Доступные подкоманды:\n' +
                            '- vanity setup - настроить выдачу роли\n' +
                            '- vanity config - показать настройки\n' +
                            '- vanity reset - удалить все данные\n\n' +
                            'Возможности:\n' +
                            '- Выдаёт роль, если у пользователя vanity-код в статусе\n' +
                            '- Распознаёт: discord.gg/vanitycode, .gg/vanitycode, /vanitycode\n' +
                            '- Снимает роль при очистке статуса'
                        )
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        const subcommandFile = subcommandFiles.find(file => file === `${subcommandName}.js`);
        
        if (!subcommandFile) {
            const { ContainerBuilder, TextDisplayBuilder} = require('discord.js');
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Неизвестная подкоманда: ${subcommandName}`)
                );
            
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }

        const subcommand = require(path.join(subcommandsPath, subcommandFile));
        await subcommand.execute(interactionOrMessage, args.slice(1));
    }
};
