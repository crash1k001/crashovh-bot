
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
const { AntinukeConfig, AntinukeWhitelist } = require('../../../data/models');

module.exports = {
    name: 'reset',
    description: 'Сбросить антинюк к настройкам по умолчанию',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Только **Владелец сервера** может сбросить антинюк.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Антинюк ещё не настроен.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await config.update({
            enabled: false,
            logChannelId: null,
            punishment: 'stripall',
            threshold: 3,
            timeframe: 60,
            antiBan: true,
            antiKick: true,
            antiChannelCreate: true,
            antiChannelDelete: true,
            antiChannelEdit: false,
            antiRoleCreate: true,
            antiRoleDelete: true,
            antiRoleUpdate: true,
            antiWebhook: true,
            antiBot: true,
            antiGuildUpdate: false,
            antiEmoji: false
        });

        await AntinukeWhitelist.destroy({ where: { guildId: guild.id } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Антинюк сброшен')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    'Антинюк сброшен к настройкам по умолчанию и **отключён**.\n\n' +
                    'Все доверенные пользователи удалены из списка.\n\n' +
                    'Используйте `/antinuke setup`, чтобы настроить заново.'
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
