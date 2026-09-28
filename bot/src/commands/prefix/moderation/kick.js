
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
  name: 'kick',
  description: 'Кикнуть пользователей с сервера',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Кикать участников**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Кикать участников**.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'Пользователь не найден', 'Упомяните пользователя для кика.');

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Невозможно кикнуть', 'У этого пользователя роль выше или равна вашей.');

    if (!targetMember.kickable)
      return modReply(message, 'Невозможно кикнуть', 'Я не могу кикнуть этого пользователя. Возможно, его роль выше моей.');

    const reason = args.slice(1).join(' ') || 'Причина не указана';

    try {
      await targetMember.kick(reason);
      await modReply(message, 'Пользователь кикнут',
        `**Пользователь:** ${targetMember.user.tag}\n**Модератор:** ${message.author.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы кикнуть этого пользователя.' : 'Не удалось кикнуть пользователя.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
