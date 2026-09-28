
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ChannelType,
    ActionRowBuilder,
    ChannelSelectMenuBuilder
} = require('discord.js');
const { J2CConfig } = require('../../../data/models');
const VoiceControlView = require('../../../lib/j2cView');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'setup',
    description: 'Настроить систему Join2Create',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Вам нужно право Администратор, чтобы использовать эту команду.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const existing = await J2CConfig.findOne({ where: { guildId: guild.id } });
        if (existing?.voiceChannelId) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Уже настроено'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Используйте `j2c config` для изменения или `j2c reset`, чтобы начать заново.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Настройка Join2Create\n**Шаг 1 из 3**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Выберите **текстовый канал**, куда будет отправлена панель управления:')
            )
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('j2c_setup_text')
                            .setPlaceholder('Выберите текстовый канал для панели')
                            .setChannelTypes(ChannelType.GuildText)
                    )
            );

        await interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    },

    async sendControlPanel(textChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Интерфейс управления голосом**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addSectionComponents(
                new (require('discord.js').SectionBuilder)()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Используйте кнопки ниже для управления голосовым каналом.')
                    )
                    .setThumbnailAccessory(
                        new (require('discord.js').ThumbnailBuilder)().setURL(textChannel.client.user.displayAvatarURL({ size: 128 }))
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Использование кнопок**\n${emojis.j2c_lock} - заблокировать голосовой канал\n${emojis.j2c_unlock} - разблокировать голосовой канал\n${emojis.j2c_hide} - скрыть голосовой канал\n${emojis.j2c_unhide} - показать голосовой канал\n${emojis.j2c_claim} - забрать канал себе\n${emojis.j2c_disconnect} - отключить участника от вашего канала\n${emojis.j2c_activity} - посмотреть активности\n${emojis.j2c_info} - информация о канале\n${emojis.j2c_increase} - увеличить лимит участников\n${emojis.j2c_decrease} - уменьшить лимит участников`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(...VoiceControlView.getComponents());

        await textChannel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
