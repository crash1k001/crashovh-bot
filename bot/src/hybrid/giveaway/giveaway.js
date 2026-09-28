
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Управление розыгрышами')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Начать новый розыгрыш')
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Длительность (напр., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('Количество победителей')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('Приз розыгрыша')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Канал для розыгрыша (по умолчанию — текущий)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('Досрочно завершить розыгрыш')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('ID сообщения розыгрыша')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Перевыбрать победителя розыгрыша')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('ID сообщения розыгрыша')
            .setRequired(true)
        )
    ),

  name: 'giveaway',
  aliases: ['gstart', 'gend', 'greroll', 'giveaway-start', 'giveaway-end', 'giveaway-reroll'],
  description: 'Управление розыгрышами',
  category: 'giveaway',

  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();

    let subcommand;

    if (isSlash) {
      subcommand = interactionOrMessage.options.getSubcommand();
    } else {
      if (['start', 'end', 'reroll'].includes(args[0]?.toLowerCase())) {
        subcommand = args[0].toLowerCase();
        args = args.slice(1);
      } else {
        const lowerContent = interactionOrMessage.content.toLowerCase();
        if (lowerContent.match(/\bgstart\b/)) {
          subcommand = 'start';
        } else if (lowerContent.match(/\bgend\b/)) {
          subcommand = 'end';
        } else if (lowerContent.match(/\bgreroll\b/)) {
          subcommand = 'reroll';
        } else {
          subcommand = null;
        }
      }
    }

    if (!subcommand || !['start', 'end', 'reroll'].includes(subcommand)) {
      return require('../../lib/helpMenu').sendHelp('giveaway', interactionOrMessage);
    }

    const subcommandFile = require(`./subcommands/${subcommand}`);
    return subcommandFile.execute(interactionOrMessage, args);
  }
};
