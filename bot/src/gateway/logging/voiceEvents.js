
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require('discord.js');
const { getLogChannel } = require('./loggingUtils');

module.exports = {
    name: 'voiceEvents',

    async init(client) {
        client.on('voiceStateUpdate', async (oldState, newState) => {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            const member = newState.member || oldState.member;
            if (!member) return;

            
            if (!oldState.channelId && newState.channelId) {
                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Вход в голосовой канал')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**Пользователь:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Канал:** <#${newState.channelId}>\n` +
                                    `**Сервер:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
            
            else if (oldState.channelId && !newState.channelId) {
                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Выход из голосового канала')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**Пользователь:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Канал:** <#${oldState.channelId}>\n` +
                                    `**Сервер:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
            
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Смена голосового канала')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**Пользователь:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Из:** <#${oldState.channelId}>\n` +
                                    `**В:** <#${newState.channelId}>\n` +
                                    `**Сервер:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }

            
            if (oldState.channelId === newState.channelId && oldState.channelId) {
                const changes = [];

                if (oldState.selfMute !== newState.selfMute) {
                    changes.push(`**Мьют (свой):** ${oldState.selfMute ? 'Да' : 'Нет'} → ${newState.selfMute ? 'Да' : 'Нет'}`);
                }
                if (oldState.selfDeaf !== newState.selfDeaf) {
                    changes.push(`**Глушение (своё):** ${oldState.selfDeaf ? 'Да' : 'Нет'} → ${newState.selfDeaf ? 'Да' : 'Нет'}`);
                }
                if (oldState.serverMute !== newState.serverMute) {
                    changes.push(`**Мьют (сервер):** ${oldState.serverMute ? 'Да' : 'Нет'} → ${newState.serverMute ? 'Да' : 'Нет'}`);
                }
                if (oldState.serverDeaf !== newState.serverDeaf) {
                    changes.push(`**Глушение (сервер):** ${oldState.serverDeaf ? 'Да' : 'Нет'} → ${newState.serverDeaf ? 'Да' : 'Нет'}`);
                }
                if (oldState.streaming !== newState.streaming) {
                    changes.push(`**Стрим:** ${newState.streaming ? 'начат' : 'завершён'}`);
                }
                if (oldState.selfVideo !== newState.selfVideo) {
                    changes.push(`**Камера:** ${newState.selfVideo ? 'включена' : 'выключена'}`);
                }

                if (changes.length === 0) return;

                const logChannel = await getLogChannel(client, guild.id, 'voiceLogs', 'voice');
                if (!logChannel) return;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Голосовое состояние обновлено')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**Пользователь:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                    `**Канал:** <#${newState.channelId}>\n` +
                                    `${changes.join('\n')}\n` +
                                    `**Сервер:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
        });
    }
};
