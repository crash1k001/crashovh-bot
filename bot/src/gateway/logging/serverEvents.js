
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    AuditLogEvent,
    PermissionFlagsBits
} = require('discord.js');
const { getLogChannel, fetchAuditLogExecutor } = require('./loggingUtils');

async function fetchOverwriteExecutor(guild, channelId, timeWindow = 10000) {
    try {
        const now = Date.now();
        const [updateLogs, createLogs, deleteLogs] = await Promise.all([
            guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteUpdate, limit: 10 }),
            guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteCreate, limit: 10 }),
            guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteDelete, limit: 10 })
        ]);

        const findEntry = (logs) => logs.entries.find(e =>
            (e.extra?.channel?.id === channelId || e.extra?.id === channelId) &&
            (now - e.createdTimestamp) < timeWindow
        );

        return findEntry(updateLogs)?.executor
            || findEntry(createLogs)?.executor
            || findEntry(deleteLogs)?.executor
            || null;
    } catch (error) {
        return null;
    }
}

const PERMISSION_NAMES = {
    [PermissionFlagsBits.CreateInstantInvite]: 'Создание приглашений',
    [PermissionFlagsBits.KickMembers]: 'Кик участников',
    [PermissionFlagsBits.BanMembers]: 'Бан участников',
    [PermissionFlagsBits.Administrator]: 'Администратор',
    [PermissionFlagsBits.ManageChannels]: 'Управление каналами',
    [PermissionFlagsBits.ManageGuild]: 'Управление сервером',
    [PermissionFlagsBits.AddReactions]: 'Добавление реакций',
    [PermissionFlagsBits.ViewAuditLog]: 'Просмотр журнала аудита',
    [PermissionFlagsBits.PrioritySpeaker]: 'Приоритетный голос',
    [PermissionFlagsBits.Stream]: 'Видео',
    [PermissionFlagsBits.ViewChannel]: 'Просмотр канала',
    [PermissionFlagsBits.SendMessages]: 'Отправка сообщений',
    [PermissionFlagsBits.SendTTSMessages]: 'Отправка TTS-сообщений',
    [PermissionFlagsBits.ManageMessages]: 'Управление сообщениями',
    [PermissionFlagsBits.EmbedLinks]: 'Встраивание ссылок',
    [PermissionFlagsBits.AttachFiles]: 'Прикрепление файлов',
    [PermissionFlagsBits.ReadMessageHistory]: 'Просмотр истории сообщений',
    [PermissionFlagsBits.MentionEveryone]: 'Упоминание всех',
    [PermissionFlagsBits.UseExternalEmojis]: 'Использование внешних эмодзи',
    [PermissionFlagsBits.ViewGuildInsights]: 'Просмотр статистики сервера',
    [PermissionFlagsBits.Connect]: 'Подключение',
    [PermissionFlagsBits.Speak]: 'Голос',
    [PermissionFlagsBits.MuteMembers]: 'Мьют участников',
    [PermissionFlagsBits.DeafenMembers]: 'Глушение участников',
    [PermissionFlagsBits.MoveMembers]: 'Перемещение участников',
    [PermissionFlagsBits.UseVAD]: 'Голосовая активация',
    [PermissionFlagsBits.ChangeNickname]: 'Изменение никнейма',
    [PermissionFlagsBits.ManageNicknames]: 'Управление никнеймами',
    [PermissionFlagsBits.ManageRoles]: 'Управление ролями',
    [PermissionFlagsBits.ManageWebhooks]: 'Управление вебхуками',
    [PermissionFlagsBits.ManageGuildExpressions]: 'Управление выражениями',
    [PermissionFlagsBits.UseApplicationCommands]: 'Использование команд приложений',
    [PermissionFlagsBits.RequestToSpeak]: 'Запрос слова',
    [PermissionFlagsBits.ManageEvents]: 'Управление событиями',
    [PermissionFlagsBits.ManageThreads]: 'Управление ветками',
    [PermissionFlagsBits.CreatePublicThreads]: 'Создание публичных веток',
    [PermissionFlagsBits.CreatePrivateThreads]: 'Создание приватных веток',
    [PermissionFlagsBits.UseExternalStickers]: 'Использование внешних стикеров',
    [PermissionFlagsBits.SendMessagesInThreads]: 'Сообщения в ветках',
    [PermissionFlagsBits.UseEmbeddedActivities]: 'Использование активностей',
    [PermissionFlagsBits.ModerateMembers]: 'Тайм-аут участников',
    [PermissionFlagsBits.ViewCreatorMonetizationAnalytics]: 'Просмотр аналитики монетизации',
    [PermissionFlagsBits.UseSoundboard]: 'Использование саундборда',
    [PermissionFlagsBits.UseExternalSounds]: 'Использование внешних звуков',
    [PermissionFlagsBits.SendVoiceMessages]: 'Отправка голосовых сообщений',
    [PermissionFlagsBits.SendPolls]: 'Отправка опросов'
};

