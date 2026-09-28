
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getNekoGif } = require('../../../lib/nekoHelper');
const emojis = require('../../../emojis.json');

module.exports = {
  name: "kiss",
  description: "Поцеловать кого-то",

  async execute(message, args) {
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Упомяните пользователя, чтобы поцеловать его!\n**Использование:** \`kiss @пользователь\``)
        );
      return message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const gifUrl = await getNekoGif("kiss");

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Поцелуй")
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

    if (gifUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
          new MediaGalleryItemBuilder().setURL(gifUrl)
        ])
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${message.author.username}** целует **${targetUser.username}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const respondButton = new ButtonBuilder()
      .setCustomId(`kiss_back_${message.author.id}_${targetUser.id}`)
      .setLabel("Поцеловать в ответ")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(respondButton);
    container.addActionRowComponents(buttonRow);

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
