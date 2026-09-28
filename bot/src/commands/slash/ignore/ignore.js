
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('Управление игнорируемыми командами, каналами, пользователями и исключениями')
    .addSubcommandGroup(group =>
      group
        .setName('command')
        .setDescription('Управление игнорируемыми командами')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Добавить команду в список игнорируемых')
            .addStringOption(option =>
              option
                .setName('command')
                .setDescription('Название команды для игнорирования')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Убрать команду из списка игнорируемых')
            .addStringOption(option =>
              option
                .setName('command')
                .setDescription('Название команды для снятия с игнора')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Показать все игнорируемые команды')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('channel')
        .setDescription('Управление игнорируемыми каналами')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Добавить канал в список игнорируемых')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('Канал для игнорирования')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Убрать канал из списка игнорируемых')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('Канал для снятия с игнора')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Показать все игнорируемые каналы')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('user')
        .setDescription('Управление игнорируемыми пользователями')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Добавить пользователя в список игнорируемых')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('Пользователь для игнорирования')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Убрать пользователя из списка игнорируемых')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('Пользователь для снятия с игнора')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Показать всех игнорируемых пользователей')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('bypass')
        .setDescription('Управление пользователями из списка исключений')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Добавить пользователя в список исключений')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('Пользователь для добавления в исключения')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Убрать пользователя из списка исключений')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('Пользователь для удаления из исключений')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Показать всех пользователей из списка исключений')
        )
    ),

  async execute(interaction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    const subcommandFile = path.join(__dirname, 'subcommands', `${subcommandGroup}-${subcommand}.js`);

    if (fs.existsSync(subcommandFile)) {
      const subcommandModule = require(subcommandFile);
      await subcommandModule.execute(interaction);
    }
  }
};
