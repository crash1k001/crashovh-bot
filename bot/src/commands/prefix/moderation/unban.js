
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
  name: 'unban',
  description: 'Разбанить ранее забаненного пользователя',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Банить участников**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Банить участников**.');

    const userId = args[0];
    if (!userId)
      return modReply(message, 'Не указан ID пользователя', 'Укажите ID пользователя для разбана.');

    const reason = args.slice(1).join(' ') || 'Причина не указана';

    try {
      const bannedUser = await message.guild.bans.fetch(userId).catch(() => null);
      if (!bannedUser)
        return modReply(message, 'Пользователь не забанен', 'Этот пользователь не забанен на сервере.');

      await message.guild.members.unban(userId, reason);
      await modReply(message, 'Пользователь разбанен',
        `**Пользователь:** ${bannedUser.user.tag}\n**Модератор:** ${message.author.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав разбанить этого пользователя.' : 'Не удалось разбанить пользователя. Проверьте ID.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
