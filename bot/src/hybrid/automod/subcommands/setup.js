
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { AutomodConfig } = require('../../../data/models');

module.exports = {
    name: 'setup',
    description: 'Настроить автомодерацию через интерактивный мастер',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право **Управление сервером**, чтобы настроить автомодерацию.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const [config] = await AutomodConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Настройка автомодерации\n**Шаг 1 из 3** — Выбор модулей')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Выберите модули защиты для включения:')
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('automod_setup_modules')
                        .setPlaceholder('Выберите модули для включения')
                        .setMinValues(0)
                        .setMaxValues(7)
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-спам')
                                .setDescription('Ограничение частоты сообщений для защиты от спама')
                                .setValue('antiSpam')
                                .setDefault(config.antiSpam),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-ссылки')
                                .setDescription('Блокировать все внешние ссылки')
                                .setValue('antiLink')
                                .setDefault(config.antiLink),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-инвайты')
                                .setDescription('Блокировать инвайт-ссылки Discord')
                                .setValue('antiInvite')
                                .setDefault(config.antiInvite),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-маты')
                                .setDescription('Фильтровать запрещённые слова')
                                .setValue('antiBadWords')
                                .setDefault(config.antiBadWords),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-масс-упоминания')
                                .setDescription('Ограничить упоминания в сообщении')
                                .setValue('antiMassMention')
                                .setDefault(config.antiMassMention),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-капс')
                                .setDescription('Блокировать чрезмерный капс')
                                .setValue('antiCaps')
                                .setDefault(config.antiCaps)
                        ,
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-пинг')
                                .setDescription('Блокировать @everyone / @here')
                                .setValue('antiPing')
                                .setDefault(config.antiPing)
                        )
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_setup_next_1')
                        .setLabel('Настроить наказания')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('automod_setup_cancel')
                        .setLabel('Отмена')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};

module.exports.step2 = async function(interactionOrMessage, selectedModules) {
    const member = interactionOrMessage.member;
    const guild = interactionOrMessage.guild;
    const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Настройка автомодерации\n**Шаг 2 из 3** — Настройка наказаний')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Выберите тип наказания для каждого включённого модуля:')
        );

    
    const modules = [
        { key: 'antiSpam', name: 'Анти-спам', label: 'antiSpamPunishment' },
        { key: 'antiLink', name: 'Анти-ссылки', label: 'antiLinkPunishment' },
        { key: 'antiInvite', name: 'Анти-инвайты', label: 'antiInvitePunishment' },
        { key: 'antiBadWords', name: 'Анти-маты', label: 'antiBadWordsPunishment' },
        { key: 'antiMassMention', name: 'Анти-масс-упоминания', label: 'antiMassMentionPunishment' },
        { key: 'antiCaps', name: 'Анти-капс', label: 'antiCapsPunishment' },
        { key: 'antiPing', name: 'Анти-пинг', label: 'antiPingPunishment' }
    ];

    for (const mod of modules) {
        if (selectedModules.includes(mod.key)) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`automod_punishment_${mod.key}`)
                        .setPlaceholder(`Наказание: ${mod.name}`)
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Удалить сообщение')
                                .setValue('delete')
                                .setDefault(config[mod.label] === 'delete'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Удалить и предупредить')
                                .setValue('warn')
                                .setDefault(config[mod.label] === 'warn'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Замьютить')
                                .setValue('mute')
                                .setDefault(config[mod.label] === 'mute'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Кикнуть')
                                .setValue('kick')
                                .setDefault(config[mod.label] === 'kick'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Забанить')
                                .setValue('ban')
                                .setDefault(config[mod.label] === 'ban')
                        )
                )
            );
        }
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('automod_setup_next_2')
                .setLabel('Продолжить')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('automod_setup_back')
                .setLabel('Назад')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('automod_setup_cancel')
                .setLabel('Отмена')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return interactionOrMessage.update ? interactionOrMessage.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    }) : interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
};

module.exports.step3 = async function(interactionOrMessage) {
    const config = await AutomodConfig.findOne({ where: { guildId: interactionOrMessage.guild.id } });

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Настройка автомодерации\n**Шаг 3 из 3** — Настройка порогов')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Текущие пороги:**\n` +
                `Спам: ${config.spamThreshold} сообщ. / ${config.spamInterval}с\n` +
                `Упоминания: макс. ${config.mentionLimit}\n` +
                `Капс: макс. ${config.capsPercentage}%\n\n` +
                `Их можно изменить через команду \`/automod settings\`.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('automod_setup_complete')
                    .setLabel('Завершить настройку')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('automod_setup_back')
                    .setLabel('Назад')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return interactionOrMessage.update ? interactionOrMessage.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    }) : interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
};
