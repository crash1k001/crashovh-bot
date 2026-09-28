
const emojis = require('../../../emojis.json');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');
const { deleteConfig, deleteGuildData, getConfig } = require('../../../data/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const userId = isSlashCommand ? interactionOrMessage.user.id : interactionOrMessage.author.id;

            const config = await getConfig(guild.id);

            if (!config) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# Нечего сбрасывать\nVanity-роли не настроены для этого сервера")
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            
            const confirmButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('Отмена')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('reset_confirm')
                    .setLabel('Удалить все данные')
                    .setStyle(ButtonStyle.Danger)
            );

            const confirmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Подтверждение сброса")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "Это удалит:\n" +
                        "- Настройки vanity-роли\n" +
                        "- Все данные отслеживания\n\n" +
                        "Это действие нельзя отменить!"
                    )
                )
                .addActionRowComponents(confirmButtons);

            const msg = await interactionOrMessage.reply({
                components: [confirmContainer],
                flags: MessageFlags.IsComponentsV2
            });

            
            const collector = msg.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === userId,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'reset_confirm') {
                    
                    await deleteConfig(guild.id);
                    await deleteGuildData(guild.id);

                    const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`# Сброс завершён ${emojis.success}\nВсе данные vanity-ролей удалены`)
                        );

                    await interaction.update({
                        components: [successContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else if (interaction.customId === 'reset_cancel') {
                    const cancelContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Сброс отменён")
                        );

                    await interaction.update({
                        components: [cancelContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', () => {
                
            });

        } catch (error) {
            console.error('Reset command error:', error);
            const { ContainerBuilder, TextDisplayBuilder} = require('discord.js');
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Ошибка\nНе удалось сбросить vanity-роли")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }
    }
};
