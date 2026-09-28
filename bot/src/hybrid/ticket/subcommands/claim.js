
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
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является тикетом.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        const member = guild.members.cache.get(userId);
        if (ticket.userId !== userId && !hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'У вас нет прав брать тикеты в работу.');
        }

        if (ticket.status === 'deleted') return reply(interactionOrMessage, 'Этот тикет удалён, взять его в работу нельзя.');
        if (ticket.status === 'closed') return reply(interactionOrMessage, 'Этот тикет закрыт. Сначала переоткройте его.');

        if (ticket.claimedBy) {
            return reply(interactionOrMessage, `Этот тикет уже взял в работу <@${ticket.claimedBy}>.`);
        }

        ticket.claimedBy = userId;
        ticket.status = 'claimed';
        await ticket.save();

        logTicketEvent(guild, config, 'Тикет взят в работу', `**Тикет:** ${channel}\n**Взял:** <@${userId}>`).catch(() => {});

        return replyTitled(interactionOrMessage, '### Тикет взят в работу', `Этот тикет взял в работу <@${userId}>.`);
    }
};
