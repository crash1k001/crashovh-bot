
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const canvafy = require('canvafy');

module.exports = {
  name: 'ship',
  description: 'Составить пару из двух пользователей!',
  aliases: ['shipping'],

  async execute(message, args) {
    const mention1 = message.mentions.users.first();
    const mention2 = message.mentions.users.size > 1
      ? [...message.mentions.users.values()][1]
      : message.author;

    if (!mention1) {
      const errContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Использование')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('`ship @пользователь1 [@пользователь2]` — упомяните хотя бы одного пользователя!')
        );
      return message.channel.send({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    try {
      const avatar1 = mention1.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
      const avatar2 = mention2.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });

      const shipCard = await new canvafy.Ship()
        .setAvatars(avatar1, avatar2)
        .setBackground('color', '#2B2D31')
        .setOverlayOpacity(0.3)
        .setBorder('#ff69b4')
        .build();

      const attachment = new AttachmentBuilder(shipCard, { name: 'ship.png' });

      const container = new ContainerBuilder().setAccentColor(0xff69b4)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 💘 Пара`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${mention1.displayName}** + **${mention2.displayName}**`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('attachment://ship.png')
              .setDescription(`${mention1.username} x ${mention2.username}`)
          )
        );

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        files: [attachment],
      });
    } catch (error) {
      console.error('ShipCommand Error:', error);

      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Ошибка')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось создать карточку пары. Попробуйте ещё раз.')
        );

      return message.channel.send({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
