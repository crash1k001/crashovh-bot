
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
const { AutomodConfig, AutomodWhitelist } = require('../../../data/models');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'settings',
    description: 'Просмотреть и изменить текущие настройки автомодерации',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право **Управление сервером**, чтобы смотреть настройки автомодерации.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Автомодерация не настроена')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Выполните `/automod setup`, чтобы настроить автомодерацию для этого сервера.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const whitelistCount = await AutomodWhitelist.count({ where: { guildId: guild.id } });

        const moduleNames = {
            antiSpam: 'Анти-спам',
            antiLink: 'Анти-ссылки',
            antiInvite: 'Анти-инвайты',
            antiBadWords: 'Анти-маты',
            antiMassMention: 'Анти-масс-упоминания',
            antiCaps: 'Анти-капс'
        };

        const disabledModules = [];
        for (const [key, name] of Object.entries(moduleNames)) {
            if (!config[key]) {
                disabledModules.push(name);
            }
        }

        const punishmentLabels = {
            delete: 'Удалить сообщение',
            warn: 'Предупредить',
            mute: 'Замьютить',
            kick: 'Кикнуть',
            ban: 'Забанить'
        };

        const badWords = config.getBadWords();

        
        let enabledModulesList = '';
        for (const [key, name] of Object.entries(moduleNames)) {
            if (config[key]) {
                const punishmentKey = key + 'Punishment';
                const punishment = punishmentLabels[config[punishmentKey]] || 'Удалить сообщение';
                enabledModulesList += `${emojis.enabled} ${name} (${punishment})\n`;
            }
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Настройки автомодерации\n**Статус:** ${config.enabled ? `${emojis.online} Включена` : `${emojis.offline} Отключена`}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Канал логов:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Не задан'}\n` +
                    `**В исключениях:** ${whitelistCount} записей\n` +
                    `**Плохих слов:** ${badWords.length}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Пороги:**\n` +
                    `Спам: ${config.spamThreshold} сообщ. / ${config.spamInterval}с\n` +
                    `Упоминания: макс. ${config.mentionLimit}\n` +
                    `Капс: макс. ${config.capsPercentage}%`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Активные защиты:**\n${enabledModulesList || 'Нет'}`
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
                        .setCustomId('automod_toggle')
                        .setLabel(config.enabled ? 'Отключить' : 'Включить')
                        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('automod_edit_modules')
                        .setLabel('Изменить модули')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('automod_edit_settings')
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
