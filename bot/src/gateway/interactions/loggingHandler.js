
const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ChannelType,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const { LoggingConfig, GuildConfig } = require('../../data/models');
const { LOG_CATEGORIES, buildCategorySelect: buildCategorySelectFromSetup } = require('../../hybrid/logging/subcommands/setup');

function buildCategorySelect(placeholder = 'Настроить ещё одну категорию логов') {
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

async function handle(interaction) {
    const id = interaction.customId;

    if (interaction.isButton()) {
        if (id === 'logging_setup_cancel') {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Настройка логирования**\nНастройка отменена. Изменения не сохранены.')
                );
            return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (id === 'logging_setup_done') {
            const fmt = (channelId) => channelId ? `<#${channelId}>` : 'Не задан';

            try {
                const config = await LoggingConfig.findOne({ where: { guildId: interaction.guild.id } });

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Настройки логирования')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            config
                                ? `> **Логи сообщений:** ${fmt(config.messageLogsChannelId)}\n` +
                                  `> **Логи участников:** ${fmt(config.memberLogsChannelId)}\n` +
                                  `> **Логи модерации:** ${fmt(config.moderationLogsChannelId)}\n` +
                                  `> **Логи сервера:** ${fmt(config.serverLogsChannelId)}\n` +
                                  `> **Голосовые логи:** ${fmt(config.voiceLogsChannelId)}`
                                : 'Каналы не были настроены.'
                        )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Используйте logging config для просмотра • logging reset для сброса')
                    );

                return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } catch (_) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Настройки логирования\nНастройка завершена.')
                    );
                return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }

        if (id === 'logging_setup_back') {
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
                    new ActionRowBuilder().addComponents(buildCategorySelectFromSetup())
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('logging_setup_cancel')
                            .setLabel('Отмена')
                            .setStyle(ButtonStyle.Danger)
                    )
                );
            return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }

    if (interaction.isStringSelectMenu() && id === 'logging_category_select') {
        const selectedCategory = interaction.values[0];
        const category = LOG_CATEGORIES.find(c => c.value === selectedCategory);

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**${category?.label || selectedCategory}**\n` +
                    `${category?.description || ''}\n` +
                    `Выберите канал:`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`logging_channel_${selectedCategory}`)
                        .setPlaceholder('Выберите канал')
                        .setChannelTypes(ChannelType.GuildText)
                        .setMinValues(0)
                        .setMaxValues(1)
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('logging_setup_back')
                        .setLabel('Назад')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('logging_setup_cancel')
                        .setLabel('Отмена')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (interaction.isChannelSelectMenu() && id.startsWith('logging_channel_')) {
        const logType = id.replace('logging_channel_', '');
        const category = LOG_CATEGORIES.find(c => c.value === logType);
        const selectedChannel = interaction.channels.first();
        const channelId = selectedChannel?.id || null;

        await LoggingConfig.upsert({ guildId: interaction.guild.id, [`${logType}ChannelId`]: channelId });
        await GuildConfig.upsert({ guildId: interaction.guild.id, loggingEnabled: true });

        const channelText = channelId ? `<#${channelId}>` : 'Отключено';

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**${category?.label || logType}** установлен: ${channelText}\n` +
                    `Настройте другую категорию или нажмите Готово.`
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
                        .setCustomId('logging_setup_done')
                        .setLabel('Готово')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('logging_setup_cancel')
                        .setLabel('Отмена')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    return false;
}

module.exports = { handle };
