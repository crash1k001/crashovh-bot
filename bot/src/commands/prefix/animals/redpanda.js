
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
  name: "redpanda",
  description: "Случайное фото красной панды",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('redpanda');
      if (!imageUrl) return message.reply(`${emojis.error} Изображение не найдено. Попробуйте через момент.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Случайная красная панда`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Случайное фото красной панды")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching red panda image:", error);
      await message.reply(`${emojis.error} Не удалось получить фото красной панды. Попробуйте позже.`);
    }
  }
};