function getPermissionDifferences(oldPerms, newPerms) {
    const oldBits = BigInt(oldPerms?.bitfield || 0n);
    const newBits = BigInt(newPerms?.bitfield || 0n);

    const added = [];
    const removed = [];

    for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
        const bitValue = BigInt(bit);
        const hadPerm = (oldBits & bitValue) === bitValue;
        const hasPerm = (newBits & bitValue) === bitValue;

        if (!hadPerm && hasPerm) added.push(name);
        if (hadPerm && !hasPerm) removed.push(name);
    }

    return { added, removed };
}

function getOverwriteChanges(oldOverwrites, newOverwrites, guild) {
    const changes = [];
    const oldMap = new Map(oldOverwrites?.map(o => [o.id, o]) || []);
    const newMap = new Map(newOverwrites?.map(o => [o.id, o]) || []);

    for (const [id, newOverwrite] of newMap) {
        const oldOverwrite = oldMap.get(id);
        const target = guild.roles.cache.get(id) || guild.members.cache.get(id);
        const targetName = target?.name || target?.user?.username || `Неизвестно (${id})`;
        const targetType = guild.roles.cache.has(id) ? 'Роль' : 'Участник';

        if (!oldOverwrite) {
            const allowPerms = [];
            const denyPerms = [];
            for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
                const bitValue = BigInt(bit);
                if ((BigInt(newOverwrite.allow || 0n) & bitValue) === bitValue) allowPerms.push(name);
                if ((BigInt(newOverwrite.deny || 0n) & bitValue) === bitValue) denyPerms.push(name);
            }
            let permText = '';
            if (allowPerms.length > 0) permText += `\n  - Разрешено: ${allowPerms.join(', ')}`;
            if (denyPerms.length > 0) permText += `\n  - Запрещено: ${denyPerms.join(', ')}`;
            if (permText) changes.push(`**${targetType} добавлен(а):** ${targetName}${permText}`);
        } else {
            const oldAllow = BigInt(oldOverwrite.allow || 0n);
            const newAllow = BigInt(newOverwrite.allow || 0n);
            const oldDeny = BigInt(oldOverwrite.deny || 0n);
            const newDeny = BigInt(newOverwrite.deny || 0n);

            if (oldAllow !== newAllow || oldDeny !== newDeny) {
                const addedAllow = [];
                const removedAllow = [];
                const addedDeny = [];
                const removedDeny = [];
                const neutral = [];

                for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
                    const bitValue = BigInt(bit);
                    const wasAllowed = (oldAllow & bitValue) === bitValue;
                    const isAllowed = (newAllow & bitValue) === bitValue;
                    const wasDenied = (oldDeny & bitValue) === bitValue;
                    const isDenied = (newDeny & bitValue) === bitValue;

                    if (!wasAllowed && isAllowed) addedAllow.push(name);
                    if (wasAllowed && !isAllowed && !isDenied) neutral.push(name);
                    if (!wasDenied && isDenied) addedDeny.push(name);
                    if (wasDenied && !isDenied && !isAllowed) neutral.push(name);
                }

                let permText = '';
                if (addedAllow.length > 0) permText += `\n  - Теперь разрешено: ${addedAllow.join(', ')}`;
                if (addedDeny.length > 0) permText += `\n  - Теперь запрещено: ${addedDeny.join(', ')}`;
                if (neutral.length > 0) permText += `\n  - Установлено нейтрально: ${neutral.join(', ')}`;
                if (permText) changes.push(`**${targetType} изменён(а):** ${targetName}${permText}`);
            }
        }
    }

    for (const [id, oldOverwrite] of oldMap) {
        if (!newMap.has(id)) {
            const target = guild.roles.cache.get(id) || guild.members.cache.get(id);
            const targetName = target?.name || target?.user?.username || `Неизвестно (${id})`;
            const targetType = guild.roles.cache.has(id) ? 'Роль' : 'Участник';
            changes.push(`**${targetType} Removed:** ${targetName} (all overwrites cleared)`);
        }
    }

    return changes;
}

