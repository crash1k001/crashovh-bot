
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(message, title, body) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'tempban',
  description: 'Временно забанить пользователей',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Банить участников**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Банить участников**.');

    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();
    
    if (!targetUser)
      return modReply(message, 'Пользователь не найден', 'Упомяните пользователя для временного бана.');

    const duration = args[1];
    if (!duration)
      return modReply(message, 'Не указана длительность', 'Укажите длительность (напр., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(message, 'Некорректная длительность', 'Укажите корректную длительность (напр., 1h, 30m, 1d, 7d).');

    if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Невозможно забанить', 'У этого пользователя роль выше или равна вашей.');

    if (targetMember && !targetMember.bannable)
      return modReply(message, 'Невозможно забанить', 'Я не могу забанить этого пользователя. Возможно, его роль выше моей.');

    const reason = args.slice(2).join(' ') || 'Причина не указана';

    try {
      await message.guild.members.ban(targetUser, {
        deleteMessageDays: 1,
        reason: `[TEMPBAN ${ms(time, { long: true })}] ${reason}`
      });

      setTimeout(async () => {
        try { await message.guild.members.unban(targetUser, 'Срок временного бана истёк'); } catch {}
      }, time);

      await modReply(message, 'Пользователь временно забанен',
        `**Пользователь:** ${targetUser.tag}\n**Длительность:** ${ms(time, { long: true })}\n**Модератор:** ${message.author.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы забанить этого пользователя.' : 'Не удалось временно забанить пользователя.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
