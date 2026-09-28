
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const Profile = require('../../../data/models/Profile');
const emojis = require('../../../emojis.json');

const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'snapchat', 'youtube', 'website', 'tiktok', 'telegram', 'spotify', 'twitter', 'twitch'];

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;

        let platform, link;
        
        if (isSlashCommand) {
            platform = interactionOrMessage.options.getString('platform');
            link = interactionOrMessage.options.getString('link');
        } else {
            platform = args[0]?.toLowerCase();
            link = args[1];
        }

        if (!platform || !PLATFORMS.includes(platform.toLowerCase())) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Выберите платформу')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('`profile social <платформа> <ссылка>`')
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!link) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Ссылка не указана')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Укажите ссылку для вашего профиля.')
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!link.startsWith('http://') && !link.startsWith('https://')) {
            link = 'https://' + link;
        }

        try {
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
            const result = await Profile.setSocial(userId, platformName, link);

            if (!result.success) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Лимит соцсетей достигнут')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Можно добавить максимум 3 ссылки на соцсети.')
                    );

                return interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emojis.check} Ссылка на ${platformName} ${result.updated ? 'обновлена' : 'добавлена'}.`
                    )
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Profile social error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Ошибка')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Не удалось обновить. Попробуйте позже.')
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
