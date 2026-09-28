
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getRandomTenorGif } = require('../../../lib/gifHelper');
const emojis = require('../../../emojis.json');

module.exports = {
  name: "kill",
  description: "Убить кого-то",

  async execute(message, args) {
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Упомяните пользователя, чтобы убить его!\n**Использование:** \`kill @пользователь\``)
        );
      return message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const gifUrl = await getRandomTenorGif("anime kill");

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Убийство")
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
      new TextDisplayBuilder().setContent(`**${message.author.username}** устраняет **${targetUser.username}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const respondButton = new ButtonBuilder()
      .setCustomId(`kill_back_${message.author.id}_${targetUser.id}`)
      .setLabel("Дать отпор")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(respondButton);
    container.addActionRowComponents(buttonRow);

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
