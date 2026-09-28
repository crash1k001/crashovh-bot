
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
  name: 'kick',
  description: 'Кикнуть пользователей с сервера',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'Причина не указана';

    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Кикать участников**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Кикать участников**.', true);

    if (!targetMember)
      return modReply(interaction, 'Пользователь не найден', 'Этого пользователя нет на сервере.', true);

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Невозможно кикнуть', 'У этого пользователя роль выше или равна вашей.', true);

    if (!targetMember.kickable)
      return modReply(interaction, 'Невозможно кикнуть', 'Я не могу кикнуть этого пользователя. Возможно, его роль выше моей.', true);

    try {
      await targetMember.kick(reason);
      await modReply(interaction, 'Пользователь кикнут',
        `**Пользователь:** ${targetUser.tag}\n**Модератор:** ${interaction.user.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы кикнуть этого пользователя.' : 'Не удалось кикнуть пользователя.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
