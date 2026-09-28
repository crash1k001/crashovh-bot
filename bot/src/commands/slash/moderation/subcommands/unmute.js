
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
  name: 'unmute',
  description: 'Снять мьют с пользователей',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Модерация участников**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Модерация участников**.', true);

    if (!targetMember)
      return modReply(interaction, 'Пользователь не найден', 'Этого пользователя нет на сервере.', true);

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Невозможно снять мьют', 'У этого пользователя роль выше или равна вашей.', true);

    if (!targetMember.isCommunicationDisabled())
      return modReply(interaction, 'Пользователь не замьючен', 'У этого пользователя сейчас нет тайм-аута.', true);

    if (!targetMember.moderatable)
      return modReply(interaction, 'Невозможно снять мьют', 'Я не могу снять мьют с этого пользователя. Возможно, его роль выше моей.', true);

    try {
      await targetMember.timeout(null);
      await modReply(interaction, 'Мьют снят',
        `**Пользователь:** ${targetUser}\n**Снял мьют:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы снять мьют с этого пользователя.' : 'Не удалось снять мьют с пользователя.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
