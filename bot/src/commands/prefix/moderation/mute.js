
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
  name: 'mute',
  description: 'Замьютить пользователей на время',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Модерация участников**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Модерация участников**.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'Пользователь не найден', 'Упомяните пользователя для мьюта.');

    const duration = args[1];
    if (!duration)
      return modReply(message, 'Не указана длительность', 'Укажите длительность (напр., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 2419200000)
      return modReply(message, 'Некорректная длительность', 'Укажите корректную длительность (напр., 1h, 30m, 1d). Максимум — 28 дней.');

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Невозможно замьютить', 'У этого пользователя роль выше или равна вашей.');

    if (!targetMember.moderatable)
      return modReply(message, 'Невозможно замьютить', 'Я не могу замьютить этого пользователя. Возможно, его роль выше моей.');

    const reason = args.slice(2).join(' ') || 'Причина не указана';

    try {
      await targetMember.timeout(time, reason);
      await modReply(message, 'Пользователь замьючен',
        `**Пользователь:** ${targetMember.user}\n**Длительность:** ${ms(time, { long: true })}\n**Модератор:** ${message.author.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы замьютить этого пользователя.' : 'Не удалось замьютить пользователя.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
