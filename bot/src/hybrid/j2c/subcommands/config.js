
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { J2CConfig } = require('../../../data/models');

module.exports = {
    name: 'config',
    description: 'Показать текущие настройки J2C',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право Администратор, чтобы использовать эту команду.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await J2CConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Система J2C не настроена на этом сервере.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const textCh = guild.channels.cache.get(config.textChannelId);
        const voiceCh = guild.channels.cache.get(config.voiceChannelId);
        const category = guild.channels.cache.get(config.categoryId);

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Настройки J2C**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Панель управления:** ${textCh ? textCh : 'Канал удалён'}\n` +
                    `**Канал J2C:** ${voiceCh ? voiceCh : 'Канал удалён'}\n` +
                    `**Категория:** ${category ? category.name : 'Категория удалена'}`
                )
            );

        await interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    },
};
