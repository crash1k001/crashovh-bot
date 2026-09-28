
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const { AutomodWhitelist } = require('../../../data/models');

const MODULES = AutomodWhitelist.MODULES;

module.exports = {
    name: 'whitelist',
    description: 'Управление списком исключений: пользователи, роли, каналы',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const isSlash = interactionOrMessage.isCommand?.();

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право **Управление сервером**, чтобы управлять списком исключений.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        let action;

        if (isSlash) {
            action = interactionOrMessage.options.getString('action');
        } else {
            action = args[0]?.toLowerCase();
        }

        if (action === 'add') {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Добавить в исключения')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Выберите тип для добавления в исключения:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('automod_whitelist_type_user')
                            .setLabel('Пользователь')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('automod_whitelist_type_role')
                            .setLabel('Роль')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('automod_whitelist_type_channel')
                            .setLabel('Канал')
                            .setStyle(ButtonStyle.Primary)
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'remove') {
            const whitelist = await AutomodWhitelist.findAll({ where: { guildId: guild.id } });

            if (whitelist.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Список исключений пуст.')
                    );
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const options = whitelist.slice(0, 25).map(w => {
                const typeLabel = w.targetType === 'user' ? 'Пользователь' : w.targetType === 'role' ? 'Роль' : 'Канал';
                return {
                    label: `${typeLabel}: ${w.targetId}`,
                    value: w.targetId,
                    description: `Убрать ${typeLabel.toLowerCase()} из исключений`
                };
            });

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Убрать из исключений')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Выберите запись для удаления:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('automod_whitelist_remove')
                            .setPlaceholder('Выберите запись для удаления')
                            .addOptions(options)
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'list') {
            return showWhitelistDetailed(interactionOrMessage, guild);
        }

        
        const whitelist = await AutomodWhitelist.findAll({ where: { guildId: guild.id } });

        const users = whitelist.filter(w => w.targetType === 'user');
        const roles = whitelist.filter(w => w.targetType === 'role');
        const channels = whitelist.filter(w => w.targetType === 'channel');

        let listContent = '';
        if (whitelist.length === 0) {
            listContent = 'Записей в списке исключений нет.';
        } else {
            if (users.length > 0) {
                listContent += `**Пользователи (${users.length}):**\n${users.map(u => `<@${u.targetId}>`).join(', ')}\n\n`;
            }
            if (roles.length > 0) {
                listContent += `**Роли (${roles.length}):**\n${roles.map(r => `<@&${r.targetId}>`).join(', ')}\n\n`;
            }
            if (channels.length > 0) {
                listContent += `**Каналы (${channels.length}):**\n${channels.map(c => `<#${c.targetId}>`).join(', ')}`;
            }
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Список исключений автомодерации (${whitelist.length})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(listContent.trim() || 'Записей нет.')
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_whitelist_add_btn')
                        .setLabel('Добавить')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('automod_whitelist_remove_btn')
                        .setLabel('Убрать')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('automod_whitelist_list_btn')
                        .setLabel('Подробнее')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};

async function showWhitelistDetailed(interactionOrMessage, guild) {
    const whitelist = await AutomodWhitelist.findAll({ where: { guildId: guild.id } });

    if (whitelist.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Список исключений автомодерации')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Записей в списке исключений нет.')
            );
        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    let detailedContent = '';
    for (const w of whitelist) {
        const modules = w.getModules();
        let moduleList;
        if (!modules || modules.length === 0) {
            moduleList = '`Все модули`';
        } else {
            moduleList = modules.map(m => `\`${MODULES[m] || m}\``).join(', ');
        }

        let mention;
        if (w.targetType === 'user') mention = `<@${w.targetId}>`;
        else if (w.targetType === 'role') mention = `<@&${w.targetId}>`;
        else mention = `<#${w.targetId}>`;

        detailedContent += `${mention}\n${moduleList}\n\n`;
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Список исключений автомодерации — подробно (${whitelist.length})`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(detailedContent.trim())
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('automod_whitelist_add_btn')
                    .setLabel('Добавить')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('automod_whitelist_remove_btn')
                    .setLabel('Убрать')
                    .setStyle(ButtonStyle.Danger)
            )
        );

    return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
}
