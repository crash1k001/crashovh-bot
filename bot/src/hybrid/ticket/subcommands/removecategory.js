
const {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, ActionRowBuilder, StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../data/models');
const { logTicketEvent, refreshPanel } = require('../../../lib/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const member = guild.members.cache.get(userId);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'Вам нужно право **Администратор**, чтобы использовать эту команду.');
        }

        const config = await TicketConfig.findOne({ where: { guildId: guild.id } });
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена. Сначала выполните `ticket setup`.');

        const categories = await TicketCategory.findAll({ where: { guildId: guild.id }, order: [['id', 'ASC']] });
        if (categories.length === 0) return reply(interactionOrMessage, 'Нет категорий для удаления.');

        const options = categories.map(cat =>
            new StringSelectMenuOptionBuilder()
                .setLabel(cat.categoryName.substring(0, 25))
                .setValue(String(cat.id))
                .setDescription(`ID: ${cat.id}`)
        );

        const selectContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Удаление категории'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Выберите категорию для удаления.'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('ticket_removecat_select').setPlaceholder('Выберите категорию...').setMaxValues(1).addOptions(options)
            ));

        const msg = await (interactionOrMessage.isCommand?.()
            ? interactionOrMessage.reply({ components: [selectContainer], flags: MessageFlags.IsComponentsV2 })
            : interactionOrMessage.reply({ components: [selectContainer], flags: MessageFlags.IsComponentsV2 }));
        const sentMsg = msg || await interactionOrMessage.fetchReply?.() || await interactionOrMessage.channel.messages.fetch({ limit: 1 }).then(m => m.first());

        try {
            const selectInteraction = await sentMsg.awaitMessageComponent({
                filter: i => i.customId === 'ticket_removecat_select' && i.user.id === userId,
                time: 60000
            });

            const catId = selectInteraction.values[0];
            const category = categories.find(c => String(c.id) === catId);
            if (!category) {
                return selectInteraction.update({ components: [new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Категория не найдена.'))] });
            }

            const catName = category.categoryName;
            await category.destroy();
            await logTicketEvent(guild, config, 'Категория удалена', `**Категория:** ${catName}\n**Удалил:** <@${userId}>`);
            refreshPanel(guild, config).catch(() => {});

            const doneContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Категория удалена'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **${catName}** удалена.`));
            await selectInteraction.update({ components: [doneContainer] });
        } catch {
            const expiredContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Удаление категории'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Время ожидания истекло.'));
            await sentMsg.edit({ components: [expiredContainer] }).catch(() => {});
        }
    }
};
