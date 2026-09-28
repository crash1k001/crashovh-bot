
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const { disableAiChannel, isAiChannel } = require('../../../data/aiChannel');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const channel = interactionOrMessage.channel;
            const member = interactionOrMessage.member;

            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Отказано в доступе')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Вам нужно право **Управление каналами**.')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            if (!await isAiChannel(guild.id, channel.id)) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Не включено')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('AI не включён в этом канале.')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            
            await disableAiChannel(guild.id, channel.id);

            
            try {
                const { GuildConfig } = require('../../../data/models');
                const guildConfig = await GuildConfig.findOne({ where: { guildId: guild.id } });
                if (guildConfig && Array.isArray(guildConfig.aiChannelIds)) {
                    guildConfig.aiChannelIds = guildConfig.aiChannelIds.filter(id => id !== channel.id);
                    await guildConfig.save();
                }
            } catch (err) {
                console.error('[AI_DISABLE] Error syncing with GuildConfig:', err.message);
            }

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### AI отключён в канале')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Больше не буду отвечать на сообщения здесь.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error disabling AI channel:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Ошибка')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Не удалось отключить AI в канале.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }
    }
};
