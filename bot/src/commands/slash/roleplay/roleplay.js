
const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roleplay")
    .setDescription("Ролевые команды с гифками")
    .addSubcommand(subcommand =>
      subcommand
        .setName("hug")
        .setDescription("Обнять кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для объятия").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("kiss")
        .setDescription("Поцеловать кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для поцелуя").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("lick")
        .setDescription("Лизнуть кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь, которого лизнуть").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pat")
        .setDescription("Погладить кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для поглаживания").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("slap")
        .setDescription("Дать пощёчину кому-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для пощёчины").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("tickle")
        .setDescription("Пощекотать кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для щекотки").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("poke")
        .setDescription("Ткнуть кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для тыка").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("deathstare")
        .setDescription("Испепелить кого-то взглядом")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для взгляда").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName("dance").setDescription("Потанцевать!")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("cry").setDescription("Заплакать")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("laugh").setDescription("Громко засмеяться")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("smile").setDescription("Улыбнуться")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("blush").setDescription("Покраснеть")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("wink").setDescription("Подмигнуть")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("thumbsup").setDescription("Показать палец вверх")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("clap").setDescription("Похлопать")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("bow").setDescription("Поклониться")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("salute").setDescription("Отдать честь")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("facepalm").setDescription("Фейспалм")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("shrug").setDescription("Пожать плечами")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("sleep").setDescription("Уснуть")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("eat").setDescription("Съесть что-то")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("kill").setDescription("Убить кого-то")
        .addUserOption(option =>
          option.setName("user").setDescription("Пользователь для \"убийства\"").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName("run").setDescription("Убежать")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const subcommandFile = path.join(__dirname, "subcommands", `${subcommand}.js`);

    if (fs.existsSync(subcommandFile)) {
      const subcommandModule = require(subcommandFile);
      await subcommandModule.execute(interaction);
    }
  }
};
