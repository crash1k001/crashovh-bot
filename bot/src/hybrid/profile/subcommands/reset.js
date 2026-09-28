
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const Profile = require('../../../data/models/Profile');
const emojis = require('../../../emojis.json');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;

        try {
            const reset = await Profile.resetProfile(userId);

            if (!reset) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.error} У вас нет данных профиля для сброса.`)
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.check} Профиль сброшен. Описание, соцсети и фон очищены.`)
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Profile reset error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Ошибка базы данных')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Не удалось сбросить профиль. Попробуйте позже.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
