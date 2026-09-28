
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../emojis.json');

function createProgressBar(percentage) {
  if (percentage === 0) {
    return emojis.progressEmpty.repeat(10);
  }
  if (percentage === 100) {
    return emojis.progressLeft + emojis.progressCenter.repeat(8) + emojis.progressRight;
  }
  const filled = Math.round((percentage / 100) * 9);
  let bar = emojis.progressLeft;
  for (let i = 1; i < 10; i++) {
    if (i < filled) bar += emojis.progressCenter;
    else bar += emojis.progressEmpty;
  }
  return bar;
}

function getReaction(rate) {
  if (rate === 0) return "Полностью натурал";
  if (rate <= 20) return "Почти нет радужных вайбов";
  if (rate <= 40) return "Немного не то...";
  if (rate <= 60) return "Определённо сомневается";
  if (rate <= 80) return "Радужный флаг разблокирован";
  if (rate < 100) return "Организатор прайд-парада";
  return "Достигнут максимум!";
}

module.exports = {
  name: 'howgay',
  description: 'Показать процент гейства участника!',
  aliases: ['gay'],
  
  async execute(message, args) {
    const User = message.mentions.members.first();
    const gayrate = Math.floor(Math.random() * 101);
    const progressBar = createProgressBar(gayrate);
    const reaction = getReaction(gayrate);
    
    if (!User) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Пользователь не упомянут')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Упомяните пользователя, чтобы узнать его процент!')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Измеритель процента')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${User} гей на ${gayrate}%!**\n${progressBar}\n\n*${reaction}*`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(User.displayAvatarURL({ size: 128 }))
          )
      );
    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
