
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { FarewellConfig } = require('../../../data/models');

module.exports = {
    name: 'setup',
    description: 'Настроить прощальное сообщение',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const existing = await FarewellConfig.findOne({ where: { guildId: guild.id } });
        if (existing?.channelId) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Уже настроено'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Используйте `farewell config` для изменения или `farewell reset`, чтобы начать заново.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право **Администратор**, чтобы использовать эту команду.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`farewell_setup_simple_${userId}`)
                .setLabel('Простой')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`farewell_setup_container_${userId}`)
                .setLabel('Контейнер')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`farewell_cancel_${userId}`)
                .setLabel('Отмена')
                .setStyle(ButtonStyle.Danger)
        );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Настройка прощания')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Выберите тип прощального сообщения:\n\n**Простой**\nОбычное текстовое сообщение. Можно использовать плейсхолдеры для персонализации.\n\n**Контейнер**\nСообщение в формате контейнера. Можно настроить заголовок, описание, изображение и т.д.')
            )
            .addActionRowComponents(buttonRow);

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
