
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
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
            if (!args[0]) return reply(interactionOrMessage, 'Укажите сотрудника, которому передать тикет.\n**Использование:** `ticket transfer <пользователь>`');
            targetUserId = args[0].replace(/[<@!>]/g, '');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);

        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'Только сотрудники поддержки могут передавать тикеты.');
        }

        if (!ticket.claimedBy) return reply(interactionOrMessage, 'Этот тикет ещё не взят в работу. Сначала используйте `ticket claim`.');
        if (ticket.claimedBy !== userId && !member.permissions.has('Administrator')) {
            return reply(interactionOrMessage, 'Только текущий ответственный или администратор может передать этот тикет.');
        }

        if (targetUserId === ticket.claimedBy) return reply(interactionOrMessage, 'Этот тикет уже взят в работу этим пользователем.');

        try {
            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) return reply(interactionOrMessage, 'Указанный пользователь не найден на сервере.');

            if (!hasSupportRole(targetMember, config)) {
                return reply(interactionOrMessage, 'Указанный пользователь не является сотрудником поддержки.');
            }

            const previousClaimer = ticket.claimedBy;
            ticket.claimedBy = targetUserId;
            await ticket.save();

            logTicketEvent(guild, config, 'Тикет передан', `**Тикет:** ${channel}\n**От:** <@${previousClaimer}>\n**Кому:** <@${targetUserId}>\n**Передал:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### Тикет передан', `Этот тикет передан от <@${previousClaimer}> к <@${targetUserId}>.`);
        } catch (error) {
            console.error('Ticket transfer error:', error);
            return reply(interactionOrMessage, 'Не удалось передать тикет. Попробуйте ещё раз.');
        }
    }
};
