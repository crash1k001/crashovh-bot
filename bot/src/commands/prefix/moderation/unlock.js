
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
  name: 'unlock',
  description: 'Разблокировать канал',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Управление каналами**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Управление каналами**.');

    const channel = message.mentions.channels.first() || message.channel;

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
      await modReply(message, 'Канал разблокирован',
        `**Канал:** ${channel}\n**Разблокировал:** ${message.author.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав изменить этот канал.' : 'Не удалось разблокировать канал.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
