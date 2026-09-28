
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
  name: "pig",
  description: "Случайное фото свиньи",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('pig');
      if (!imageUrl) return message.reply(`${emojis.error} Изображение не найдено. Попробуйте через момент.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Случайная свинья`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Случайное фото свиньи")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching pig image:", error);
      await message.reply(`${emojis.error} Не удалось получить фото свиньи. Попробуйте позже.`);
    }
  }
};
