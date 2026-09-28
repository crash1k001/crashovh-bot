
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

const SPECIAL_USER_ID = '544047377540186114';
const SMART_USER_ID = '1124248109472550993';

function getReaction(rate, specialType = null) {
  if (specialType === 'dumb') return "Самый тупой человек за всю историю... вне всяких измерений!";
  if (specialType === 'smart') return "Не повезло тебе, чудак";
  if (rate === 0) return "Обнаружен гениальный IQ!";
  if (rate <= 20) return "На самом деле довольно умный...";
  if (rate <= 40) return "Средние умственные способности";
  if (rate <= 60) return "Хмм... сомнительные решения";
  if (rate <= 80) return "Мозговые клетки покидают чат";
  if (rate < 100) return "Как ты вообще помнишь дышать?";
  return "Сертифицированный момент гладкого мозга";
}

module.exports = {
  name: 'howdumb',
  description: 'Показать процент тупости пользователя',
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const isDumb = user.id === SPECIAL_USER_ID;
    const isSmart = user.id === SMART_USER_ID;
    const specialType = isDumb ? 'dumb' : (isSmart ? 'smart' : null);
    const dumbrate = isDumb ? 101 : Math.floor(Math.random() * 101);
    const reaction = getReaction(dumbrate, specialType);

    let displayText;
    if (isSmart) {
      displayText = `**${user} на 1000% умнее тебя!**\n\n*${reaction}*`;
    } else {
      displayText = `**${user} туп на ${dumbrate}%!**\n\n*${reaction}*`;
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Измеритель тупости')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(displayText)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
