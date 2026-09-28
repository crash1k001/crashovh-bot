
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { LoggingConfig } = require('../../../data/models');

module.exports = {
    name: 'config',
    description: 'Показать настройки логирования',

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
            const config = await LoggingConfig.findOne({ where: { guildId: guild.id } });

            if (!config) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Настройки логирования')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            'Настройки логирования не найдены.\nИспользуйте logging setup, чтобы настроить каналы логов.'
                        )
                    );
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const fmt = (id) => id ? `<#${id}>` : 'Не задан';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Настройки логирования')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> **Логи сообщений:** ${fmt(config.messageLogsChannelId)}\n` +
                        `> **Логи участников:** ${fmt(config.memberLogsChannelId)}\n` +
                        `> **Логи модерации:** ${fmt(config.moderationLogsChannelId)}\n` +
                        `> **Логи сервера:** ${fmt(config.serverLogsChannelId)}\n` +
                        `> **Голосовые логи:** ${fmt(config.voiceLogsChannelId)}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Используйте logging setup для изменения • logging reset для сброса')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Logging config error:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Произошла ошибка при получении настроек логирования.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }
    }
};
