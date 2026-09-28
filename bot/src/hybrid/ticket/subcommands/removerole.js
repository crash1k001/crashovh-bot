
const {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags
} = require('discord.js');
const { TicketConfig } = require('../../../data/models');
const { logTicketEvent, getSupportRoleIds } = require('../../../lib/ticketUtils');

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
        const member = guild.members.cache.get(userId);
        const isSlash = interactionOrMessage.isCommand?.();

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'Вам нужно право **Администратор**, чтобы использовать эту команду.');
        }

        const config = await TicketConfig.findOne({ where: { guildId: guild.id } });
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена. Сначала выполните `ticket setup`.');

        let roleId;
        if (isSlash) {
            const role = interactionOrMessage.options.getRole('role');
            roleId = role?.id;
        } else {
            if (!args[0]) return reply(interactionOrMessage, 'Укажите роль для удаления.\n**Использование:** `ticket removerole <@роль>`');
            roleId = args[0].replace(/[<@&>]/g, '');
        }

        if (roleId === config.supportRoleId) {
            return reply(interactionOrMessage, 'Нельзя удалить основную роль поддержки. Используйте `ticket reset`, чтобы изменить её.');
        }

        let additional = [];
        try { additional = JSON.parse(config.additionalRoleIds || '[]'); } catch {}

        if (!additional.includes(roleId)) {
            return reply(interactionOrMessage, `<@&${roleId}> не является дополнительной ролью поддержки.`);
        }

        additional = additional.filter(id => id !== roleId);
        config.additionalRoleIds = JSON.stringify(additional);
        await config.save();

        const allRoles = getSupportRoleIds(config);
        const roleList = allRoles.map(id => `<@&${id}>`).join(', ');

        const user = interactionOrMessage.user || interactionOrMessage.author;
        await logTicketEvent(guild, config, 'Роль поддержки удалена', `**Роль:** <@&${roleId}>\n**Удалил:** <@${userId}>`);

        return replyTitled(interactionOrMessage, '### Роль поддержки удалена', `<@&${roleId}> удалена из ролей поддержки.\n**Оставшиеся роли поддержки:** ${roleList}`);
    }
};
