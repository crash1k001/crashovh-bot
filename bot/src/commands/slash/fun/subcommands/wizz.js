
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'wizz',
  description: 'Фейковая команда уничтожения сервера',
  
  async execute(interaction) {
    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Запуск процесса Wizz`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Уничтожаю ${interaction.guild.name}, займёт 22 секунды...`)
      );
    
    await interaction.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    const steps = [
      "Изменяю все настройки сервера...",
      `Удаляю **${interaction.guild.roles.cache.size}** ролей...`,
      `Удаляю **${interaction.guild.channels.cache.size}** каналов...`,
      "Удаляю вебхуки...",
      "Удаляю эмодзи...",
      "Запускаю волну банов..."
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const progressContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Wizz в процессе`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(step)
        );
      await interaction.editReply({
        components: [progressContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Wizz завершён`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Сервер ${interaction.guild.name} успешно уничтожен**\nНе переживай, это всё понарошку!`),
            new TextDisplayBuilder().setContent(`Уничтожил ${interaction.user.username}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
