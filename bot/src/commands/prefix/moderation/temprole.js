
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
  name: 'temprole',
  description: 'Временно выдать роль пользователям',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Управление ролями**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Управление ролями**.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'Пользователь не найден', 'Упомяните пользователя.');

    const role = message.mentions.roles.first();
    if (!role)
      return modReply(message, 'Роль не найдена', 'Упомяните роль.');

    const duration = args.find(arg => !arg.startsWith('<@') && !arg.startsWith('<&'));
    if (!duration)
      return modReply(message, 'Не указана длительность', 'Укажите длительность (напр., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(message, 'Некорректная длительность', 'Укажите корректную длительность (напр., 1h, 30m, 1d, 7d).');

    if (role.position >= message.guild.members.me.roles.highest.position)
      return modReply(message, 'Роль слишком высока', 'Я не могу управлять этой ролью — она выше или равна моей самой высокой роли.');

    if (targetMember.roles.cache.has(role.id))
      return modReply(message, 'Роль уже выдана', 'У пользователя уже есть эта роль.');

    const reason = args.filter(arg => !arg.startsWith('<@') && !arg.startsWith('<&') && arg !== duration).join(' ') || 'Причина не указана';

    try {
      await targetMember.roles.add(role, `[TEMPROLE ${ms(time, { long: true })}] ${reason}`);

      setTimeout(async () => {
        try {
          const member = await message.guild.members.fetch(targetMember.id).catch(() => null);
          if (member?.roles.cache.has(role.id)) await member.roles.remove(role, 'Срок временной роли истёк');
        } catch {}
      }, time);

      await modReply(message, 'Временная роль выдана',
        `**Пользователь:** ${targetMember.user}\n**Роль:** ${role}\n**Длительность:** ${ms(time, { long: true })}\n**Выдал:** ${message.author.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав управлять этой ролью.' : 'Не удалось выдать временную роль.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
