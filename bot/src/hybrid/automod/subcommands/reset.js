
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
const { AutomodConfig, AutomodWhitelist } = require('../../../data/models');

module.exports = {
    name: 'reset',
    description: 'Сбросить автомодерацию к настройкам по умолчанию',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право **Управление сервером**, чтобы сбросить автомодерацию.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Автомодерация ещё не настроена.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await config.update({
            enabled: false,
            logChannelId: null,
            antiSpam: false,
            antiLink: false,
            antiInvite: false,
            antiBadWords: false,
            antiMassMention: false,
            antiCaps: false,
            antiPing: false,
            antiSpamPunishment: 'delete',
            antiLinkPunishment: 'delete',
            antiInvitePunishment: 'delete',
            antiBadWordsPunishment: 'delete',
            antiMassMentionPunishment: 'delete',
            antiCapsPunishment: 'delete',
            antiPingPunishment: 'delete'
        });

        await AutomodWhitelist.destroy({ where: { guildId: guild.id } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Автомодерация сброшена')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    'Автомодерация сброшена к настройкам по умолчанию и **отключена**.\n\n' +
                    'Все записи из списка исключений удалены.\n\n' +
                    'Используйте `/automod setup`, чтобы настроить заново.'
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
