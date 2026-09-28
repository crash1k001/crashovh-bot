
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  REST,
  PermissionFlagsBits
} = require("discord.js");

const emojis = require('../../../emojis.json');

const rest = new REST({ version: "10" });

module.exports = {
  name: "serverbio",
  description: "Установить био бота для этого сервера",
  aliases: ["sbio"],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Вам нужно право **Управление сервером**, чтобы использовать эту команду!`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    rest.setToken(message.client.token);
    
    const guildId = message.guild.id;
    const bioText = args.join(" ");

    if (!bioText) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Укажите текст био!\n**Использование:** \`serverbio <текст>\``)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (bioText.length > 190) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Текст био должен быть не длиннее 190 символов! (Сейчас: ${bioText.length})`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: { bio: bioText },
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Серверное био успешно обновлено!\n\n**Новое био:**\n${bioText}`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error updating server bio:", error);
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Произошла ошибка при обновлении серверного био. Попробуйте позже.`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
