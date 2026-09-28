
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

        let newNameInput;
        if (isSlash) {
            newNameInput = interactionOrMessage.options.getString('name');
        } else {
            if (!args[0]) return reply(interactionOrMessage, 'Укажите новое название.\n**Использование:** `ticket rename <новое-название>`');
            newNameInput = args.join(' ');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'Этот канал не является каналом тикета.');
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена.');

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'Только сотрудники поддержки могут переименовывать тикеты.');
        }

        try {
            const newName = newNameInput.toLowerCase()
                .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                .replace(/--+/g, '-').replace(/^-|-$/g, '')
                .substring(0, 100);

            if (!newName) return reply(interactionOrMessage, 'Некорректное название. Используйте только буквы, цифры и дефисы.');
            if (channel.name === newName) return reply(interactionOrMessage, 'Новое название совпадает с текущим.');

            const oldName = channel.name;
            const user = interactionOrMessage.user || interactionOrMessage.author;
            await channel.setName(newName, `Тикет переименован пользователем ${user.tag}`);

            logTicketEvent(guild, config, 'Тикет переименован', `**Тикет:** <#${channel.id}>\n**Старое название:** ${oldName}\n**Новое название:** ${newName}\n**Переименовал:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### Тикет переименован', `Этот тикет переименован в \`${newName}\``);
        } catch (error) {
            console.error('Ticket rename error:', error);
            let msg = 'Не удалось переименовать канал тикета.';
            if (error.code === 50013) msg = 'Недостаточно прав для переименования.';
            else if (error.code === 50029) msg = 'Достигнут лимит запросов. Подождите перед повторным переименованием.';
            return reply(interactionOrMessage, msg);
        }
    }
};
