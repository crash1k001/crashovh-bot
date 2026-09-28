
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
  
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data || !data.url) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Мемы не найдены`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Не удалось получить мем сейчас. Твоя жизнь и есть мем!`)
          );
        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Мем с Reddit`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${data.title}**\nот u/${data.author} в r/${data.subreddit}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(data.url)
              .setDescription(data.title)
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${data.ups || 0} апвоутов`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Смотреть на Reddit")
              .setStyle(ButtonStyle.Link)
              .setURL(data.postLink)
          )
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Ошибка Meme API`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось получить мем. Попробуйте позже.')
        );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
