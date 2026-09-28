
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
  name: 'unban',
  description: 'Разбанить ранее забаненного пользователя',

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'Причина не указана';

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Банить участников**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Банить участников**.', true);

    try {
      const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!bannedUser)
        return modReply(interaction, 'Пользователь не забанен', 'Этот пользователь не забанен на сервере.', true);

      await interaction.guild.members.unban(userId, reason);
      await modReply(interaction, 'Пользователь разбанен',
        `**Пользователь:** ${bannedUser.user.tag}\n**Модератор:** ${interaction.user.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав разбанить этого пользователя.' : 'Не удалось разбанить пользователя. Проверьте ID.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
