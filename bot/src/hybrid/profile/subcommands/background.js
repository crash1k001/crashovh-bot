
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { loadImage } = require('@napi-rs/canvas');
const Profile = require('../../../data/models/Profile');
const emojis = require('../../../emojis.json');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;

        let imageLink;
        if (isSlashCommand) {
            imageLink = interactionOrMessage.options.getString('image');
        } else {
            imageLink = args[0];
        }

        if (!imageLink) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Ссылка не указана')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Укажите ссылку на изображение для фона профиля.\n\n' +
                        '**Использование:** `profile background <ссылка_на_изображение>`\n' +
                        '**Пример:** `profile background https://i.imgur.com/example.png`\n\n' +
                        '**Примечание:** используйте постоянный хостинг вроде Imgur. Ссылки на вложения Discord со временем перестают работать!'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!imageLink.startsWith('http://') && !imageLink.startsWith('https://')) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Некорректная ссылка')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Укажите корректную ссылку на изображение, начинающуюся с http:// или https://'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const lowerLink = imageLink.toLowerCase();
        if (lowerLink.endsWith('.gif') || lowerLink.includes('.gif?')) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# GIF не поддерживается')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Анимированные GIF не поддерживаются для фона профиля.\n\n' +
                        'Используйте статичный формат: **PNG**, **JPG** или **WebP**'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            await loadImage(imageLink);
        } catch (err) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Не удалось загрузить изображение')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Не удалось загрузить изображение по указанной ссылке.\n\n' +
                        '**Возможные причины:**\n' +
                        '- Ссылка некорректна или устарела\n' +
                        '- Ссылки на вложения Discord истекают — используйте Imgur\n' +
                        '- Формат изображения не поддерживается\n\n' +
                        '**Совет:** загрузите изображение на [Imgur](https://imgur.com) и используйте эту ссылку.'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            await Profile.setBackground(userId, imageLink);

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.check} Фон профиля обновлён.`)
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Profile background error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Ошибка базы данных')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Не удалось обновить фон профиля. Попробуйте позже.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
