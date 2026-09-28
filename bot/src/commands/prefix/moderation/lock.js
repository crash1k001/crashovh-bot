
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
  name: 'lock',
  description: 'Запретить писать сообщения в канале',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Управление каналами**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Управление каналами**.');

    const channel = message.mentions.channels.first() || message.channel;
    const reason = args.filter(arg => !arg.startsWith('<#')).join(' ') || 'Причина не указана';

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }, { reason });
      await modReply(message, 'Канал заблокирован',
        `**Канал:** ${channel}\n**Заблокировал:** ${message.author.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав изменить этот канал.' : 'Не удалось заблокировать канал.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
