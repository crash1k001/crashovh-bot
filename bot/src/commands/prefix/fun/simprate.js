
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

function getReaction(rate) {
  if (rate === 0) return "Полностью невосприимчив к симпству";
  if (rate <= 20) return "Сильный и независимый";
  if (rate <= 40) return "Симпует совсем немного...";
  if (rate <= 60) return "Иногда совсем плохо";
  if (rate <= 80) return "Отдал бы все свои сбережения";
  if (rate < 100) return "Сертифицированный профессиональный симп";
  return "Обнаружен верховный лорд симпов";
}

module.exports = {
  name: 'simprate',
  description: 'Узнать, насколько кто-то симп',
  aliases: ['simp'],
  
  async execute(message, args) {
    const Member = message.mentions.members.first() || message.member;
    const Result = Math.floor(Math.random() * 101);
    const reaction = getReaction(Result);

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Измеритель симпства')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${Member.user.username} симп на ${Result}%!**\n\n*${reaction}*`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(Member.displayAvatarURL({ size: 128 }))
          )
      );
    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
