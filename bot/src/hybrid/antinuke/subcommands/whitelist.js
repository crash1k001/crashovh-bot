
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
    StringSelectMenuBuilder
} = require('discord.js');
const { AntinukeWhitelist } = require('../../../data/models');

const EVENTS = AntinukeWhitelist.EVENTS;

module.exports = {
    name: 'whitelist',
    description: 'Управление списком доверенных пользователей',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const isSlash = interactionOrMessage.isCommand?.();
        
        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Только **Владелец сервера** может управлять списком исключений.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        let action, user;
        
        if (isSlash) {
            action = interactionOrMessage.options.getString('action');
            user = interactionOrMessage.options.getUser('user');
        } else {
            action = args[0]?.toLowerCase();
            const userId = args[1]?.replace(/[<@!>]/g, '');
            if (userId) {
                try {
                    user = await interactionOrMessage.client.users.fetch(userId);
                } catch (e) {
                    user = null;
                }
            }
        }

        if (action === 'add') {
            if (!user) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Добавить в исключения')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Выберите пользователя для добавления в исключения:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('antinuke_whitelist_add')
                                .setPlaceholder('Выберите пользователя')
                                .setMinValues(1)
                                .setMaxValues(1)
                        )
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const eventOptions = Object.entries(EVENTS).map(([value, label]) => ({
                label: label,
                value: value,
                description: `Исключение для ${label}`
            }));

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Добавить в исключения: ${user.username}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Выберите, для каких событий добавить исключение:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`antinuke_whitelist_events:${user.id}`)
                            .setPlaceholder('Выберите события для исключения')
                            .setMinValues(1)
                            .setMaxValues(Object.keys(EVENTS).length)
                            .addOptions(eventOptions)
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`antinuke_whitelist_all:${user.id}`)
                            .setLabel('Исключить из всех событий')
                            .setStyle(ButtonStyle.Primary)
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'remove') {
            if (!user) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Убрать из исключений')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Выберите пользователя для удаления из исключений:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('antinuke_whitelist_remove')
                                .setPlaceholder('Выберите пользователя для удаления')
                                .setMinValues(1)
                                .setMaxValues(1)
                        )
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const existing = await AntinukeWhitelist.findOne({
                where: { guildId: guild.id, userId: user.id }
            });

            if (!existing) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${user.username}** не в списке исключений.`)
                    );
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const userEvents = existing.events;
            
            if (userEvents && userEvents.length > 0) {
                const eventOptions = userEvents.map(eventKey => ({
                    label: EVENTS[eventKey] || eventKey,
                    value: eventKey,
                    description: `Убрать из ${EVENTS[eventKey] || eventKey}`
                }));

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### Убрать исключения ${user.username}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Выберите события для удаления или уберите полностью:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`antinuke_whitelist_remove_events:${user.id}`)
                                .setPlaceholder('Выберите события для удаления')
                                .setMinValues(1)
                                .setMaxValues(eventOptions.length)
                                .addOptions(eventOptions)
                        )
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`antinuke_whitelist_remove_all:${user.id}`)
                                .setLabel('Убрать полностью')
                                .setStyle(ButtonStyle.Danger)
                        )
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const deleted = await AntinukeWhitelist.destroy({
                where: { guildId: guild.id, userId: user.id }
            });

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${user.username}** удалён из списка исключений.`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'list') {
            return showWhitelistDetailed(interactionOrMessage, guild);
        }

        const whitelist = await AntinukeWhitelist.findAll({ where: { guildId: guild.id } });
        
        let listContent = '';
        if (whitelist.length === 0) {
            listContent = 'Нет пользователей в списке исключений.';
        } else {
            listContent = whitelist.map((w, i) => {
                const events = w.events;
                const eventDisplay = events ? `(${events.length} событий)` : '(Все события)';
                return `\`${i + 1}.\` <@${w.userId}> ${eventDisplay}`;
            }).join('\n');
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Список исключений антинюка (${whitelist.length})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(listContent)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Используйте `antinuke whitelist list` для подробного просмотра.')
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('antinuke_whitelist_add_btn')
                        .setLabel('Добавить')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('antinuke_whitelist_remove_btn')
                        .setLabel('Убрать')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('antinuke_whitelist_list_btn')
                        .setLabel('Подробный список')
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
    const whitelist = await AntinukeWhitelist.findAll({ where: { guildId: guild.id } });
    
    if (whitelist.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Список исключений антинюка')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Нет пользователей в списке исключений.')
            );
        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    let detailedContent = '';
    for (const w of whitelist) {
        const events = w.events;
        let eventList;
        if (!events || events.length === 0) {
            eventList = '`Все события`';
        } else {
            eventList = events.map(e => `\`${EVENTS[e] || e}\``).join(', ');
        }
        detailedContent += `<@${w.userId}>\n${eventList}\n\n`;
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Список исключений антинюка — подробно (${whitelist.length})`)
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
                    .setCustomId('antinuke_whitelist_add_btn')
                    .setLabel('Добавить')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('antinuke_whitelist_remove_btn')
                    .setLabel('Убрать')
                    .setStyle(ButtonStyle.Danger)
            )
        );

    return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
}
