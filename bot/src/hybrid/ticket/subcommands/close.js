
const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const { TicketConfig, Ticket } = require('../../../data/models');
const { logTicketEvent, generateAndSendTranscript, hasSupportRole } = require('../../../lib/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        if (ticket.status === 'closed') return reply(interactionOrMessage, 'Этот тикет уже закрыт.');

        const member = guild.members.cache.get(userId);
        if (ticket.userId !== userId && !hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'У вас нет прав закрывать этот тикет.');
        }

        try {
            const isSlash = interactionOrMessage.isCommand?.();
            const reason = isSlash
                ? (interactionOrMessage.options.getString('reason') || 'Причина не указана')
                : (args.join(' ') || 'Причина не указана');

            ticket.status = 'closed';
            ticket.closedAt = new Date();
            await ticket.save();

            await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false });

            generateAndSendTranscript(guild, config, ticket, interactionOrMessage.client).catch(() => {});

            const closedContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Тикет закрыт'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Переоткрыть').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Удалить').setStyle(ButtonStyle.Danger)
                ));

            const sendOpts = { components: [closedContainer], flags: MessageFlags.IsComponentsV2 };
            if (interactionOrMessage.deferred) await interactionOrMessage.editReply(sendOpts);
            else await interactionOrMessage.reply(sendOpts);

            logTicketEvent(guild, config, 'Тикет закрыт', `**Тикет:** ${channel}\n**Закрыл:** <@${userId}>\n**Причина:** ${reason}`).catch(() => {});
        } catch (error) {
            console.error('Ticket close error:', error);
            return reply(interactionOrMessage, 'Не удалось закрыть тикет. Попробуйте ещё раз.');
        }
    }
};
