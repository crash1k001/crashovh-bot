
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "users",
  description: "Показать общее количество пользователей бота",
  aliases: [],

  async execute(message, args) {
    const { client } = message;
    const users = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const guilds = client.guilds.cache.size;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Пользователи ${client.user.username}**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`- **Пользователи:** ${users.toLocaleString()}\n- **Серверы:** ${guilds.toLocaleString()}`)
      );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
