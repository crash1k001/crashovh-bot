
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

function emojify(text) {
  const emojiMap = {
    'a': '🇦', 'b': '🇧', 'c': '🇨', 'd': '🇩', 'e': '🇪', 'f': '🇫',
    'g': '🇬', 'h': '🇭', 'i': '🇮', 'j': '🇯', 'k': '🇰', 'l': '🇱',
    'm': '🇲', 'n': '🇳', 'o': '🇴', 'p': '🇵', 'q': '🇶', 'r': '🇷',
    's': '🇸', 't': '🇹', 'u': '🇺', 'v': '🇻', 'w': '🇼', 'x': '🇽',
    'y': '🇾', 'z': '🇿', '0': '0️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣',
    '4': '4️⃣', '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣',
    '!': '❗', '?': '❓', ' ': '  '
  };

  return text.toLowerCase().split('').map(char => emojiMap[char] || char).join(' ');
}

module.exports = {
  name: 'texttoemoji',
  description: 'Преобразовать текст в эмодзи.',
  aliases: ['tte'],
  
  async execute(message, args) {
    const text = args.join(" ");
    
    if (!text) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Текст не указан')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Укажите текст для преобразования в эмодзи.')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const emojified = emojify(text);
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Текст в эмодзи')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Исходный текст:** ${text}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 128 }))
          )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Результат:** ${emojified}`)
      );

    message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
