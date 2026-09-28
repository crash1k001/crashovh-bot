
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0) });
}

module.exports = {
  name: 'tempban',
  description: 'Временно забанить пользователей',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'Причина не указана';
    const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Банить участников**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Банить участников**.', true);

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(interaction, 'Некорректная длительность', 'Укажите корректную длительность (напр., 1h, 30m, 1d, 7d).', true);

    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Невозможно забанить', 'У этого пользователя роль выше или равна вашей.', true);

    if (targetMember && !targetMember.bannable)
      return modReply(interaction, 'Невозможно забанить', 'Я не могу забанить этого пользователя. Возможно, его роль выше моей.', true);

    try {
      await interaction.guild.members.ban(targetUser, {
        deleteMessageDays,
        reason: `[TEMPBAN ${ms(time, { long: true })}] ${reason}`
      });

      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(targetUser, 'Срок временного бана истёк');
        } catch {}
      }, time);

      await modReply(interaction, 'Пользователь временно забанен',
        `**User:** ${targetUser.tag}\n**Duration:** ${ms(time, { long: true })}\n**Модератор:** ${interaction.user.tag}\n**Причина:** ${reason}` +
        (deleteMessageDays > 0 ? `\n**Удалено сообщений:** за последние ${deleteMessageDays} д.` : ''));
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы забанить этого пользователя.' : 'Не удалось временно забанить пользователя.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
