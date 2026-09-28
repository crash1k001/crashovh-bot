
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
  aliases: [],
  
  async execute(message, args) {
    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Запуск процесса Wizz')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Уничтожаю ${message.guild.name}, займёт 22 секунды...`)
      );
    
    const msg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    const steps = [
      "Изменяю все настройки сервера...",
      `Удаляю **${message.guild.roles.cache.size}** ролей...`,
      `Удаляю **${message.guild.channels.cache.size}** каналов...`,
      "Удаляю вебхуки...",
      "Удаляю эмодзи...",
      "Запускаю волну банов..."
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const progressContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Wizz в процессе')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(step)
        );
      await msg.edit({
        components: [progressContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Wizz завершён')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Сервер ${message.guild.name} успешно уничтожен**\n\nНе переживай, это всё понарошку!`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 128 }))
          )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Уничтожил:** ${message.author.username}`)
      );

    await msg.edit({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
