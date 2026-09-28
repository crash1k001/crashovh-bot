
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
  name: 'slowmode',
  description: 'Установить медленный режим для канала',

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Отказано в доступе', 'Вам нужно право **Управление каналами**.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Недостаточно прав', 'Мне нужно право **Управление каналами**.', true);

    try {
      if (channel.rateLimitPerUser > 0 && seconds > 0) {
        await channel.setRateLimitPerUser(seconds);
        return modReply(interaction, 'Медленный режим обновлён',
          `**Канал:** ${channel}\n**Длительность:** ${seconds} сек.\n**Установил:** ${interaction.user.tag}`);
      }

      if (channel.rateLimitPerUser > 0) {
        await channel.setRateLimitPerUser(0);
        return modReply(interaction, 'Медленный режим отключён',
          `**Канал:** ${channel}\n**Установил:** ${interaction.user.tag}`);
      }

      await channel.setRateLimitPerUser(seconds);
      await modReply(interaction, seconds === 0 ? 'Медленный режим отключён' : 'Медленный режим включён',
        `**Канал:** ${channel}\n**Длительность:** ${seconds === 0 ? 'Отключено' : `${seconds} сек.`}\n**Установил:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'У меня нет прав изменить этот канал.' : 'Не удалось установить медленный режим.';
      await modReply(interaction, 'Ошибка', msg, true);
    }
  },
};
