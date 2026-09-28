
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const cfg = require('../../config');
const feedbackDb = require('../../data/feedback');

function errContainer(text) {
    return new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
    name: 'feedback',
    description: 'Команды системы отзывов',
    aliases: ['fb', 'review'],
    async execute(message, args) {
        const prefix = cfg.PREFIX;

        if (!args.length) {
            return require('../../lib/helpMenu').sendHelp('feedback', message);
        }

        const subcommand = args[0].toLowerCase();

        if (subcommand === 'setup') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply({
                    components: [errContainer('Вам нужно право Администратор, чтобы использовать эту команду!')],
                    flags: MessageFlags.IsComponentsV2
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

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'panel') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply({
                    components: [errContainer('Вам нужно право Администратор, чтобы использовать эту команду!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            try {
                const config = await feedbackDb.getConfig(message.guildId);

                if (!config) {
                    return message.reply({
                        components: [errContainer(`Система отзывов не настроена! Сначала выполните \`${prefix}feedback setup\`.`)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const reviewChannel = message.guild.channels.cache.get(config.review_channel_id);

                if (!reviewChannel) {
                    return message.reply({
                        components: [errContainer('Канал отзывов не найден!')],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const panelContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${message.guild.name} — Отзывы`)
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

                panelContainer.addActionRowComponents(new ActionRowBuilder().addComponents(button));

                await reviewChannel.send({
                    components: [panelContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                const doneContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`Панель отзывов отправлена в ${reviewChannel}!`)
                    );

                return message.reply({
                    components: [doneContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Panel error:', error);
                return message.reply({
                    components: [errContainer('Произошла ошибка при отправке панели отзывов!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        if (subcommand === 'config') {
            try {
                const fbConfig = await feedbackDb.getConfig(message.guildId);

                if (!fbConfig) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('# Настройки отзывов')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Система отзывов не настроена для этого сервера.\n\nИспользуйте \`${prefix}feedback setup\`, чтобы настроить её.`)
                        );

                    return message.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const reviewChannel = message.guild.channels.cache.get(fbConfig.review_channel_id);
                const logChannel = fbConfig.log_channel_id ? message.guild.channels.cache.get(fbConfig.log_channel_id) : null;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Настройки отзывов')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Канал отзывов:** ${reviewChannel ? reviewChannel.toString() : 'Не найден'}\n**Канал логов:** ${logChannel ? logChannel.toString() : 'Не настроен'}`)
                    );

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Config error:', error);
                return message.reply({
                    components: [errContainer('Произошла ошибка при получении настроек!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        if (subcommand === 'reset') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply({
                    components: [errContainer('Вам нужно право Администратор, чтобы использовать эту команду!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            try {
                await feedbackDb.deleteConfig(message.guildId);

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Сброс завершён')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Настройки отзывов сброшены для этого сервера.')
                    );

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Reset error:', error);
                return message.reply({
                    components: [errContainer('Произошла ошибка при сбросе настроек!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
    }
};
