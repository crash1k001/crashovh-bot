
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
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;

        let description;
        if (isSlashCommand) {
            description = interactionOrMessage.options.getString('text');
        } else {
            description = args.join(' ');
        }

        if (!description || description.trim() === '') {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Описание не указано')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Укажите описание для вашего профиля.\n\n' +
                        '**Использование:** `profile description <текст>`\n' +
                        '**Пример:** `profile description Люблю музыку и игры`'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (description.length > 500) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Описание слишком длинное')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Описание слишком длинное. Оно должно быть короче 500 символов.\n\n` +
                        `**Текущая длина:** ${description.length} символов`
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            await Profile.setDescription(userId, description.trim());

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.check} Описание профиля обновлено.`)
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Profile description error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Ошибка базы данных')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Не удалось обновить описание профиля. Попробуйте позже.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
