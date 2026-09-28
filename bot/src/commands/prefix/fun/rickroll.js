
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'rickroll',
  description: 'Проверить, является ли ссылка рикроллом',
  aliases: [],
  
  async execute(message, args) {
    const url = args.join(' ');
    
    if (!url) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Не указана ссылка')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Укажите ссылку, чтобы проверить на рикролл!')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(url)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Некорректная ссылка')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Формат ссылки некорректен!')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Анализ ссылки')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Проверяю на рикролл...')
      );
    
    const msg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const phrases = [
        "rickroll", "rick roll", "rick astley", "never gonna give you up"
      ];

      const source = response.data.toLowerCase();
      const rickRoll = phrases.some(phrase => source.includes(phrase));

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Детектор рикролла')
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**Ссылка:** ${url}`),
              new TextDisplayBuilder().setContent(`**Статус:** ${rickRoll ? 'РИКРОЛЛ ОБНАРУЖЕН!' : 'Безопасно — рикролл не найден'}`)
            )
        );

      await msg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Проверка не удалась')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось проверить ссылку. Возможно, она некорректна, недоступна или защищена.')
        );
      await msg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
