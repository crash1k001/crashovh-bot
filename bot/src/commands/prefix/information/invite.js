
const {
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
} = require("discord.js");

module.exports = {
  name: "invite",
  description: "Получить ссылку-приглашение бота и сервера поддержки",
  aliases: ["invite-bot"],

  async execute(message, args) {
    const { client } = message;
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Пригласить ${client.user.username}**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Выберите ссылку-приглашение ниже, чтобы добавить меня на свой сервер.`)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Администратор')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&integration_type=0&scope=bot+applications.commands`),
          new ButtonBuilder()
            .setLabel('По умолчанию')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=2147551232&integration_type=0&scope=bot+applications.commands`)
        )
      );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
