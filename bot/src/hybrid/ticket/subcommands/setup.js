
const {
    PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    SectionBuilder, ThumbnailBuilder, MessageFlags,
    MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../data/models');

function reply(ctx, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, flags: MessageFlags.Ephemeral });
}

function createValidLabel(name, prefix = '') {
    let cleanName = (name || 'item').toString().replace(/[^\w\s-]/g, '').trim();
    if (!cleanName) cleanName = 'item';
    let label = prefix + cleanName;
    if (label.length > 25) label = label.substring(0, 25);
    return label || prefix + 'item';
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const member = guild.members.cache.get(userId);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'Вам нужно право **Администратор**, чтобы использовать эту команду.');
        }

        const existing = await TicketConfig.findOne({ where: { guildId: guild.id } });

        if (existing) {
            return reply(interactionOrMessage, 'Система тикетов уже настроена. Сначала выполните `ticket reset`, чтобы сбросить текущую конфигурацию.');
        }

        await startSetupFlow(interactionOrMessage, guild, false);
    }
};

async function startSetupFlow(context, guild, isEdit) {
    const userId = context.user?.id || context.author?.id;

    const setupTypeMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_setup_type')
        .setPlaceholder('Выберите тип настройки...')
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Одна категория').setDescription('Все тикеты в одной категории').setValue('single'),
            new StringSelectMenuOptionBuilder().setLabel('Несколько категорий').setDescription('Разные категории для разных типов тикетов').setValue('multiple')
        );

    const setupContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Настройка системы тикетов'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Выберите, как организовать тикеты:\n- **Одна категория**\n> Все тикеты будут создаваться в одной категории\n- **Несколько категорий**\n> У разных типов тикетов будут свои категории'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(new ActionRowBuilder().addComponents(setupTypeMenu));

    let setupMsg;
    if (isEdit) {
        setupMsg = await context.update({ components: [setupContainer] });
    } else {
        setupMsg = await context.reply({ components: [setupContainer], flags: MessageFlags.IsComponentsV2 });
        if (!setupMsg) setupMsg = await context.fetchReply();
    }

    const setupData = {
        setupType: null, panelChannelId: null, supportRoleId: null,
        defaultCategoryId: null, logChannelId: null,
        panelTitle: 'Тикеты поддержки', panelDescription: 'Выберите категорию, чтобы создать тикет',
        panelColor: 0x2b2d31, panelImage: null, panelThumbnail: null,
        categories: [],
        channelPage: 0, rolePage: 0, categoryPage: 0, logPage: 0
    };

    const filter = i => i.user.id === userId;
    const collector = setupMsg.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async interaction => {
        try {
            const id = interaction.customId;
            if (id === 'ticket_setup_type') {
                setupData.setupType = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_channel_select') {
                setupData.panelChannelId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_role_select') {
                setupData.supportRoleId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_category_select') {
                setupData.defaultCategoryId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_log_select') {
                setupData.logChannelId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id.startsWith('ticket_channel_') || id.startsWith('ticket_role_') || id.startsWith('ticket_category_') || id.startsWith('ticket_log_')) {
                if (id.endsWith('_prev') || id.endsWith('_next')) {
                    const parts = id.split('_');
                    const section = parts[1];
                    const dir = parts[2];
                    const pageKey = section + 'Page';
                    if (dir === 'prev') setupData[pageKey] = Math.max(0, setupData[pageKey] - 1);
                    else setupData[pageKey]++;
                    await showChannelRoleSelection(interaction, guild, setupData);
                }
            } else if (id === 'ticket_customize') {
                await showCustomizeModal(interaction, setupData);
            } else if (id === 'ticket_finish') {
                await finishSetup(interaction, guild, setupData);
                collector.stop();
            }
        } catch (error) {
            console.error('Ticket setup error:', error);
            try {
                const errContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ошибка настройки'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Произошла ошибка во время настройки. Попробуйте ещё раз.'));
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
                } else {
                    await interaction.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, flags: MessageFlags.Ephemeral });
                }
            } catch (e) { console.error('Не удалось отправить сообщение об ошибке:', e); }
        }
    });
}

