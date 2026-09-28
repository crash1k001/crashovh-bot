
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
  name: 'temprole',
  description: 'Временно выдать роль пользователям',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'Причина не указана';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Управление ролями**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Управление ролями**.', true);

    if (!targetMember)
      return modReply(interaction, 'Пользователь не найден', 'Этого пользователя нет на сервере.', true);

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(interaction, 'Некорректная длительность', 'Укажите корректную длительность (напр., 1h, 30m, 1d, 7d).', true);

    if (role.position >= interaction.guild.members.me.roles.highest.position)
      return modReply(interaction, 'Роль слишком высока', 'Я не могу управлять этой ролью — она выше или равна моей самой высокой роли.', true);

    if (targetMember.roles.cache.has(role.id))
      return modReply(interaction, 'Роль уже выдана', 'У пользователя уже есть эта роль.', true);

    try {
      await targetMember.roles.add(role, `[TEMPROLE ${ms(time, { long: true })}] ${reason}`);

      setTimeout(async () => {
        try {
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
          if (member?.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Срок временной роли истёк');
          }
        } catch {}
      }, time);

      await modReply(interaction, 'Временная роль выдана',
        `**Пользователь:** ${targetUser}\n**Роль:** ${role}\n**Длительность:** ${ms(time, { long: true })}\n**Выдал:** ${interaction.user.tag}\n**Причина:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав управлять этой ролью.' : 'Не удалось выдать временную роль.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
