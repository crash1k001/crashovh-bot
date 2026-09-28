
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../emojis.json');
const { fetchAnimalImage } = require('../../../lib/animalApi');

module.exports = {
  name: "duck",
  description: "Случайное фото утки",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('duck');
      if (!imageUrl) return message.reply(`${emojis.error} Изображение не найдено. Попробуйте через момент.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Случайная утка`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Случайное фото утки")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching duck image:", error);
      await message.reply(`${emojis.error} Не удалось получить фото утки. Попробуйте позже.`);
    }
  }
};
