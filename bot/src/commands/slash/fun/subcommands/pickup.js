
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'pickup',
  description: 'Получить случайную подкат-фразу',
  
  async execute(interaction) {
    const pickup = [
      "Ты, случайно, не аллергик на молочку? Потому что ты **сливки** общества.",
      "Я не фотограф, но легко представляю нас вместе на фото.",
      "Кажется, я потерял свой номер телефона. Можно взять твой?",
      "Ты кошка? Потому что я чувствую **кошачью** химию между нами.",
      "Ты из Франции? Потому что я **Эйфелею** к тебе чувства.",
      "Детка, жизнь без тебя как сломанный карандаш... **бессмысленна**.",
      "Если бы я мог переставить алфавит, я бы поставил **Т** и **Ы** рядом.",
      "Тебя зовут Google? Потому что ты — всё, что я искал.",
      "Ты из кофейни? Потому что ты мне нравишься на **вкус**.",
      "Ты банан? Потому что я нахожу тебя **аппетитной**.",
      "Ты чайник? Потому что мне нравится, как ты **закипаешь**.",
      "Детка, было больно, когда ты упала с небес?",
      "Тебя зовут Wi-Fi? Потому что я чувствую связь.",
      "Ты из Австралии? Потому что ты полностью соответствуешь моим **коала**-фикациям.",
      "Если бы я был котом, я бы провёл все 9 жизней с тобой.",
      "Моя любовь к тебе как деление на 0. Она неопределима.",
      "Убери гравитацию — я всё равно упаду к твоим ногам.",
      "Ты преступница? Потому что ты только что украла моё сердце.",
      "Привет, детка, я здесь. Какие были твои остальные два желания?",
    ];
    
    const randomPickup = pickup[Math.floor(Math.random() * pickup.length)];
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Подкат`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(randomPickup)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
