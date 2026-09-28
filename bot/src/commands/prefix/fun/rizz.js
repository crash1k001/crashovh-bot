
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'rizz',
  description: 'Отправить пользователю случайную рицц-фразу через API',
  aliases: ['riz'],
  
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    
    let rizzLine;
    try {
      const response = await axios.get('https://rizz-api.vercel.app/api/random');
      rizzLine = response.data.text || response.data.line;
    } catch (error) {
      console.error('Error fetching rizz from API:', error);
      const fallbackRizz = [
        "Ты фокусник? Потому что стоит мне взглянуть на тебя — все вокруг исчезает.",
        "У тебя есть карта? Я всё время теряюсь в твоих глазах.",
        "Ты Wi-Fi роутер? Потому что я чувствую сильную связь.",
        "Если бы ты была овощем, ты была бы 'милым огурчиком'.",
      ];
      rizzLine = fallbackRizz[Math.floor(Math.random() * fallbackRizz.length)];
    }
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Рицц-логика`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${target === message.author ? '' : `Эй, ${target}, `}${rizzLine}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 128 }))
          )
      );

    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
