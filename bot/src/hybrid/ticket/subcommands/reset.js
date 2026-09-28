
const {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../data/models');
const { logTicketEvent } = require('../../../lib/ticketUtils');

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
        if (!config) return reply(interactionOrMessage, 'Система тикетов не настроена. Сбрасывать нечего.');

        const confirmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Сброс системы тикетов'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Это удалит всю конфигурацию тикетов, категории и назначения ролей поддержки для этого сервера.\n> **Внимание:** существующие каналы тикетов не будут удалены, но система перестанет работать, пока вы не выполните настройку заново.'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_reset_confirm').setLabel('Сбросить').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_reset_cancel').setLabel('Отмена').setStyle(ButtonStyle.Secondary)
            ));

        const isSlash = interactionOrMessage.isCommand?.();
        let msg;
        if (isSlash) {
            msg = await interactionOrMessage.reply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2, fetchReply: true });
        } else {
            msg = await interactionOrMessage.reply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (!msg) msg = await interactionOrMessage.fetchReply?.();

        const filter = i => i.user.id === userId && i.message.id === msg.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'ticket_reset_cancel') {
                const cancelContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Сброс отменён'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Сброс отменён.'));
                await interaction.update({ components: [cancelContainer] });
                collector.stop();
                return;
            }

            if (interaction.customId === 'ticket_reset_confirm') {
                try {
                    const user = interactionOrMessage.user || interactionOrMessage.author;
                    await logTicketEvent(guild, config, 'Система тикетов сброшена', `**Сбросил:** <@${userId}>`);

                    await TicketCategory.destroy({ where: { guildId: guild.id } });
                    await TicketConfig.destroy({ where: { guildId: guild.id } });

                    const doneContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Система тикетов сброшена'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Вся конфигурация тикетов удалена. Теперь можно выполнить `ticket setup`, чтобы настроить систему заново.'));
                    await interaction.update({ components: [doneContainer] });
                } catch (error) {
                    console.error('Ticket reset error:', error);
                    const errContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Не удалось сбросить систему тикетов. Попробуйте ещё раз.'));
                    await interaction.update({ components: [errContainer] });
                }
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Время ожидания истекло'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Сброс отменён из-за бездействия.'));
                msg.edit({ components: [timeoutContainer] }).catch(() => {});
            }
        });
    }
};
