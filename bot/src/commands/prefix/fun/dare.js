
const {
  ContainerBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'dare',
  description: 'Получить случайное испытание',
  aliases: [],
  
  async execute(message, args) {
    try {
      const response = await fetch('https://api.truthordarebot.xyz/v1/dare?rating=pg13');
      const data = await response.json();
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Испытание')
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(data.question)
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 128 }))
            )
        );

      message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Ошибка')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось получить испытание из API. Попробуйте позже.')
        );
      
      message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
