
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const subcommands = new Map();
const subcommandsPath = path.join(__dirname, 'subcommands');

if (fs.existsSync(subcommandsPath)) {
  const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of subcommandFiles) {
    const filePath = path.join(subcommandsPath, file);
    const subcommand = require(filePath);
    if (subcommand.name && subcommand.execute) {
      subcommands.set(subcommand.name, subcommand);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Команды модерации')
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblock')
        .setDescription('Снова разрешить пользователю писать сообщения')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для разблокировки')
            .setRequired(true)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblind')
        .setDescription('Снова разрешить пользователю видеть канал')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь, которому нужно вернуть видимость')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Канал для отображения (по умолчанию текущий)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Кикнуть пользователей с сервера')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для кика')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина кика')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Забанить пользователей на сервере')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для бана')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина бана')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('delete_messages')
            .setDescription('Удалить сообщения за последние X дней (0-7)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('softban')
        .setDescription('Софтбан (бан и разбан для удаления сообщений)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для софтбана')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина софтбана')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('delete_messages')
            .setDescription('Удалить сообщения за последние X дней (0-7)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unban')
        .setDescription('Разбанить ранее забаненного пользователя')
        .addStringOption(option =>
          option.setName('user_id')
            .setDescription('ID пользователя для разбана')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина разбана')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('slowmode')
        .setDescription('Установить медленный режим для канала')
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Длительность медленного режима в секундах (0 — отключить)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Канал для медленного режима (по умолчанию текущий)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('lock')
        .setDescription('Запретить писать сообщения в канале')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Канал для блокировки (по умолчанию текущий)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина блокировки')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unlock')
        .setDescription('Разблокировать канал')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Канал для разблокировки (по умолчанию текущий)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tempban')
        .setDescription('Временно забанить пользователей')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для временного бана')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Длительность (напр., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина временного бана')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('delete_messages')
            .setDescription('Удалить сообщения за последние X дней (0-7)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Замьютить пользователей на время')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для мьюта')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Длительность (напр., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина мьюта')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unmute')
        .setDescription('Снять мьют с пользователей')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для снятия мьюта')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('temprole')
        .setDescription('Временно выдать роль пользователю')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для выдачи роли')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Роль для выдачи')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Длительность (напр., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Причина временной роли')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rolegive')
        .setDescription('Выдать роль пользователю')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для выдачи роли')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Роль для выдачи')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roleremove')
        .setDescription('Снять роль с пользователя')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь, с которого снять роль')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Роль для снятия')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommandName = interaction.options.getSubcommand();
    const subcommand = subcommands.get(subcommandName);

    if (!subcommand) {
      return interaction.reply({
        content: `Подкоманда '${subcommandName}' не найдена.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await subcommand.execute(interaction);
    } catch (error) {
      console.error(`Error executing subcommand ${subcommandName}:`, error);
      const errorMessage = { 
        content: 'Произошла ошибка при выполнении этой команды модерации!', 
        flags: MessageFlags.Ephemeral,
      };

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(errorMessage);
        } else if (interaction.deferred && !interaction.replied) {
          await interaction.editReply(errorMessage);
        }
      } catch (replyError) {
        console.error('Error sending error response:', replyError);
      }
    }
  },
};
