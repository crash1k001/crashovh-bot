
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { TicketConfig, Ticket } = require('../../../data/models');
const { generateAndSendTranscript, hasSupportRole } = require('../../../lib/ticketUtils');

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

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);

        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config))
            return reply(interactionOrMessage, 'Только сотрудники поддержки могут использовать эту команду.');

        try {
            await generateAndSendTranscript(guild, config, ticket, interactionOrMessage.client);
            return replyTitled(interactionOrMessage, '### Транскрипт отправлен', 'Транскрипт отправлен создателю тикета и в лог-канал.');
        } catch (error) {
            console.error('Transcript command error:', error);
            return reply(interactionOrMessage, 'Не удалось создать транскрипт.');
        }
    }
};
