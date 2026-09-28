
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'truth',
  description: 'Получить случайный вопрос для правды',
  
  async execute(interaction) {
    try {
      const response = await fetch('https://api.truthordarebot.xyz/v1/truth?rating=pg13');
      const data = await response.json();
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Правда`)
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(data.question)
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ size: 128 }))
            )
        );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Ошибка`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось получить вопрос из API. Попробуйте позже.')
        );
      
      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  },
};
