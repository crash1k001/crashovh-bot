
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize} = require('discord.js');
const feedbackDb = require('../../data/feedback');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Команды системы отзывов')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Настроить систему отзывов')
        )
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Отправить панель отзывов в канал')
        )
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Показать текущие настройки отзывов')
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Сбросить настройки отзывов для сервера')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'Вам нужно право Администратор, чтобы использовать эту команду!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Настройка системы отзывов\n**Шаг 1 из 2**')
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Выберите **канал отзывов**, куда будут отправляться отзывы:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('feedback_setup_review')
                            .setPlaceholder('Выберите канал отзывов')
                            .setChannelTypes(ChannelType.GuildText)
                    )
                );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'panel') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'Вам нужно право Администратор, чтобы использовать эту команду!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const config = await feedbackDb.getConfig(interaction.guildId);

                if (!config) {
                    return interaction.reply({
                        content: 'Система отзывов не настроена! Сначала выполните `/feedback setup`.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const reviewChannel = interaction.guild.channels.cache.get(config.review_channel_id);

                if (!reviewChannel) {
                    return interaction.reply({
                        content: 'Канал отзывов не найден!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${interaction.guild.name} — Отзывы`)
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Поделись своим опытом!\n\nМы ценим твоё мнение о наших услугах. Помоги нам стать лучше, оставив отзыв!')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Нажми на кнопку ниже, чтобы оставить отзыв.')
                    );

                const button = new ButtonBuilder()
                    .setCustomId('open_feedback_modal')
                    .setLabel('Оставить отзыв')
                    .setStyle(ButtonStyle.Primary);

                container.addActionRowComponents(new ActionRowBuilder().addComponents(button));

                await reviewChannel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                return interaction.reply({
                    content: `Панель отзывов отправлена в ${reviewChannel}!`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.error('Panel error:', error);
                return interaction.reply({
                    content: 'Произошла ошибка при отправке панели отзывов!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === 'config') {
            try {
                const config = await feedbackDb.getConfig(interaction.guildId);

                if (!config) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('# Настройки отзывов')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('Система отзывов не настроена для этого сервера.\n\nИспользуйте `/feedback setup`, чтобы настроить её.')
                        );

                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const reviewChannel = interaction.guild.channels.cache.get(config.review_channel_id);
                const logChannel = config.log_channel_id ? interaction.guild.channels.cache.get(config.log_channel_id) : null;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Настройки отзывов')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Канал отзывов:** ${reviewChannel ? reviewChannel.toString() : 'Не найден'}\n**Канал логов:** ${logChannel ? logChannel.toString() : 'Не настроен'}`)
                    );

                return interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Config error:', error);
                return interaction.reply({
                    content: 'Произошла ошибка при получении настроек!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === 'reset') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'Вам нужно право Администратор, чтобы использовать эту команду!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                await feedbackDb.deleteConfig(interaction.guildId);

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Сброс завершён')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Настройки отзывов сброшены для этого сервера.')
                    );

                return interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Reset error:', error);
                return interaction.reply({
                    content: 'Произошла ошибка при сбросе настроек!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
