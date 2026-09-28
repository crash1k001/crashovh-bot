
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
  name: 'softban',
  description: 'Софтбан (бан и разбан для удаления сообщений)',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Банить участников**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Банить участников**.');

    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();
    
    if (!targetUser)
      return modReply(message, 'Пользователь не найден', 'Упомяните пользователя для софтбана.');

    if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Невозможно софтбанить', 'У этого пользователя роль выше или равна вашей.');

    if (targetMember && !targetMember.bannable)
      return modReply(message, 'Невозможно софтбанить', 'Я не могу софтбанить этого пользователя. Возможно, его роль выше моей.');

    const reason = args.slice(1).join(' ') || 'Причина не указана';

    try {
      await message.guild.members.ban(targetUser, { deleteMessageDays: 1, reason: `[SOFTBAN] ${reason}` });
      await message.guild.members.unban(targetUser, 'Софтбан — автоматический разбан');
      await modReply(message, 'Пользователь софтбанен',
        `**Пользователь:** ${targetUser.tag}\n**Модератор:** ${message.author.tag}\n**Причина:** ${reason}\n**Удалено сообщений:** за последний 1 д.`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы софтбанить этого пользователя.' : 'Не удалось софтбанить пользователя.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
