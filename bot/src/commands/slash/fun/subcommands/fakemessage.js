
const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    MessageFlags,
} = require('discord.js');
const FakeMessageCard = require('../../../../lib/FakeMessageCard');

module.exports = {
    name: 'fakemessage',
    description: 'Сгенерировать фейковую карточку сообщения Discord',

    async execute(interaction) {
        const userOption = interaction.options.getUser('user');
        const message = interaction.options.getString('message');
        const theme = interaction.options.getString('theme') || 'dark';
        const timestamp = interaction.options.getString('timestamp') || null;
        const bot = interaction.options.getBoolean('app') || false;
        const verified = interaction.options.getBoolean('verified') || false;

        await interaction.deferReply();

        try {
            const processingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Генерирую фейковую карточку сообщения...')
                );

            await interaction.editReply({
                components: [processingContainer],
                flags: MessageFlags.IsComponentsV2,
            });

            const user = await interaction.client.users.fetch(userOption.id, { force: true });

            const avatarURL = user.displayAvatarURL({
                extension: 'png',
                size: 512,
                forceStatic: true,
            });

            let avatarDecorationURL = null;
            if (user.avatarDecorationData) {
                avatarDecorationURL = user.avatarDecorationURL({ size: 512 });
            }

            const imageBuffer = await FakeMessageCard.generate({
                username: user.displayName || user.username,
                message: message,
                avatarURL: avatarURL,
                avatarDecorationURL: avatarDecorationURL,
                theme: theme,
                timestamp: timestamp,
                bot: bot,
                verified: verified,
            });

            const attachment = new AttachmentBuilder(imageBuffer, {
                name: 'fakemessage.png',
            });

            const mediaGallery = new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://fakemessage.png')
                    .setDescription(`Фейковое сообщение от ${user.username}`)
            );

            const themes = FakeMessageCard.getThemes();
            const themeName = themes[theme]?.name || 'Тёмная';

            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Фейковое сообщение — тема ${themeName}`)
                )
                .addMediaGalleryComponents(mediaGallery);

            return interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                files: [attachment],
            });
        } catch (error) {
            console.error('FakeMessageCommand Error:', error);

            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Ошибка')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Не удалось создать карточку сообщения. Попробуйте ещё раз.')
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
