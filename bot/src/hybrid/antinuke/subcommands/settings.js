
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { AntinukeConfig, AntinukeWhitelist } = require('../../../data/models');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'settings',
    description: 'Просмотреть и изменить текущие настройки антинюка',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        
        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Только **Владелец сервера** может смотреть настройки антинюка.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
        
        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Антинюк не настроен')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Выполните `/antinuke setup`, чтобы настроить антинюк для этого сервера.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const whitelistCount = await AntinukeWhitelist.count({ where: { guildId: guild.id } });
        
        const enabledModules = [];
        const disabledModules = [];
        
        const moduleNames = {
            antiBan: 'Анти-бан',
            antiKick: 'Анти-кик',
            antiChannelCreate: 'Анти-создание каналов',
            antiChannelDelete: 'Анти-удаление каналов',
            antiChannelEdit: 'Анти-изменение каналов',
            antiRoleCreate: 'Анти-создание ролей',
            antiRoleDelete: 'Анти-удаление ролей',
            antiRoleUpdate: 'Анти-изменение ролей',
            antiWebhook: 'Анти-вебхуки',
            antiBot: 'Анти-бот',
            antiEmoji: 'Анти-эмодзи',
            antiGuildUpdate: 'Анти-изменение сервера'
        };

        for (const [key, name] of Object.entries(moduleNames)) {
            if (config[key]) {
                enabledModules.push(name);
            } else {
                disabledModules.push(name);
            }
        }

        const punishmentLabels = {
            stripall: 'Снять все роли',
            kick: 'Кикнуть',
            ban: 'Забанить'
        };

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Настройки антинюка\n**Статус:** ${config.enabled ? `${emojis.online} Включён` : `${emojis.offline} Отключён`}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Порог:** ${config.threshold} действий за ${config.timeframe}с\n` +
                    `**Наказание:** ${punishmentLabels[config.punishment] || config.punishment}\n` +
                    `**Канал логов:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Не задан'}\n` +
                    `**Доверенных пользователей:** ${whitelistCount}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Включённые модули:**\n${enabledModules.length > 0 ? enabledModules.map(m => `${emojis.enabled} ${m}`).join('\n') : 'Нет'}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Отключённые модули:**\n${disabledModules.length > 0 ? disabledModules.map(m => `${emojis.disabled} ${m}`).join('\n') : 'Нет'}`
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('antinuke_toggle')
                        .setLabel(config.enabled ? 'Отключить' : 'Включить')
                        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('antinuke_edit_modules')
                        .setLabel('Изменить модули')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('antinuke_edit_settings')
                        .setLabel('Изменить настройки')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};
