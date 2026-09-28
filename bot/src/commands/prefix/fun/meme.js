
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'meme',
  description: 'Отправить мем!',
  aliases: ['memes'],
  
  async execute(message, args) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data || !data.url) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Мемы не найдены')
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Не удалось получить мем сейчас. Попробуйте ещё раз!")
          );
        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Мем с Reddit')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${data.title}**`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Автор:** u/${data.author} | **Сабреддит:** r/${data.subreddit}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(data.url)
              .setDescription(data.title)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Смотреть на Reddit")
              .setStyle(ButtonStyle.Link)
              .setURL(data.postLink)
          )
        );

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Ошибка Meme API')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось получить мем. Попробуйте позже.')
        );
      message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