async function showChannelRoleSelection(interaction, guild, setupData) {
    const chunkSize = 24;

    const allTextChannels = Array.from(guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']))
        .sort((a, b) => a.name.localeCompare(b.name)).values());

    const allCategories = Array.from(guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory && c.permissionsFor(guild.members.me)?.has(['ViewChannel']))
        .sort((a, b) => a.name.localeCompare(b.name)).values());

    const allRoles = Array.from(guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id && r.position < guild.members.me.roles.highest.position)
        .sort((a, b) => a.name.localeCompare(b.name)).values());

    if (allCategories.length === 0) {
        try {
            const newCat = await guild.channels.create({
                name: 'ТИКЕТЫ', type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: guild.members.me, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] }
                ]
            });
            allCategories.push(newCat);
        } catch (e) { console.error('Не удалось создать категорию:', e); }
    }

    if (allTextChannels.length === 0 || allRoles.length === 0) {
        const reasons = [];
        if (allTextChannels.length === 0) reasons.push('> Нет текстовых каналов, которые бот может видеть и писать в них');
        if (allRoles.length === 0) reasons.push('> Нет ролей ниже наивысшей роли бота, которые можно назначить (все роли управляемые или выше бота)');
        const errContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Настройка не может продолжиться'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(reasons.join('\n')));
        return await interaction.update({ components: [errContainer] });
    }

    if (allCategories.length === 0) {
        allCategories.push({ id: 'none', name: 'Без категории (корневой уровень)' });
    }

    const chunk = arr => { const c = []; for (let i = 0; i < arr.length; i += chunkSize) c.push(arr.slice(i, i + chunkSize)); return c; };
    const channelChunks = chunk(allTextChannels);
    const roleChunks = chunk(allRoles);
    const categoryChunks = chunk(allCategories);

    setupData.channelPage = Math.min(setupData.channelPage, Math.max(0, channelChunks.length - 1));
    setupData.rolePage = Math.min(setupData.rolePage, Math.max(0, roleChunks.length - 1));
    setupData.categoryPage = Math.min(setupData.categoryPage, Math.max(0, categoryChunks.length - 1));
    setupData.logPage = Math.min(setupData.logPage, Math.max(0, channelChunks.length - 1));

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Настройка сервера'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Тип настройки:** ${setupData.setupType === 'single' ? 'Одна категория' : 'Несколько категорий'}\nНастройте следующие параметры:`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    const addMenu = (label, items, customId, selected, page, totalPages) => {
        if (items.length === 0) return;
        const isChannel = customId.includes('channel') || customId.includes('log');
        const options = items.map(item => {
            const lbl = createValidLabel(item.name, isChannel ? '#' : customId.includes('role') ? '@' : '');
            return new StringSelectMenuOptionBuilder()
                .setLabel(lbl).setDescription(label).setValue(item.id)
                .setDefault(item.id === selected);
        });
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${label}** (Страница ${page + 1}/${totalPages})`));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(customId)
                .setPlaceholder(selected ? `Выбрано` : `Выберите...`).setMaxValues(1).addOptions(options)
        ));
        if (totalPages > 1) {
            const prefix = customId.replace('_select', '');
            container.addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`${prefix}_prev`).setLabel('Назад').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId(`${prefix}_next`).setLabel('Далее').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
            ));
        }
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
    };

    addMenu('Шаг 1: Канал панели', channelChunks[setupData.channelPage] || [], 'ticket_channel_select', setupData.panelChannelId, setupData.channelPage, channelChunks.length);
    addMenu('Шаг 2: Роль поддержки', roleChunks[setupData.rolePage] || [], 'ticket_role_select', setupData.supportRoleId, setupData.rolePage, roleChunks.length);

    if (setupData.setupType === 'single') {
        addMenu('Шаг 3: Категория тикетов', categoryChunks[setupData.categoryPage] || [], 'ticket_category_select', setupData.defaultCategoryId, setupData.categoryPage, categoryChunks.length);
    } else if (!setupData.defaultCategoryId && allCategories.length > 0) {
        setupData.defaultCategoryId = allCategories[0].id;
    }

    addMenu(`Шаг ${setupData.setupType === 'single' ? '4' : '3'}: Канал логов`, channelChunks[setupData.logPage] || [], 'ticket_log_select', setupData.logChannelId, setupData.logPage, channelChunks.length);

    const isValid = setupData.setupType === 'multiple'
        ? (setupData.panelChannelId && setupData.supportRoleId && setupData.logChannelId)
        : (setupData.panelChannelId && setupData.supportRoleId && setupData.defaultCategoryId && setupData.logChannelId);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_customize').setLabel('Настроить панель').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_finish').setLabel('Завершить настройку').setStyle(ButtonStyle.Primary).setDisabled(!isValid)
    ));

    await interaction.update({ components: [container] });
}

async function showCustomizeModal(interaction, setupData) {
    const modal = new ModalBuilder().setCustomId('ticket_customize_modal').setTitle('Настройка панели тикетов');

    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_title').setLabel('Заголовок панели').setStyle(TextInputStyle.Short).setValue(setupData.panelTitle).setMaxLength(100).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_description').setLabel('Описание панели').setStyle(TextInputStyle.Paragraph).setValue(setupData.panelDescription).setMaxLength(1000).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_color').setLabel('Цвет акцента (hex-код или "none")').setStyle(TextInputStyle.Short).setValue(setupData.panelColor ? '#' + setupData.panelColor.toString(16).padStart(6, '0') : 'none').setMaxLength(7).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_image').setLabel('URL изображения (опционально)').setStyle(TextInputStyle.Short).setValue(setupData.panelImage || '').setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_thumbnail').setLabel('URL миниатюры (опционально)').setStyle(TextInputStyle.Short).setValue(setupData.panelThumbnail || '').setRequired(false))
    );

    await interaction.showModal(modal);

    try {
        const m = await interaction.awaitModalSubmit({ time: 300000 });
        try { setupData.panelTitle = m.fields.getTextInputValue('panel_title') || setupData.panelTitle; } catch {}
        try { setupData.panelDescription = m.fields.getTextInputValue('panel_description') || setupData.panelDescription; } catch {}
        try {
            const hex = m.fields.getTextInputValue('panel_color');
            if (hex && hex.toLowerCase() === 'none') setupData.panelColor = null;
            else if (hex && /^#[0-9A-F]{6}$/i.test(hex)) setupData.panelColor = parseInt(hex.substring(1), 16);
        } catch {}
        try { setupData.panelImage = m.fields.getTextInputValue('panel_image') || null; } catch {}
        try { setupData.panelThumbnail = m.fields.getTextInputValue('panel_thumbnail') || null; } catch {}
        await m.reply({ content: 'Панель успешно настроена.', flags: MessageFlags.Ephemeral });
    } catch {}
}

async function finishSetup(interaction, guild, setupData) {
    try {
        await TicketConfig.upsert({
            guildId: guild.id,
            setupType: setupData.setupType,
            panelChannelId: setupData.panelChannelId,
            supportRoleId: setupData.supportRoleId,
            defaultCategoryId: setupData.defaultCategoryId,
            logChannelId: setupData.logChannelId,
            panelTitle: setupData.panelTitle,
            panelDescription: setupData.panelDescription,
            panelColor: setupData.panelColor,
            panelImage: setupData.panelImage,
            panelThumbnail: setupData.panelThumbnail,
        });

        const doneContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Настройка завершена'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Используйте `ticket addcategory`, чтобы добавить категории, затем `ticket panel`, чтобы отправить панель.'));

        await interaction.update({ components: [doneContainer] });
    } catch (error) {
        console.error('Ошибка завершения настройки:', error);
        try {
            if (interaction.replied || interaction.deferred) await interaction.editReply({ content: 'Не удалось завершить настройку. Попробуйте ещё раз.' });
            else await interaction.reply({ content: 'Не удалось завершить настройку. Попробуйте ещё раз.', flags: MessageFlags.Ephemeral });
        } catch {}
    }
}

async function sendTicketPanel(guild, setupData) {
    const panelChannel = guild.channels.cache.get(setupData.panelChannelId);
    if (!panelChannel) return;

    const panelContainer = new ContainerBuilder();
    if (setupData.panelColor) panelContainer.setAccentColor(setupData.panelColor);

    const title = setupData.panelTitle || 'Тикеты поддержки';
    const titleContent = `**${title}**${setupData.panelDescription ? '\n' + setupData.panelDescription : ''}`;
    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(titleContent));
    const serverIcon = guild.iconURL({ dynamic: true, size: 256 });
    if (!setupData.panelThumbnail && serverIcon) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(serverIcon));
    else if (setupData.panelThumbnail) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(setupData.panelThumbnail));
    panelContainer.addSectionComponents(titleSection);

    panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    if (setupData.panelImage) {
        try {
            panelContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(setupData.panelImage).setDescription('Система поддержки'))
            );
            panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        } catch {}
    }

    const options = setupData.categories.map(cat => {
        const opt = new StringSelectMenuOptionBuilder()
            .setLabel(cat.name.substring(0, 25))
            .setValue(cat.name);
        if (cat.description) opt.setDescription(cat.description.substring(0, 50));
        if (cat.emoji) { try { opt.setEmoji(cat.emoji); } catch { opt.setEmoji('🎫'); } }
        return opt;
    });

    panelContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('create_ticket').setPlaceholder('Выберите категорию для создания тикета...').setMaxValues(1).addOptions(options)
    ));

    await panelChannel.send({ components: [panelContainer], flags: MessageFlags.IsComponentsV2 });
}
