
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
  name: 'unmute',
  description: 'Снять мьют с пользователей',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Модерация участников**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Модерация участников**.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'Пользователь не найден', 'Упомяните пользователя для снятия мьюта.');

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Невозможно снять мьют', 'У этого пользователя роль выше или равна вашей.');

    if (!targetMember.isCommunicationDisabled())
      return modReply(message, 'Пользователь не замьючен', 'У этого пользователя сейчас нет тайм-аута.');

    if (!targetMember.moderatable)
      return modReply(message, 'Невозможно снять мьют', 'Я не могу снять мьют с этого пользователя. Возможно, его роль выше моей.');

    try {
      await targetMember.timeout(null);
      await modReply(message, 'Мьют снят',
        `**Пользователь:** ${targetMember.user}\n**Снял мьют:** ${message.author.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы снять мьют с этого пользователя.' : 'Не удалось снять мьют с пользователя.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
