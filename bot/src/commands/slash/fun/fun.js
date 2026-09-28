
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
    .setName('fun')
    .setDescription('Развлекательные команды')
    .addSubcommand(subcommand =>
      subcommand
        .setName('meme')
        .setDescription('Отправить мем с Reddit')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('hack')
        .setDescription('Притвориться, что взламываешь чей-то Discord-аккаунт (шутки ради)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для "взлома"')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('howgay')
        .setDescription('Узнать процент гейства (шутки ради)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для проверки')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('howdumb')
        .setDescription('Узнать процент тупости (шутки ради)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для проверки')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('simprate')
        .setDescription('Узнать, насколько кто-то симп')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для проверки (по умолчанию вы сами)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kill')
        .setDescription('"Убить" кого-то (шутки ради)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь для "убийства"')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('lick')
        .setDescription('"Лизнуть" кого-то (шутки ради)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь, которого "лизнуть"')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dare')
        .setDescription('Получить случайное испытание')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('truth')
        .setDescription('Получить случайный вопрос для правды')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pickup')
        .setDescription('Получить случайную подкат-фразу')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('nitro')
        .setDescription('Сгенерировать фейковую ссылку на Nitro')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('token')
        .setDescription('Сгенерировать фейковый токен Discord')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь (по умолчанию вы сами)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('texttoemoji')
        .setDescription('Преобразовать текст в эмодзи')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Текст для преобразования')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rickroll')
        .setDescription('Проверить, является ли ссылка рикроллом')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('Ссылка для проверки')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rizz')
        .setDescription('Получить случайную рицц-фразу для себя или кого-то другого')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь, которого "рицц"')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('wizz')
        .setDescription('Фейковая команда уничтожения сервера')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ship')
        .setDescription('Составить пару из двух пользователей и узнать совместимость!')
        .addUserOption(option =>
          option.setName('user1')
            .setDescription('Первый пользователь для пары')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('user2')
            .setDescription('Второй пользователь (по умолчанию вы сами)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fakemessage')
        .setDescription('Сгенерировать фейковую карточку сообщения Discord')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Пользователь, от чьего имени сообщение')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Текст сообщения')
            .setRequired(true)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option.setName('theme')
            .setDescription('Тема карточки (по умолчанию: dark)')
            .setRequired(false)
            .addChoices(
              { name: 'Тёмная', value: 'dark' },
              { name: 'Светлая', value: 'light' },
              { name: 'AMOLED', value: 'amoled' },
              { name: 'Полночь', value: 'midnight' },
              { name: 'Лес', value: 'forest' },
              { name: 'Океан', value: 'ocean' },
              { name: 'Закат', value: 'sunset' },
              { name: 'Фиолетовая', value: 'purple' }
            )
        )
        .addStringOption(option =>
          option.setName('timestamp')
            .setDescription('Свой таймстемп (напр., 12:43 AM)')
            .setRequired(false)
            .setMaxLength(20)
        )
        .addBooleanOption(option =>
          option.setName('app')
            .setDescription('Показать значок APP')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('verified')
            .setDescription('Показать значок верификации')
            .setRequired(false)
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
        content: 'Произошла ошибка при выполнении этой развлекательной команды!', 
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
