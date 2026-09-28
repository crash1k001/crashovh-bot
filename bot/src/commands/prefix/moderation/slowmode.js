
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

function modReply(message, title, body) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'slowmode',
  description: 'Установить медленный режим для канала',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Управление каналами**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Управление каналами**.');

    const channel = message.mentions.channels.first() || message.channel;

    if (!args[0]) {
      try {
        if (channel.rateLimitPerUser > 0) {
          await channel.setRateLimitPerUser(0);
          return modReply(message, 'Медленный режим отключён',
            `**Канал:** ${channel}\n**Установил:** ${message.author.tag}`);
        }
        return modReply(message, 'Медленный режим не активен', 'В этом канале медленный режим отключён. Укажите длительность в секундах, чтобы включить.');
      } catch (error) {
        const msg = error.code === 50013 ? 'У меня нет прав изменить этот канал.' : 'Не удалось переключить медленный режим.';
        return modReply(message, 'Ошибка', msg);
      }
    }

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600)
      return modReply(message, 'Некорректная длительность', 'Укажите корректную длительность в секундах (0-21600).');

    try {
      await channel.setRateLimitPerUser(seconds);
      await modReply(message, seconds === 0 ? 'Медленный режим отключён' : 'Медленный режим включён',
        `**Канал:** ${channel}\n**Длительность:** ${seconds === 0 ? 'Отключено' : `${seconds} сек.`}\n**Установил:** ${message.author.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав изменить этот канал.' : 'Не удалось установить медленный режим.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
