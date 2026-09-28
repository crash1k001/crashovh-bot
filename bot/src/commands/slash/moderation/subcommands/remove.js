
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0) });
}

module.exports = {
  name: 'roleremove',
  description: 'Снять роль с пользователя',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Управление ролями**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Управление ролями**.', true);

    if (!targetMember)
      return modReply(interaction, 'Пользователь не найден', 'Этого пользователя нет на сервере.', true);

    if (role.position >= interaction.guild.members.me.roles.highest.position)
      return modReply(interaction, 'Роль слишком высока', 'Я не могу управлять этой ролью — она выше или равна моей самой высокой роли.', true);

    if (interaction.member.id !== interaction.guild.ownerId && role.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Роль слишком высока', 'Вы не можете управлять ролью выше или равной вашей самой высокой роли.', true);

    if (!targetMember.roles.cache.has(role.id))
      return modReply(interaction, 'Роль не найдена', 'У пользователя нет этой роли.', true);

    try {
      await targetMember.roles.remove(role, `[ROLEREMOVE] By ${interaction.user.tag}`);
      await modReply(interaction, 'Роль снята',
        `**Пользователь:** ${targetUser}\n**Роль:** ${role.name}\n**Снял:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав управлять этой ролью.' : 'Не удалось снять роль.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
