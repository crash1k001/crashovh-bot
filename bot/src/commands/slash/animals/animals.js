
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../emojis.json');
const { fetchAnimalImage } = require('../../../lib/animalApi');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("animals")
    .setDescription("Случайные фото животных и факты")
    .addSubcommand(subcommand =>
      subcommand
        .setName("cat")
        .setDescription("Случайное фото кота")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("dog")
        .setDescription("Случайное фото собаки")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("fox")
        .setDescription("Случайное фото лисы")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("duck")
        .setDescription("Случайное фото утки")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("panda")
        .setDescription("Случайное фото панды")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("redpanda")
        .setDescription("Случайное фото красной панды")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bird")
        .setDescription("Случайное фото птицы")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bunny")
        .setDescription("Случайное фото кролика")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bear")
        .setDescription("Случайное фото медведя")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pig")
        .setDescription("Случайное фото свиньи")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("possum")
        .setDescription("Случайное фото опоссума")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("sheep")
        .setDescription("Случайное фото овцы")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("snake")
        .setDescription("Случайное фото змеи")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("squirrel")
        .setDescription("Случайное фото белки")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("fact")
        .setDescription("Случайный факт о животных")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    try {
      let imageUrl, title;

      const animalTitles = {
        cat: 'Случайный кот', dog: 'Случайная собака', fox: 'Случайная лиса',
        duck: 'Случайная утка', panda: 'Случайная панда', redpanda: 'Случайная красная панда',
        bird: 'Случайная птица', bunny: 'Случайный кролик', bear: 'Случайный медведь',
        pig: 'Случайная свинья', possum: 'Случайный опоссум', sheep: 'Случайная овца',
        snake: 'Случайная змея', squirrel: 'Случайная белка'
      };

      if (subcommand === 'fact') {
        const animals = ['cat', 'dog', 'panda', 'fox', 'bird', 'koala', 'raccoon', 'kangaroo'];
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        const factData = await fetch(`https://some-random-api.com/animal/${randomAnimal}`).then(r => r.json());
        const factContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Случайный факт о животных\n\n${factData.fact}`)
          );
        return await interaction.editReply({
          components: [factContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }

      title = animalTitles[subcommand] || `Случайное фото: ${subcommand}`;
      imageUrl = await fetchAnimalImage(subcommand);

      if (!imageUrl) {
        return await interaction.editReply({ content: `${emojis.error} Изображение не найдено. Попробуйте через момент.` });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${title}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(imageUrl)
              .setDescription(`${title}`)
          )
        );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error fetching animal image:", error);
      await interaction.editReply({
        content: `${emojis.error} Не удалось получить контент. Попробуйте позже.`
      });
    }
  }
};
