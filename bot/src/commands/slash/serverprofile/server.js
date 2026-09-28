
const {
  SlashCommandBuilder,
  REST,
  PermissionFlagsBits, MessageFlags } = require("discord.js");

const emojis = require('../../../emojis.json');

const rest = new REST({ version: "10" });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Управление серверным профилем бота")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("avatar")
        .setDescription("Установить аватар бота для этого сервера")
        .addAttachmentOption(option =>
          option
            .setName("image")
            .setDescription("Изображение аватара")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("banner")
        .setDescription("Установить баннер бота для этого сервера")
        .addAttachmentOption(option =>
          option
            .setName("image")
            .setDescription("Изображение баннера")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bio")
        .setDescription("Установить био бота для этого сервера")
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("Текст био")
            .setRequired(true)
            .setMaxLength(190)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("name")
        .setDescription("Установить никнейм бота для этого сервера")
        .addStringOption(option =>
          option
            .setName("nickname")
            .setDescription("Никнейм для установки")
            .setRequired(true)
            .setMaxLength(32)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("resetprofile")
        .setDescription("Сбросить серверный профиль бота к настройкам по умолчанию")
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: `${emojis.error} Вам нужно право **Управление сервером**, чтобы использовать эту команду!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    rest.setToken(interaction.client.token);
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (subcommand === "avatar") {
        const attachment = interaction.options.getAttachment("image");
        
        if (!attachment.contentType?.startsWith("image/")) {
          return interaction.editReply({
            content: `${emojis.error} Укажите корректный файл изображения!`
          });
        }

        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64Data = `data:${attachment.contentType};base64,${buffer.toString("base64")}`;

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { avatar: base64Data },
        });

        await interaction.editReply({
          content: `${emojis.success} Серверный аватар успешно обновлён!`
        });

      } else if (subcommand === "banner") {
        const attachment = interaction.options.getAttachment("image");
        
        if (!attachment.contentType?.startsWith("image/")) {
          return interaction.editReply({
            content: `${emojis.error} Укажите корректный файл изображения!`
          });
        }

        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64Data = `data:${attachment.contentType};base64,${buffer.toString("base64")}`;

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { banner: base64Data },
        });

        await interaction.editReply({
          content: `${emojis.success} Серверный баннер успешно обновлён!`
        });

      } else if (subcommand === "bio") {
        const bioText = interaction.options.getString("text");

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { bio: bioText },
        });

        await interaction.editReply({
          content: `${emojis.success} Серверное био успешно обновлено!\n\n**Новое био:**\n${bioText}`
        });

      } else if (subcommand === "name") {
        const nickname = interaction.options.getString("nickname");

        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { nick: nickname },
        });

        await interaction.editReply({
          content: `${emojis.success} Серверный никнейм успешно изменён на **${nickname}**!`
        });

      } else if (subcommand === "resetprofile") {
        await rest.patch(`/guilds/${guildId}/members/@me`, {
          body: { 
            avatar: null,
            banner: null,
            bio: null,
            nick: null
          },
        });

        await interaction.editReply({
          content: `${emojis.success} Серверный профиль успешно сброшен к настройкам по умолчанию!`
        });
      }
    } catch (error) {
      console.error("Error updating server profile:", error);
      await interaction.editReply({
        content: `${emojis.error} Произошла ошибка при обновлении серверного профиля. Попробуйте позже.`
      });
    }
  }
};
