
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
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const isSlash = interactionOrMessage.isCommand?.();

        let targetChannel = interactionOrMessage.channel;

        if (isSlash) {
            const ch = interactionOrMessage.options.getChannel('channel');
            if (ch) targetChannel = ch;
        } else if (args[0]) {
            const channelId = args[0].replace(/[<>#]/g, '');
            const found = guild.channels.cache.get(channelId);
            if (found) targetChannel = found;
            else return reply(interactionOrMessage, 'Указанный канал не найден.');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: targetChannel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        const member = guild.members.cache.get(userId);
        const hasPermission = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            hasSupportRole(member, config);

        if (!hasPermission) return reply(interactionOrMessage, 'Только сотрудники поддержки могут удалять тикеты.');

        try {
            ticket.status = 'deleted';
            await ticket.save();

            logTicketEvent(guild, config, 'Тикет удалён', `**Тикет:** ${targetChannel.name}\n**Удалил:** <@${userId}>`).catch(() => {});

            if (targetChannel.id === interactionOrMessage.channel.id) {
                await replyTitled(interactionOrMessage, '### Тикет удалён', 'Этот канал тикета будет удалён через 5 секунд...');
                setTimeout(async () => {
                    try { await targetChannel.delete(); } catch (e) { console.error('Не удалось удалить канал тикета:', e); }
                }, 5000);
            } else {
                await targetChannel.delete();
                return replyTitled(interactionOrMessage, '### Тикет удалён', `Канал тикета **${targetChannel.name}** удалён.`);
            }
        } catch (error) {
            console.error('Ticket deletion error:', error);
            return reply(interactionOrMessage, 'Не удалось удалить канал тикета.');
        }
    }
};
