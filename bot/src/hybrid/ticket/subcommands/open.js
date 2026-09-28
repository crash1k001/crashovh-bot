
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
        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        if (ticket.status !== 'closed') return reply(interactionOrMessage, `Этот тикет уже в статусе: ${ticket.status}.`);

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'Только сотрудники поддержки могут переоткрывать тикеты.');
        }

        try {
            const newStatus = ticket.claimedBy ? 'claimed' : 'open';
            ticket.status = newStatus;
            ticket.closedAt = null;
            await ticket.save();

            await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true });

            const statusText = newStatus === 'claimed' ? `В работе у <@${ticket.claimedBy}>` : 'Открыт';
            return replyTitled(interactionOrMessage, '### Тикет переоткрыт', `Этот тикет переоткрыл <@${userId}>.\n<@${ticket.userId}> Вы можете продолжить общение.\n**Статус:** ${statusText}`);
        } catch (error) {
            console.error('Ticket reopen error:', error);
            return reply(interactionOrMessage, 'Не удалось переоткрыть тикет. Попробуйте ещё раз.');
        }
    }
};
