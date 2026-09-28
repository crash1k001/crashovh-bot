
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
const { AntinukeConfig } = require('../../../data/models');

module.exports = {
    name: 'setup',
    description: 'Настроить антинюк через интерактивный мастер',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        
        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Только **Владелец сервера** может настроить антинюк.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const existingConfig = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
        if (existingConfig) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Уже настроено'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Используйте `antinuke settings` для изменения или `antinuke disable` для сброса.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const [config] = await AntinukeConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Настройка антинюка\n**Шаг 1 из 3** — Выбор модулей')
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
                        .setCustomId('antinuke_setup_modules')
                        .setPlaceholder('Выберите модули для включения')
                        .setMinValues(0)
                        .setMaxValues(11)
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-бан')
                                .setDescription('Предотвращать массовый бан участников')
                                .setValue('antiBan')
                                .setDefault(config.antiBan),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-кик')
                                .setDescription('Предотвращать массовый кик участников')
                                .setValue('antiKick')
                                .setDefault(config.antiKick),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-создание каналов')
                                .setDescription('Предотвращать массовое создание каналов')
                                .setValue('antiChannelCreate')
                                .setDefault(config.antiChannelCreate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-удаление каналов')
                                .setDescription('Предотвращать массовое удаление каналов')
                                .setValue('antiChannelDelete')
                                .setDefault(config.antiChannelDelete),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-изменение каналов')
                                .setDescription('Предотвращать массовое изменение каналов')
                                .setValue('antiChannelEdit')
                                .setDefault(config.antiChannelEdit),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-создание ролей')
                                .setDescription('Предотвращать массовое создание ролей')
                                .setValue('antiRoleCreate')
                                .setDefault(config.antiRoleCreate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-удаление ролей')
                                .setDescription('Предотвращать массовое удаление ролей')
                                .setValue('antiRoleDelete')
                                .setDefault(config.antiRoleDelete),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-изменение ролей')
                                .setDescription('Предотвращать выдачу опасных прав')
                                .setValue('antiRoleUpdate')
                                .setDefault(config.antiRoleUpdate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-вебхуки')
                                .setDescription('Предотвращать несанкционированное создание вебхуков')
                                .setValue('antiWebhook')
                                .setDefault(config.antiWebhook),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-бот')
                                .setDescription('Предотвращать несанкционированное добавление ботов')
                                .setValue('antiBot')
                                .setDefault(config.antiBot),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Анти-эмодзи')
                                .setDescription('Предотвращать создание/удаление/изменение эмодзи')
                                .setValue('antiEmoji')
                                .setDefault(config.antiEmoji)
                        )
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('antinuke_setup_next_1')
                        .setLabel('Далее')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('antinuke_setup_cancel')
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
