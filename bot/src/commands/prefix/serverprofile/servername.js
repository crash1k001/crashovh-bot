
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
  name: "servername",
  description: "Установить никнейм бота для этого сервера",
  aliases: ["snick", "servernick"],

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
    const nickname = args.join(" ");

    if (!nickname) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Укажите никнейм!\n**Использование:** \`servername <никнейм>\``)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (nickname.length > 32) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Никнейм должен быть не длиннее 32 символов! (Сейчас: ${nickname.length})`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: { nick: nickname },
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Серверный никнейм успешно изменён на **${nickname}**!`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error updating server nickname:", error);
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Произошла ошибка при обновлении серверного никнейма. Попробуйте позже.`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
