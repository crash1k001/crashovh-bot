
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'hack',
  description: 'Притвориться, что взламываешь чей-то Discord-аккаунт (шутки ради)',
  
  async execute(interaction) {
    const lawda = [
      '8', '3821', '23', '21', '313', '43', '29', '76', '11', '9',
      '44', '470', '318', '26', '69'
    ];

    const member = interaction.options.getMember('user');
    const user = interaction.options.getUser('user');

    const processingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Идёт взлом`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Подключение к серверам Discord...\nОбход защиты...\nИзвлечение данных пользователя...`)
      );

    await interaction.reply({
      components: [processingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const randomPass = lawda[Math.floor(Math.random() * lawda.length)];
    const randomPass2 = Math.random().toString(36).substring(2, 5);
    const cleanUsername = user.username.replace(/[^a-zA-Z0-9]/g, '');
    
    const hackContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Взлом завершён`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**"Извлечённые" данные**`),
            new TextDisplayBuilder().setContent(`**Пользователь:** ${user}\n**Email:** ${cleanUsername}${randomPass}@gmail.com\n**Пароль:** ${user.username}@${randomPass2}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
          )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`"Взломал" ${interaction.user.username}`)
      );

    await interaction.editReply({
      components: [hackContainer],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
