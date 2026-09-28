
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
  name: 'mute',
  description: 'Замьютить пользователей на время',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'Причина не указана';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Модерация участников**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Модерация участников**.', true);

    if (!targetMember)
      return modReply(interaction, 'Пользователь не найден', 'Этого пользователя нет на сервере.', true);

    const time = ms(duration);
    if (!time || time < 1000 || time > 2419200000)
      return modReply(interaction, 'Некорректная длительность', 'Укажите корректную длительность (напр., 1h, 30m, 1d). Максимум — 28 дней.', true);

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Невозможно замьютить', 'У этого пользователя роль выше или равна вашей.', true);

    if (!targetMember.moderatable)
      return modReply(interaction, 'Невозможно замьютить', 'Я не могу замьютить этого пользователя. Возможно, его роль выше моей.', true);

    try {
      await targetMember.timeout(time, reason);
      await modReply(interaction, 'Пользователь замьючен',
        `**Пользователь:** ${targetUser}\n**Длительность:** ${ms(time, { long: true })}\n**Модератор:** ${interaction.user.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав, чтобы замьютить этого пользователя.' : 'Не удалось замьютить пользователя.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
