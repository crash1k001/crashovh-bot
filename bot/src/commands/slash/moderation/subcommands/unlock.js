
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
  name: 'unlock',
  description: 'Разблокировать канал',

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Управление каналами**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Управление каналами**.', true);

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await modReply(interaction, 'Канал разблокирован',
        `**Канал:** ${channel}\n**Разблокировал:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав изменить этот канал.' : 'Не удалось разблокировать канал.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
