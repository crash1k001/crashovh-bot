
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    AuditLogEvent
} = require('discord.js');
const { getLogChannel, fetchAuditLogEntry: fetchAuditLogExecutor } = require('./loggingUtils');

module.exports = {
    name: 'userEvents',

    async init(client) {
        client.on('userUpdate', async (oldUser, newUser) => {
            const guilds = client.guilds.cache.filter(g => g.members.cache.has(newUser.id));

            for (const [guildId, guild] of guilds) {
                const logChannel = await getLogChannel(client, guildId, 'memberLogs', 'user');
                if (!logChannel) continue;

                const changes = [];
                const avatarChanged = oldUser.avatar !== newUser.avatar;

                if (oldUser.username !== newUser.username) {
                    changes.push(`**Имя пользователя:** ${oldUser.username} → ${newUser.username}`);
                }
                if (oldUser.displayName !== newUser.displayName) {
                    changes.push(`**Отображаемое имя:** ${oldUser.displayName || 'Нет'} → ${newUser.displayName || 'Нет'}`);
                }
                if (avatarChanged) {
                    changes.push(`**Аватар:** обновлён`);
                }

                if (changes.length === 0) continue;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Пользователь обновлён')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `**Пользователь:** <@${newUser.id}>, **ID:** \`${newUser.id}\`\n` +
                                    `${changes.join('\n')}\n` +
                                    `**Сервер:** \`${guild.name}\`\n` +
                                    `**ID:** \`${guild.id}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(newUser.displayAvatarURL({ dynamic: true, size: 256 }))
                            )
                    );

                if (avatarChanged) {
                    const newAvatarURL = newUser.displayAvatarURL({ dynamic: true, size: 512 });

                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder()
                            .addItems(
                                new MediaGalleryItemBuilder().setURL(newAvatarURL).setDescription('Новый аватар')
                            )
                    );
                }

                logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
            }
        });

        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const logChannel = await getLogChannel(client, newMember.guild.id, 'memberLogs', 'user');
            if (!logChannel) return;

            const changes = [];
            let executorText = '';

            const nicknameChanged = oldMember.nickname !== newMember.nickname;
            const oldRoles = oldMember.roles.cache;
            const newRoles = newMember.roles.cache;
            const addedRoles = newRoles.filter(r => !oldRoles.has(r.id) && r.id !== newMember.guild.id);
            const removedRoles = oldRoles.filter(r => !newRoles.has(r.id) && r.id !== newMember.guild.id);
            const rolesChanged = addedRoles.size > 0 || removedRoles.size > 0;
            const timeoutChanged = oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil;
            const pendingChanged = oldMember.pending !== newMember.pending && !newMember.pending;

            const NONE = Promise.resolve({ executor: null, reason: null });
            const [nickResult, roleResult, timeoutResult] = await Promise.all([
                nicknameChanged ? fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id) : NONE,
                rolesChanged ? fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id) : NONE,
                timeoutChanged ? fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id) : NONE
            ]);

            if (nicknameChanged) {
                changes.push(`**Никнейм:** ${oldMember.nickname || 'Нет'} → ${newMember.nickname || 'Нет'}`);
                if (nickResult.executor) executorText = `**Изменил:** <@${nickResult.executor.id}>\n`;
            }

            if (rolesChanged) {
                if (addedRoles.size > 0) changes.push(`**Роли добавлены:** ${addedRoles.map(r => r.name).join(', ')}`);
                if (removedRoles.size > 0) changes.push(`**Роли убраны:** ${removedRoles.map(r => r.name).join(', ')}`);
                if (roleResult.executor) executorText = `**Изменил:** <@${roleResult.executor.id}>\n`;
            }

            if (timeoutChanged) {
                if (newMember.communicationDisabledUntil) {
                    changes.push(`**Тайм-аут:** до <t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`);
                    if (timeoutResult.reason) changes.push(`**Причина:** ${timeoutResult.reason}`);
                    if (timeoutResult.executor) executorText = `**Выдал тайм-аут:** <@${timeoutResult.executor.id}>\n`;
                } else {
                    changes.push(`**Тайм-аут:** снят`);
                    if (timeoutResult.executor) executorText = `**Снял:** <@${timeoutResult.executor.id}>\n`;
                }
            }

            if (pendingChanged) {
                changes.push(`**Верификация:** пройден отбор участников`);
            }

            if (changes.length === 0) return;

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Участник обновлён')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Пользователь:** <@${newMember.id}>, **ID:** \`${newMember.id}\`\n` +
                                executorText +
                                `${changes.join('\n')}\n` +
                                `**Сервер:** \`${newMember.guild.name}\`\n` +
                                `**ID:** \`${newMember.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(newMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildMemberAdd', async (member) => {
            const logChannel = await getLogChannel(client, member.guild.id, 'memberLogs', 'user');
            if (!logChannel) return;

            const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Участник вступил')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Пользователь:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                `**Аккаунт создан:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                                `**Возраст аккаунта:** \`${accountAge} дн.\`\n` +
                                `**Сервер:** \`${member.guild.name}\`\n` +
                                `**ID:** \`${member.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildBanAdd', async (ban) => {
            const logChannel = await getLogChannel(client, ban.guild.id, 'moderationLogs', 'user');
            if (!logChannel) return;

            const { executor, reason } = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
            const executorText = executor ? `**Забанил:** <@${executor.id}>\n` : '';
            const banReason = reason || ban.reason || 'Причина не указана';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Участник забанен')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Пользователь:** <@${ban.user.id}>, **ID:** \`${ban.user.id}\`\n` +
                                executorText +
                                `**Причина:** ${banReason}\n` +
                                `**Сервер:** \`${ban.guild.name}\`\n` +
                                `**ID:** \`${ban.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildBanRemove', async (ban) => {
            const logChannel = await getLogChannel(client, ban.guild.id, 'moderationLogs', 'user');
            if (!logChannel) return;

            const { executor, reason } = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
            const executorText = executor ? `**Разбанил:** <@${executor.id}>\n` : '';
            const unbanReason = reason ? `**Причина:** ${reason}\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Участник разбанен')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Пользователь:** <@${ban.user.id}>, **ID:** \`${ban.user.id}\`\n` +
                                executorText +
                                unbanReason +
                                `**Сервер:** \`${ban.guild.name}\`\n` +
                                `**ID:** \`${ban.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildMemberRemove', async (member) => {
            const { executor: kickExecutor, reason: kickReason } = await fetchAuditLogExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
            const isKick = kickExecutor !== null;

            const logChannel = await getLogChannel(client, member.guild.id, isKick ? 'moderationLogs' : 'memberLogs', 'user');
            if (!logChannel) return;

            const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name);

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(isKick ? '### Участник кикнут' : '### Участник вышел')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Пользователь:** <@${member.id}>, **ID:** \`${member.id}\`\n` +
                                (isKick ? `**Кикнул:** <@${kickExecutor.id}>\n` : '') +
                                (isKick && kickReason ? `**Причина:** ${kickReason}\n` : '') +
                                `**Вступил:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` +
                                `**Роли:** ${roles.length > 0 ? roles.slice(0, 10).join(', ') + (roles.length > 10 ? ` +ещё ${roles.length - 10}` : '') : 'Нет'}\n` +
                                `**Сервер:** \`${member.guild.name}\`\n` +
                                `**ID:** \`${member.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });
    }
};
