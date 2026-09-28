
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { LoggingConfig } = require('../../../data/models');

const LOG_CATEGORIES = [
    { value: 'messageLogs', label: 'Логи сообщений', description: 'Удаление, изменение и массовое удаление' },
    { value: 'memberLogs', label: 'Логи участников', description: 'Вступление, выход и изменения профиля' },
    { value: 'moderationLogs', label: 'Логи модерации', description: 'Бан, разбан, кик и тайм-аут' },
    { value: 'serverLogs', label: 'Логи сервера', description: 'Каналы, роли и настройки сервера' },
    { value: 'voiceLogs', label: 'Голосовые логи', description: 'Вход, выход, переход и мьют' }
];

function buildCategorySelect(placeholder = 'Выберите тип логов для настройки') {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('logging_category_select')
        .setPlaceholder(placeholder)
        .setMinValues(1)
        .setMaxValues(1);
    for (const cat of LOG_CATEGORIES) {
        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setValue(cat.value)
                .setLabel(cat.label)
                .setDescription(cat.description)
        );
    }
    return menu;
}

module.exports = {
    name: 'setup',
    description: 'Настроить каналы логирования',
    LOG_CATEGORIES,
    buildCategorySelect,

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;

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

        const existing = await LoggingConfig.findOne({ where: { guildId: interactionOrMessage.guild.id } });
        if (existing) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Уже настроено')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Логирование уже настроено для этого сервера.\nИспользуйте **logging config** для просмотра или **logging reset**, чтобы начать заново.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '**Настройка логирования**\n' +
                    'Выберите категорию логов ниже, чтобы назначить канал.'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(buildCategorySelect())
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('logging_setup_cancel')
                        .setLabel('Отмена')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
