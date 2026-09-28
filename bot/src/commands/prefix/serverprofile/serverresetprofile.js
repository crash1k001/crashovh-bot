
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
  name: "serverresetprofile",
  description: "Сбросить серверный профиль бота к настройкам по умолчанию",
  aliases: ["sresetprofile", "sreset"],

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

    try {
      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: { 
          avatar: null,
          banner: null,
          bio: null,
          nick: null
        },
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Серверный профиль успешно сброшен к настройкам по умолчанию!`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error resetting server profile:", error);
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Произошла ошибка при сбросе серверного профиля. Попробуйте позже.`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
