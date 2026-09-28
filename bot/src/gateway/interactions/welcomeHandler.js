
const emojis = require('../../emojis.json');
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const { WelcomeConfig, GuildConfig } = require('../../data/models');
const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('welcome_setup_simple_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
          );
        return interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройка приветствия — простое')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите канал для приветственных сообщений:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`welcome_channel_simple_${originalUserId}`)
              .setPlaceholder('Выберите канал приветствия')
              .setChannelTypes(ChannelType.GuildText)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('welcome_setup_container_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
          );
        return interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройка приветствия — контейнер')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите канал для приветственных сообщений:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`welcome_channel_container_${originalUserId}`)
              .setPlaceholder('Выберите канал приветствия')
              .setChannelTypes(ChannelType.GuildText)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('welcome_submit_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
          );
        return interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      await interaction.deferUpdate();
      try {
        const config = await WelcomeConfig.findOne({ where: { guildId: interaction.guild.id } });
        if (config) {
          await GuildConfig.upsert({ guildId: interaction.guild.id, welcomeInOn: true });

          const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`### ${emojis.success} Настройка приветствия завершена!`)
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Тип:** ${config.type === 'container' ? 'Контейнер' : 'Простой'}\n` +
                `**Канал:** <#${config.channelId}>\n\n` +
                `Приветственные сообщения теперь активны!`
              )
            );

          return interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } catch (error) {
        console.error('Ошибка сохранения приветствия:', error);
      }
      return true;
    }

    if (id === 'welcome_variables') {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Доступные плейсхолдеры')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# Используйте эти плейсхолдеры в приветственном сообщении:\n\n**{mention}**\nУпоминает пользователя (напр., @Имя).\n\n**{avatar}**\nСсылка на аватар пользователя.\n\n**{user}**\nИмя пользователя.\n\n**{user_nick}**\nНикнейм пользователя на сервере.\n\n**{joindate}**\nДата вступления пользователя на сервер.\n\n**{user_createdate}**\nДата создания аккаунта пользователя.\n\n**{server}**\nНазвание сервера.\n\n**{count}**\nОбщее количество участников сервера.\n\n**{server_icon}**\nСсылка на иконку сервера.')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# Добавляйте плейсхолдеры прямо в текст сообщения или поля контейнера.')
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (id.startsWith('welcome_cancel_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
          );
        return interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройка приветствия отменена')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройка приветствия отменена. Существующая конфигурация (если была) сохранена.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'welcome_back_to_editor') {
      return interaction.update({
        components: [],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isModalSubmit()) {
    if (id === 'welcome_simple_message') {
      await interaction.deferUpdate();
      try {
        const message = interaction.fields.getTextInputValue('welcome_message');

        await WelcomeConfig.update(
          { message: message },
          { where: { guildId: interaction.guild.id } }
        );
        await GuildConfig.upsert({ guildId: interaction.guild.id, welcomeInOn: true });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${emojis.success} Настройка приветствия завершена!`)
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Тип:** Простой\n` +
              `**Сообщение:**\n${message}\n\n` +
              `Приветственные сообщения теперь активны!`
            )
          );

        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Ошибка сохранения простого приветствия:', error);
      }
      return true;
    }

    if (id.startsWith('welcome_field_')) {
      const originalUserId = id.split('_').pop();
      await interaction.deferUpdate();
      try {
        const field = id.replace('welcome_field_', '').replace(`_${originalUserId}`, '');
        let updateData = {};

        if (field === 'title') {
          updateData.title = interaction.fields.getTextInputValue('welcome_title');
        } else if (field === 'description') {
          updateData.description = interaction.fields.getTextInputValue('welcome_description');
        } else if (field === 'color') {
          const colorValue = interaction.fields.getTextInputValue('welcome_color');
          const hexMatch = colorValue.match(/^#?([0-9A-Fa-f]{6})$/);
          if (hexMatch) {
            updateData.color = parseInt(hexMatch[1], 16);
          }
        } else if (field === 'thumbnail') {
          const thumbnailValue = interaction.fields.getTextInputValue('welcome_thumbnail');
          if (thumbnailValue.startsWith('{') || thumbnailValue.startsWith('http://') || thumbnailValue.startsWith('https://')) {
            updateData.thumbnailUrl = thumbnailValue;
          }
        } else if (field === 'image') {
          const imageValue = interaction.fields.getTextInputValue('welcome_image');
          if (imageValue.startsWith('{') || imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
            updateData.imageUrl = imageValue;
          }
        }

        await WelcomeConfig.update(updateData, { where: { guildId: interaction.guild.id } });

        const config = await WelcomeConfig.findOne({ where: { guildId: interaction.guild.id } });

        const previewContainer = new ContainerBuilder();
        if (config.color) {
          previewContainer.setAccentColor(config.color);
        }

        previewContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### ${config.title || 'Приветствие'}`)
        );
        previewContainer.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        if (isValidUrl(config.thumbnailUrl)) {
          const section = new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(config.description || 'Описание не задано.')
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(config.thumbnailUrl)
            );
          previewContainer.addSectionComponents(section);
        } else {
          previewContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(config.description || 'Описание не задано.')
          );
        }

        if (isValidUrl(config.imageUrl)) {
          previewContainer.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );
          previewContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(config.imageUrl)
            )
          );
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`welcome_field_select_${originalUserId}`)
          .setPlaceholder('Выберите поле для настройки')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Заголовок').setDescription('Задать заголовок контейнера').setValue('title'),
            new StringSelectMenuOptionBuilder().setLabel('Описание').setDescription('Задать описание контейнера').setValue('description'),
            new StringSelectMenuOptionBuilder().setLabel('Цвет').setDescription('Задать цвет акцента (hex-код)').setValue('color'),
            new StringSelectMenuOptionBuilder().setLabel('Миниатюра').setDescription('Задать URL миниатюры').setValue('thumbnail'),
            new StringSelectMenuOptionBuilder().setLabel('Изображение').setDescription('Задать URL основного изображения').setValue('image')
          );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome_submit_${originalUserId}`)
            .setLabel('Отправить')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('welcome_variables')
            .setLabel('Переменные')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`welcome_cancel_${originalUserId}`)
            .setLabel('Отмена')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({
          components: [previewContainer, selectRow, buttonRow],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Ошибка обновления поля приветствия:', error);
      }
      return true;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id.startsWith('welcome_field_select_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
          );
        return interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const selectedField = interaction.values[0];
      let modal;

      if (selectedField === 'title') {
        modal = new ModalBuilder()
          .setCustomId(`welcome_field_title_${originalUserId}`)
          .setTitle('Задать заголовок');
        const input = new TextInputBuilder()
          .setCustomId('welcome_title')
          .setLabel('Заголовок контейнера')
          .setPlaceholder('Добро пожаловать на {server}!')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      } else if (selectedField === 'description') {
        modal = new ModalBuilder()
          .setCustomId(`welcome_field_description_${originalUserId}`)
          .setTitle('Задать описание');
        const input = new TextInputBuilder()
          .setCustomId('welcome_description')
          .setLabel('Описание контейнера')
          .setPlaceholder('Привет {mention}, добро пожаловать! Ты участник №{count}.')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      } else if (selectedField === 'color') {
        const colorSelectMenu = new StringSelectMenuBuilder()
          .setCustomId(`welcome_color_select_${originalUserId}`)
          .setPlaceholder('Выберите вариант цвета')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Свой цвет').setDescription('Ввести свой hex-код цвета').setValue('custom'),
            new StringSelectMenuOptionBuilder().setLabel('Нет').setDescription('Убрать цвет акцента').setValue('none')
          );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Задать цвет акцента'))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Выберите вариант:'))
          .addActionRowComponents(new ActionRowBuilder().addComponents(colorSelectMenu));

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else if (selectedField === 'thumbnail') {
        modal = new ModalBuilder()
          .setCustomId(`welcome_field_thumbnail_${originalUserId}`)
          .setTitle('Задать миниатюру');
        const input = new TextInputBuilder()
          .setCustomId('welcome_thumbnail')
          .setLabel('URL миниатюры')
          .setPlaceholder('https://example.com/image.png или используйте {avatar}')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      } else if (selectedField === 'image') {
        modal = new ModalBuilder()
          .setCustomId(`welcome_field_image_${originalUserId}`)
          .setTitle('Задать изображение');
        const input = new TextInputBuilder()
          .setCustomId('welcome_image')
          .setLabel('URL изображения')
          .setPlaceholder('https://example.com/banner.png или используйте {server_icon}')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      }

      if (modal) {
        return interaction.showModal(modal);
      }
      return true;
    }

    if (id.startsWith('welcome_color_select_')) {
      const originalUserId = id.split('_').pop();
      const selectedValue = interaction.values[0];

      if (selectedValue === 'none') {
        await interaction.deferUpdate();
        await WelcomeConfig.update({ color: null }, { where: { guildId: interaction.guild.id } });

        const config = await WelcomeConfig.findOne({ where: { guildId: interaction.guild.id } });

        const previewContainer = new ContainerBuilder();
        if (config.color) previewContainer.setAccentColor(config.color);
        previewContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${config.title || 'Приветствие'}`));
        previewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        if (isValidUrl(config.thumbnailUrl)) {
          const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(config.description || 'Описание не задано.'))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(config.thumbnailUrl));
          previewContainer.addSectionComponents(section);
        } else {
          previewContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(config.description || 'Описание не задано.'));
        }

        if (isValidUrl(config.imageUrl)) {
          previewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
          previewContainer.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.imageUrl)));
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`welcome_field_select_${originalUserId}`)
          .setPlaceholder('Выберите поле для настройки')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Заголовок').setDescription('Задать заголовок контейнера').setValue('title'),
            new StringSelectMenuOptionBuilder().setLabel('Описание').setDescription('Задать описание контейнера').setValue('description'),
            new StringSelectMenuOptionBuilder().setLabel('Цвет').setDescription('Задать цвет акцента (hex-код)').setValue('color'),
            new StringSelectMenuOptionBuilder().setLabel('Миниатюра').setDescription('Задать URL миниатюры').setValue('thumbnail'),
            new StringSelectMenuOptionBuilder().setLabel('Изображение').setDescription('Задать URL основного изображения').setValue('image')
          );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`welcome_submit_${originalUserId}`).setLabel('Отправить').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('welcome_variables').setLabel('Переменные').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`welcome_cancel_${originalUserId}`).setLabel('Отмена').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ components: [previewContainer, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
      } else {
        const modal = new ModalBuilder()
          .setCustomId(`welcome_field_color_${originalUserId}`)
          .setTitle('Задать цвет');
        const input = new TextInputBuilder()
          .setCustomId('welcome_color')
          .setLabel('Hex-код цвета')
          .setPlaceholder('#5865F2 or 5865F2')
          .setStyle(TextInputStyle.Short)
          .setMinLength(6)
          .setMaxLength(7)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id.startsWith('welcome_channel_simple_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Выберите корректный канал.'));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      await WelcomeConfig.upsert({ guildId: interaction.guild.id, channelId: selectedChannel.id, type: 'simple' });

      const modal = new ModalBuilder().setCustomId('welcome_simple_message').setTitle('Приветственное сообщение');
      const messageInput = new TextInputBuilder()
        .setCustomId('welcome_message')
        .setLabel('Приветственное сообщение')
        .setPlaceholder('Добро пожаловать на сервер, {mention}! Ты участник №{count}.')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

      return interaction.showModal(modal);
    }

    if (id.startsWith('welcome_channel_container_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Выберите корректный канал.'));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      await WelcomeConfig.upsert({ guildId: interaction.guild.id, channelId: selectedChannel.id, type: 'container' });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Настройка приветствия — контейнер'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Настройте эмбед приветствия, используйте переменные при необходимости.'));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`welcome_field_select_${originalUserId}`)
        .setPlaceholder('Выберите поле для настройки')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Заголовок').setDescription('Задать заголовок контейнера').setValue('title'),
          new StringSelectMenuOptionBuilder().setLabel('Описание').setDescription('Задать описание контейнера').setValue('description'),
          new StringSelectMenuOptionBuilder().setLabel('Цвет').setDescription('Задать цвет акцента (hex-код)').setValue('color'),
          new StringSelectMenuOptionBuilder().setLabel('Миниатюра').setDescription('Задать URL миниатюры').setValue('thumbnail'),
          new StringSelectMenuOptionBuilder().setLabel('Изображение').setDescription('Задать URL основного изображения').setValue('image')
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`welcome_submit_${originalUserId}`).setLabel('Отправить').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('welcome_variables').setLabel('Переменные').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cancel_${originalUserId}`).setLabel('Отмена').setStyle(ButtonStyle.Danger)
      );

      return interaction.update({ components: [container, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
    }
  }

  return false;
}

module.exports = { handle };
