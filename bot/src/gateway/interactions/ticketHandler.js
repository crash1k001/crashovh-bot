
const {
    PermissionsBitField, ChannelType,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, SectionBuilder, ThumbnailBuilder,
    MediaGalleryBuilder, MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory, Ticket } = require('../../data/models');
const { logTicketEvent, generateAndSendTranscript, getSupportRoleIds, hasSupportRole } = require('../../lib/ticketUtils');

async function handle(interaction) {
    const id = interaction.customId;

    if (interaction.isStringSelectMenu() && id === 'create_ticket') {
        await handleTicketCreation(interaction);
        return true;
    }

    if (interaction.isButton()) {
        if (id === 'ticket_claim') { await handleTicketClaim(interaction); return true; }
        if (id === 'ticket_close') { await handleTicketClose(interaction); return true; }
        if (id === 'ticket_reopen') { await handleTicketReopen(interaction); return true; }
        if (id === 'ticket_delete') { await handleTicketDelete(interaction); return true; }
    }

    return false;
}

async function handleTicketCreation(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.user;
    const categoryName = interaction.values[0];

    const [config, userTickets] = await Promise.all([
        TicketConfig.findOne({ where: { guildId: guild.id } }),
        Ticket.findAll({ where: { guildId: guild.id, userId: user.id, status: ['open', 'claimed'] } })
    ]);

    if (!config) return interaction.editReply({ content: 'Система тикетов не настроена.' });
    if (userTickets.length >= 3) return interaction.editReply({ content: 'У вас уже 3 открытых тикета. Сначала закройте некоторые.' });

    try {
        const selectedCategory = await TicketCategory.findOne({ where: { guildId: guild.id, categoryName } });

        let parentId = config.defaultCategoryId;
        if (config.setupType === 'multiple' && selectedCategory?.categoryId) {
            parentId = selectedCategory.categoryId;
        }

        const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sanitizedCategoryName = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `${sanitizedUsername}-${sanitizedCategoryName}`.substring(0, 100);

        const allRoleIds = getSupportRoleIds(config);
        const permissionOverwrites = [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages] }
        ];

        for (const roleId of allRoleIds) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages]
            });
        }

        const ticketChannel = await guild.channels.create({
            name: channelName || `ticket-${user.id}`,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites
        });

        const ticket = await Ticket.create({ guildId: guild.id, channelId: ticketChannel.id, userId: user.id, categoryName });

        const rolePings = allRoleIds.map(id => `<@&${id}>`).join(' ');
        await ticketChannel.send({ content: rolePings, allowedMentions: { roles: allRoleIds } });

        const titleSuffix = categoryName.toLowerCase().includes('ticket') ? '' : ' — тикет';
        const ticketContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${categoryName}${titleSuffix}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Добро пожаловать** <@${user.id}>\n**Категория:** ${categoryName}\n\nНаша команда поддержки скоро вам ответит.`)
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ dynamic: true })))
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('https://i.ibb.co/BVsB4CS4/382ad2dd02dd701a813c189ec01be1d3.jpg')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Взять в работу').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Закрыть тикет').setStyle(ButtonStyle.Danger)
            ));

        const ticketMsg = await ticketChannel.send({ components: [ticketContainer], flags: MessageFlags.IsComponentsV2 });

        await interaction.editReply({ content: `Тикет создан в ${ticketChannel}` });

        ticketMsg.pin().catch(() => {});
        logTicketEvent(guild, config, 'Тикет создан', `**Пользователь:** <@${user.id}>\n**Категория:** ${categoryName}\n**Канал:** ${ticketChannel}\n**ID тикета:** ${ticket.id}`).catch(() => {});
    } catch (error) {
        console.error('Ошибка создания тикета:', error);
        await interaction.editReply({ content: 'Не удалось создать тикет. Обратитесь к администратору.' });
    }
}

async function handleTicketClaim(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    if (ticket.userId !== user.id && !hasSupportRole(member, config)) return;
    if (ticket.status === 'deleted' || ticket.status === 'closed') return;
    if (ticket.claimedBy) return;

    ticket.claimedBy = user.id;
    ticket.status = 'claimed';
    await ticket.save();

    const claimContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Тикет взят в работу'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`В работе у <@${user.id}>`));
    await channel.send({ components: [claimContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

    logTicketEvent(guild, config, 'Тикет взят в работу', `**Тикет:** ${channel}\n**Взял:** <@${user.id}>`).catch(() => {});
}

async function handleTicketClose(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    if (ticket.userId !== user.id && !hasSupportRole(member, config)) return;

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    await ticket.save();

    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false });

    generateAndSendTranscript(guild, config, ticket, interaction.client).catch(() => {});

    const closedContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Тикет закрыт'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Переоткрыть').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_delete').setLabel('Удалить').setStyle(ButtonStyle.Danger)
        ));

    await channel.send({ components: [closedContainer], flags: MessageFlags.IsComponentsV2 });

    logTicketEvent(guild, config, 'Тикет закрыт', `**Тикет:** ${channel}\n**Закрыл:** <@${user.id}>`).catch(() => {});
}

async function handleTicketReopen(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    if (!hasSupportRole(member, config)) return;

    const newStatus = ticket.claimedBy ? 'claimed' : 'open';
    ticket.status = newStatus;
    ticket.closedAt = null;
    await ticket.save();

    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true });

    const reopenContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Тикет переоткрыт'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Переоткрыл <@${user.id}>`));
    await channel.send({ components: [reopenContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

    logTicketEvent(guild, config, 'Тикет переоткрыт', `**Тикет:** ${channel}\n**Переоткрыл:** <@${user.id}>`).catch(() => {});
}

async function handleTicketDelete(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    const hasPermission = member.permissions.has(PermissionsBitField.Flags.Administrator) || hasSupportRole(member, config);
    if (!hasPermission) return;

    ticket.status = 'deleted';
    await ticket.save();

    logTicketEvent(guild, config, 'Тикет удалён', `**Тикет:** ${channel.name}\n**Удалил:** <@${user.id}>`).catch(() => {});

    const deleteContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Тикет удалён'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Этот канал будет удалён через 5 секунд...'));
    await channel.send({ components: [deleteContainer], flags: MessageFlags.IsComponentsV2 });

    setTimeout(async () => {
        try { await channel.delete(); } catch (e) { console.error('Не удалось удалить канал тикета:', e); }
    }, 5000);
}

module.exports = { handle };
