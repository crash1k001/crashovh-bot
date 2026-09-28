
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
  name: 'roleremove',
  description: 'Снять роль с пользователя',
  aliases: ['removerole', 'takerole'],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Отказано в доступе', 'Вам нужно право **Управление ролями**.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Недостаточно прав', 'Мне нужно право **Управление ролями**.');

    let targetMember = message.mentions.members.first();
    if (!targetMember && args[0]) {
      const userQuery = args[0];
      const userIdMatch = userQuery.match(/^<?@?!?(\d{17,20})>?$/);
      if (userIdMatch) {
        targetMember = await message.guild.members.fetch(userIdMatch[1]).catch(() => null);
      } else {
        targetMember = message.guild.members.cache.find(m => 
          m.user.username.toLowerCase() === userQuery.toLowerCase() ||
          m.displayName.toLowerCase() === userQuery.toLowerCase()
        );
      }
    }
    if (!targetMember)
      return modReply(message, 'Пользователь не найден', 'Укажите корректное упоминание, ID или имя пользователя.');

    let role = message.mentions.roles.first();
    if (!role && args[1]) {
      const roleQuery = args[1];
      const roleIdMatch = roleQuery.match(/^<?@?&?(\d{17,20})>?$/);
      if (roleIdMatch) {
        role = message.guild.roles.cache.get(roleIdMatch[1]);
      } else {
        role = message.guild.roles.cache.find(r => 
          r.name.toLowerCase() === roleQuery.toLowerCase() ||
          r.name.toLowerCase().includes(roleQuery.toLowerCase())
        );
      }
    }
    if (!role)
      return modReply(message, 'Роль не найдена', 'Укажите корректное упоминание, ID или название роли.');

    if (role.position >= message.guild.members.me.roles.highest.position)
      return modReply(message, 'Роль слишком высока', 'Я не могу управлять этой ролью — она выше или равна моей самой высокой роли.');

    if (message.author.id !== message.guild.ownerId && role.position >= message.member.roles.highest.position)
      return modReply(message, 'Роль слишком высока', 'Вы не можете управлять ролью выше или равной вашей самой высокой роли.');

    if (!targetMember.roles.cache.has(role.id))
      return modReply(message, 'Роль не найдена', 'У пользователя нет этой роли.');

    try {
      await targetMember.roles.remove(role, `[ROLEREMOVE] By ${message.author.tag}`);
      await modReply(message, 'Роль снята',
        `**Пользователь:** ${targetMember.user}\n**Роль:** ${role.name}\n**Снял:** ${message.author.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав управлять этой ролью.' : 'Не удалось снять роль.';
      await modReply(message, 'Ошибка', msg);
    }
  },
};