module.exports = {
    name: 'serverEvents',

    async init(client) {
        client.on('channelCreate', async (channel) => {
            if (!channel.guild) return;
            const logChannel = await getLogChannel(client, channel.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
            const executorText = executor ? `**Создал:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Канал создан')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Канал:** ${channel.name}\n` +
                        `**Тип:** \`${channel.type === 0 ? 'Текстовый' : channel.type === 2 ? 'Голосовой' : channel.type === 4 ? 'Категория' : 'Другой'}\`\n` +
                        `**ID:** \`${channel.id}\`\n` +
                        executorText +
                        `**Сервер:** \`${channel.guild.name}\`\n` +
                        `**ID сервера:** \`${channel.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('channelDelete', async (channel) => {
            if (!channel.guild) return;
            const logChannel = await getLogChannel(client, channel.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
            const executorText = executor ? `**Удалил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Канал удалён')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Канал:** ${channel.name}\n` +
                        `**Тип:** \`${channel.type === 0 ? 'Текстовый' : channel.type === 2 ? 'Голосовой' : channel.type === 4 ? 'Категория' : 'Другой'}\`\n` +
                        `**ID:** \`${channel.id}\`\n` +
                        executorText +
                        `**Сервер:** \`${channel.guild.name}\`\n` +
                        `**ID сервера:** \`${channel.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('channelUpdate', async (oldChannel, newChannel) => {
            if (!newChannel.guild) return;
            const logChannel = await getLogChannel(client, newChannel.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const changes = [];
            if (oldChannel.name !== newChannel.name) {
                changes.push(`**Название:** ${oldChannel.name} → ${newChannel.name}`);
            }
            if ((oldChannel.topic || '') !== (newChannel.topic || '')) {
                changes.push(`**Тема:** ${oldChannel.topic || 'Нет'} → ${newChannel.topic || 'Нет'}`);
            }
            if (oldChannel.nsfw !== newChannel.nsfw) {
                changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
            }
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                changes.push(`**Медленный режим:** ${oldChannel.rateLimitPerUser}с → ${newChannel.rateLimitPerUser}с`);
            }
            if (oldChannel.bitrate !== newChannel.bitrate) {
                changes.push(`**Битрейт:** ${oldChannel.bitrate / 1000}кбит/с → ${newChannel.bitrate / 1000}кбит/с`);
            }
            if (oldChannel.userLimit !== newChannel.userLimit) {
                changes.push(`**Лимит участников:** ${oldChannel.userLimit || 'Без лимита'} → ${newChannel.userLimit || 'Без лимита'}`);
            }
            if (oldChannel.parentId !== newChannel.parentId) {
                const oldParent = oldChannel.parent?.name || 'Нет';
                const newParent = newChannel.parent?.name || 'Нет';
                changes.push(`**Категория:** ${oldParent} → ${newParent}`);
            }
            if (oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration) {
                const formatDuration = (d) => d ? (d >= 1440 ? `${d / 1440} дн.` : `${d / 60} ч.`) : 'По умолчанию';
                changes.push(`**Время автоархивации:** ${formatDuration(oldChannel.defaultAutoArchiveDuration)} → ${formatDuration(newChannel.defaultAutoArchiveDuration)}`);
            }
            if (oldChannel.defaultThreadRateLimitPerUser !== newChannel.defaultThreadRateLimitPerUser) {
                changes.push(`**Медленный режим веток:** ${oldChannel.defaultThreadRateLimitPerUser || 0}с → ${newChannel.defaultThreadRateLimitPerUser || 0}с`);
            }
            if (oldChannel.rtcRegion !== newChannel.rtcRegion) {
                changes.push(`**Голосовой регион:** ${oldChannel.rtcRegion || 'Автоматически'} → ${newChannel.rtcRegion || 'Автоматически'}`);
            }
            if (oldChannel.videoQualityMode !== newChannel.videoQualityMode) {
                const quality = { 1: 'Авто', 2: 'Высокое' };
                changes.push(`**Качество видео:** ${quality[oldChannel.videoQualityMode] || 'Авто'} → ${quality[newChannel.videoQualityMode] || 'Авто'}`);
            }

            const oldOverwrites = oldChannel.permissionOverwrites?.cache?.map(o => ({
                id: o.id,
                allow: o.allow.bitfield,
                deny: o.deny.bitfield
            })) || [];
            const newOverwrites = newChannel.permissionOverwrites?.cache?.map(o => ({
                id: o.id,
                allow: o.allow.bitfield,
                deny: o.deny.bitfield
            })) || [];

            const overwriteChanges = getOverwriteChanges(oldOverwrites, newOverwrites, newChannel.guild);
            if (overwriteChanges.length > 0) {
                changes.push(`\n**Переопределения прав:**`);
                changes.push(...overwriteChanges);
            }

            if (changes.length === 0) return;

            let executor = await fetchAuditLogExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
            if (!executor && overwriteChanges.length > 0) {
                executor = await fetchOverwriteExecutor(newChannel.guild, newChannel.id);
            }
            const executorText = executor ? `**Изменил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Канал изменён')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Канал:** <#${newChannel.id}>\n` +
                        `**ID:** \`${newChannel.id}\`\n` +
                        executorText +
                        `**Сервер:** \`${newChannel.guild.name}\`\n` +
                        `**ID сервера:** \`${newChannel.guild.id}\`\n\n` +
                        `**Изменения:**\n${changes.join('\n')}`
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('roleCreate', async (role) => {
            const logChannel = await getLogChannel(client, role.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
            const executorText = executor ? `**Создал:** <@${executor.id}>\n` : '';

            const permissions = [];
            for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
                const bitValue = BigInt(bit);
                if ((BigInt(role.permissions.bitfield) & bitValue) === bitValue) {
                    permissions.push(name);
                }
            }
            const permText = permissions.length > 0 ? `**Права:** ${permissions.slice(0, 10).join(', ')}${permissions.length > 10 ? ` +ещё ${permissions.length - 10}` : ''}` : '**Права:** Нет';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Роль создана')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Роль:** ${role.name}\n` +
                        `**Цвет:** \`${role.hexColor}\`\n` +
                        `**ID:** \`${role.id}\`\n` +
                        `**Отдельный список:** \`${role.hoist}\`\n` +
                        `**Упоминаемая:** \`${role.mentionable}\`\n` +
                        executorText +
                        `${permText}\n` +
                        `**Сервер:** \`${role.guild.name}\`\n` +
                        `**ID сервера:** \`${role.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('roleDelete', async (role) => {
            const logChannel = await getLogChannel(client, role.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
            const executorText = executor ? `**Удалил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Роль удалена')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Роль:** ${role.name}\n` +
                        `**Цвет:** \`${role.hexColor}\`\n` +
                        `**ID:** \`${role.id}\`\n` +
                        executorText +
                        `**Сервер:** \`${role.guild.name}\`\n` +
                        `**ID сервера:** \`${role.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('roleUpdate', async (oldRole, newRole) => {
            const logChannel = await getLogChannel(client, newRole.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const changes = [];
            if (oldRole.name !== newRole.name) {
                changes.push(`**Название:** ${oldRole.name} → ${newRole.name}`);
            }
            if (oldRole.hexColor !== newRole.hexColor) {
                changes.push(`**Цвет:** ${oldRole.hexColor} → ${newRole.hexColor}`);
            }
            if (oldRole.hoist !== newRole.hoist) {
                changes.push(`**Отдельный список:** ${oldRole.hoist} → ${newRole.hoist}`);
            }
            if (oldRole.mentionable !== newRole.mentionable) {
                changes.push(`**Упоминаемая:** ${oldRole.mentionable} → ${newRole.mentionable}`);
            }
            if (oldRole.icon !== newRole.icon) {
                changes.push(`**Иконка:** обновлена`);
            }
            if (oldRole.unicodeEmoji !== newRole.unicodeEmoji) {
                changes.push(`**Эмодзи:** ${oldRole.unicodeEmoji || 'Нет'} → ${newRole.unicodeEmoji || 'Нет'}`);
            }
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                const { added, removed } = getPermissionDifferences(oldRole.permissions, newRole.permissions);
                if (added.length > 0) {
                    changes.push(`**Права добавлены:** ${added.join(', ')}`);
                }
                if (removed.length > 0) {
                    changes.push(`**Права убраны:** ${removed.join(', ')}`);
                }
            }

            if (changes.length === 0) return;

            const executor = await fetchAuditLogExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
            const executorText = executor ? `**Изменил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Роль изменена')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Роль:** ${newRole.name}\n` +
                        `**ID:** \`${newRole.id}\`\n` +
                        executorText +
                        `**Сервер:** \`${newRole.guild.name}\`\n` +
                        `**ID сервера:** \`${newRole.guild.id}\`\n\n` +
                        `**Изменения:**\n${changes.join('\n')}`
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildUpdate', async (oldGuild, newGuild) => {
            const logChannel = await getLogChannel(client, newGuild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const changes = [];
            if (oldGuild.name !== newGuild.name) {
                changes.push(`**Название:** ${oldGuild.name} → ${newGuild.name}`);
            }
            if (oldGuild.icon !== newGuild.icon) {
                changes.push(`**Иконка:** обновлена`);
            }
            if (oldGuild.banner !== newGuild.banner) {
                changes.push(`**Баннер:** обновлён`);
            }
            if (oldGuild.splash !== newGuild.splash) {
                changes.push(`**Заставка:** обновлена`);
            }
            if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                const levels = ['Отсутствует', 'Низкий', 'Средний', 'Высокий', 'Очень высокий'];
                changes.push(`**Уровень верификации:** ${levels[oldGuild.verificationLevel]} → ${levels[newGuild.verificationLevel]}`);
            }
            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                const filters = ['Отключён', 'Участники без ролей', 'Все участники'];
                changes.push(`**Фильтр контента:** ${filters[oldGuild.explicitContentFilter]} → ${filters[newGuild.explicitContentFilter]}`);
            }
            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
                const notifs = ['Все сообщения', 'Только упоминания'];
                changes.push(`**Уведомления по умолчанию:** ${notifs[oldGuild.defaultMessageNotifications]} → ${notifs[newGuild.defaultMessageNotifications]}`);
            }
            if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
                const oldAfk = oldGuild.afkChannel?.name || 'Нет';
                const newAfk = newGuild.afkChannel?.name || 'Нет';
                changes.push(`**AFK-канал:** ${oldAfk} → ${newAfk}`);
            }
            if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
                changes.push(`**AFK тайм-аут:** ${oldGuild.afkTimeout / 60}мин → ${newGuild.afkTimeout / 60}мин`);
            }
            if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
                const oldSys = oldGuild.systemChannel?.name || 'Нет';
                const newSys = newGuild.systemChannel?.name || 'Нет';
                changes.push(`**Системный канал:** ${oldSys} → ${newSys}`);
            }
            if (oldGuild.rulesChannelId !== newGuild.rulesChannelId) {
                const oldRules = oldGuild.rulesChannel?.name || 'Нет';
                const newRules = newGuild.rulesChannel?.name || 'Нет';
                changes.push(`**Канал правил:** ${oldRules} → ${newRules}`);
            }
            if (oldGuild.description !== newGuild.description) {
                changes.push(`**Описание:** ${oldGuild.description || 'Нет'} → ${newGuild.description || 'Нет'}`);
            }
            if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
                changes.push(`**Vanity-ссылка:** ${oldGuild.vanityURLCode || 'Нет'} → ${newGuild.vanityURLCode || 'Нет'}`);
            }
            if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
                changes.push(`**Шкала прогресса бустов:** ${oldGuild.premiumProgressBarEnabled} → ${newGuild.premiumProgressBarEnabled}`);
            }

            if (changes.length === 0) return;

            const executor = await fetchAuditLogExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
            const executorText = executor ? `**Изменил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Сервер изменён')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Сервер:** \`${newGuild.name}\`\n` +
                        `**ID:** \`${newGuild.id}\`\n` +
                        executorText + `\n` +
                        `**Изменения:**\n${changes.join('\n')}`
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('emojiCreate', async (emoji) => {
            const logChannel = await getLogChannel(client, emoji.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
            const executorText = executor ? `**Создал:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Эмодзи создано')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Эмодзи:** ${emoji} \`${emoji.name}\`\n` +
                        `**ID:** \`${emoji.id}\`\n` +
                        `**Анимировано:** \`${emoji.animated}\`\n` +
                        executorText +
                        `**Сервер:** \`${emoji.guild.name}\`\n` +
                        `**ID сервера:** \`${emoji.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('emojiDelete', async (emoji) => {
            const logChannel = await getLogChannel(client, emoji.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
            const executorText = executor ? `**Удалил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Эмодзи удалено')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Эмодзи:** \`${emoji.name}\`\n` +
                        `**ID:** \`${emoji.id}\`\n` +
                        `**Анимировано:** \`${emoji.animated}\`\n` +
                        executorText +
                        `**Сервер:** \`${emoji.guild.name}\`\n` +
                        `**ID сервера:** \`${emoji.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('stickerCreate', async (sticker) => {
            const logChannel = await getLogChannel(client, sticker.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(sticker.guild, AuditLogEvent.StickerCreate, sticker.id);
            const executorText = executor ? `**Создал:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Стикер создан')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Стикер:** \`${sticker.name}\`\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        `**Описание:** ${sticker.description || 'Нет'}\n` +
                        `**Теги:** ${sticker.tags || 'Нет'}\n` +
                        executorText +
                        `**Сервер:** \`${sticker.guild.name}\`\n` +
                        `**ID сервера:** \`${sticker.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('stickerDelete', async (sticker) => {
            const logChannel = await getLogChannel(client, sticker.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(sticker.guild, AuditLogEvent.StickerDelete, sticker.id);
            const executorText = executor ? `**Удалил:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Стикер удалён')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Стикер:** \`${sticker.name}\`\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        executorText +
                        `**Сервер:** \`${sticker.guild.name}\`\n` +
                        `**ID сервера:** \`${sticker.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });
    }
};
