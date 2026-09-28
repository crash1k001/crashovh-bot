
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const { enableAiChannel, isAiChannel } = require('../../../data/aiChannel');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const channel = interactionOrMessage.channel;
            const member = interactionOrMessage.member;
            const user = isSlashCommand ? interactionOrMessage.user : interactionOrMessage.author;

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

            if (await isAiChannel(guild.id, channel.id)) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Уже включено')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('AI уже включён в этом канале.')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await enableAiChannel(guild.id, channel.id, user.id);

            
            try {
                const { GuildConfig } = require('../../../data/models');
                const [guildConfig] = await GuildConfig.findOrCreate({
                    where: { guildId: guild.id },
                    defaults: { guildId: guild.id }
                });
                if (!Array.isArray(guildConfig.aiChannelIds)) {
                    guildConfig.aiChannelIds = [];
                }
                if (!guildConfig.aiChannelIds.includes(channel.id)) {
                    guildConfig.aiChannelIds.push(channel.id);
                    await guildConfig.save();
                }
            } catch (err) {
                console.error('[AI_ENABLE] Error syncing with GuildConfig:', err.message);
            }

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### AI включён в канале')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Теперь я буду отвечать на каждое сообщение здесь.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error enabling AI channel:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Ошибка')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Не удалось включить AI в канале.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }
    }
};
