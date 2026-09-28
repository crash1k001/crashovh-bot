
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'nitro',
  description: 'Сгенерировать фейковую ссылку на Nitro',
  
  async execute(interaction) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Бесплатный подарок Nitro`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Вот твой бесплатный Nitro!\n\nhttps://discord.gift/pnQQ9KxKuMqT2KNxHuKANhvc`)
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
