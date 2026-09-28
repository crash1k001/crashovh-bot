
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
  name: "serverbanner",
  description: "Установить баннер бота для этого сервера",
  aliases: ["sbanner"],

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
    const attachment = message.attachments.first();

    if (!attachment) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Прикрепите изображение для установки в качестве серверного баннера!`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!attachment.contentType?.startsWith("image/")) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Укажите корректный файл изображения!`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      const response = await fetch(attachment.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Data = `data:${attachment.contentType};base64,${buffer.toString("base64")}`;

      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: { banner: base64Data },
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Серверный баннер успешно обновлён!`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error updating server banner:", error);
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Произошла ошибка при обновлении серверного баннера. Попробуйте позже.`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
