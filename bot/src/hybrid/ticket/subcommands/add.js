
const { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { TicketConfig, Ticket } = require('../../../data/models');
const { logTicketEvent, hasSupportRole } = require('../../../lib/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

function replyTitled(ctx, title, body) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const isSlash = interactionOrMessage.isCommand?.();

        let targetUserId;
        if (isSlash) {
            const u = interactionOrMessage.options.getUser('user');
            targetUserId = u?.id;
        } else {
            if (!args[0]) return reply(interactionOrMessage, 'Укажите пользователя для добавления.\n**Использование:** `ticket add <пользователь>`');
            targetUserId = args[0].replace(/[<@!>]/g, '');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        const member = guild.members.cache.get(userId);
        const canManage = ticket.userId === userId || ticket.claimedBy === userId || hasSupportRole(member, config);
        if (!canManage) return reply(interactionOrMessage, 'У вас нет прав добавлять пользователей в этот тикет.');

        try {
            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) return reply(interactionOrMessage, 'Указанный пользователь не найден на сервере.');

            const existingPerms = channel.permissionsFor(targetMember);
            if (existingPerms?.has(PermissionsBitField.Flags.ViewChannel)) {
                return reply(interactionOrMessage, `У ${targetMember.user.tag} уже есть доступ к этому тикету.`);
            }

            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true
            });

            logTicketEvent(guild, config, 'Пользователь добавлен в тикет', `**Тикет:** ${channel}\n**Добавлен:** <@${targetMember.id}>\n**Добавил:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### Пользователь добавлен', `${targetMember.user} добавлен в этот тикет пользователем <@${userId}>.`);
        } catch (error) {
            console.error('Ticket add user error:', error);
            return reply(interactionOrMessage, 'Не удалось добавить пользователя. Проверьте права и попробуйте ещё раз.');
        }
    }
};
