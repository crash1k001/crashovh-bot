
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const { WelcomeConfig } = require('../../../data/models');

module.exports = {
    name: 'config',
    description: 'Показать настройки приветствия',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        
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

        try {
            const config = await WelcomeConfig.findOne({ where: { guildId: guild.id } });
            
            if (!config) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Настройки приветствия')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Настройки приветствия не найдены.\nИспользуйте `welcome setup`, чтобы настроить приветственные сообщения.')
                    );
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const channelDisplay = config.channelId ? `<#${config.channelId}>` : '`Не задан`';
            const typeDisplay = config.type === 'container' ? 'Контейнер' : 'Простой';

            if (config.type === 'simple') {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Настройки приветствия')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Тип:** ${typeDisplay}\n` +
                            `**Канал:** ${channelDisplay}\n` +
                            `**Сообщение:**\n${config.message || '`Не задано`'}`
                        )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Используйте `welcome setup` для изменения • `welcome reset` для сброса')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                const container = new ContainerBuilder();

                if (config.color) {
                    container.setAccentColor(config.color);
                }

                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${config.title || 'Приветствие'}`)
                );

                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );

                const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

                if (isValidUrl(config.thumbnailUrl)) {
                    const section = new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(config.description || 'Описание не задано.')
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(config.thumbnailUrl)
                        );
                    container.addSectionComponents(section);
                } else {
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(config.description || 'Описание не задано.')
                    );
                }

                if (isValidUrl(config.imageUrl)) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    );
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(config.imageUrl)
                        )
                    );
                }

                const infoContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Настройки приветствия')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Тип:** ${typeDisplay}\n` +
                            `**Канал:** ${channelDisplay}\n\n` +
                            `**Предпросмотр показан выше**`
                        )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Используйте `welcome setup` для изменения • `welcome reset` для сброса')
                    );

                return interactionOrMessage.reply({
                    components: [container, infoContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

        } catch (error) {
            console.error('Ошибка настроек приветствия:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Произошла ошибка при получении настроек приветствия.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }
    }
};
