
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
  name: 'ban',
  description: 'Забанить пользователей на сервере',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'Причина не указана';
    const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Банить участников**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Банить участников**.', true);

    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Невозможно забанить', 'У этого пользователя роль выше или равна вашей.', true);

    if (targetMember && !targetMember.bannable)
      return modReply(interaction, 'Невозможно забанить', 'Я не могу забанить этого пользователя. Возможно, его роль выше моей.', true);

    try {
      await interaction.guild.members.ban(targetUser, { deleteMessageDays, reason });

      await modReply(interaction, 'Пользователь забанен',
        `**User:** ${targetUser.tag}\n**Модератор:** ${interaction.user.tag}\n**Причина:** ${reason}` +
        (deleteMessageDays > 0 ? `\n**Удалено сообщений:** за последние ${deleteMessageDays} д.` : ''));
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы забанить этого пользователя.' : 'Не удалось забанить пользователя.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
