
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const feedbackDb = require('../../data/feedback');

function isValidImageUrl(url) {
  if (!url || !url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'attachment:';
  } catch {
    return false;
  }
}

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === 'open_feedback_modal') {
      const modal = new ModalBuilder()
        .setCustomId('feedback_modal')
        .setTitle(`${interaction.guild.name} — Отзыв`);

      const ratingInput = new TextInputBuilder()
        .setCustomId('feedback_rating')
        .setLabel('Оцените наш сервис (1-5)')
        .setPlaceholder('Введите число от 1 до 5')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true);

      const feedbackInput = new TextInputBuilder()
        .setCustomId('feedback_text')
        .setLabel('Ваш отзыв')
        .setPlaceholder('Расскажите о своём опыте...')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setMaxLength(2000)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId('feedback_image')
        .setLabel('URL изображения (опционально)')
        .setPlaceholder('https://example.com/image.png')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ratingInput),
        new ActionRowBuilder().addComponents(feedbackInput),
        new ActionRowBuilder().addComponents(imageInput)
      );

      await interaction.showModal(modal);
      return true;
    }

    if (id === 'feedback_setup_skip_log') {
      const setupData = interaction.client._feedbackSetup?.[interaction.user.id];
      if (!setupData) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Сессия настройки истекла. Выполните `/feedback setup` заново.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await feedbackDb.setConfig(interaction.guildId, setupData.reviewChannelId, null);
        delete interaction.client._feedbackSetup[interaction.user.id];

        const reviewChannel = interaction.guild.channels.cache.get(setupData.reviewChannelId);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Настройка отзывов завершена')
          )
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Канал отзывов:** ${reviewChannel ? reviewChannel.toString() : `<#${setupData.reviewChannelId}>`}\n` +
              `**Канал логов:** Нет\n\n` +
              `Используйте \`/feedback panel\`, чтобы отправить панель отзывов в канал.`
            )
          );

        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Feedback setup error:', error);
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Не удалось сохранить настройки. Попробуйте ещё раз.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'feedback_setup_review') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Выберите корректный канал.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      interaction.client._feedbackSetup = interaction.client._feedbackSetup || {};
      interaction.client._feedbackSetup[interaction.user.id] = {
        reviewChannelId: selectedChannel.id
      };

      const skipButton = new ButtonBuilder()
        .setCustomId('feedback_setup_skip_log')
        .setLabel('Пропустить (без канала логов)')
        .setStyle(ButtonStyle.Secondary);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка системы отзывов\n**Шаг 2 из 2**')
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Канал отзывов: <#${selectedChannel.id}>\n\nВыберите **канал логов** для подробных записей отзывов или пропустите:`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('feedback_setup_log')
              .setPlaceholder('Выберите канал логов (опционально)')
              .setChannelTypes(ChannelType.GuildText)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(skipButton)
        );

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    if (id === 'feedback_setup_log') {
      const selectedChannel = interaction.channels.first();
      const setupData = interaction.client._feedbackSetup?.[interaction.user.id];

      if (!setupData) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Сессия настройки истекла. Выполните `/feedback setup` заново.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      if (!selectedChannel) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Выберите корректный канал.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await feedbackDb.setConfig(interaction.guildId, setupData.reviewChannelId, selectedChannel.id);
        delete interaction.client._feedbackSetup[interaction.user.id];

        const reviewChannel = interaction.guild.channels.cache.get(setupData.reviewChannelId);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Настройка отзывов завершена')
          )
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Канал отзывов:** ${reviewChannel ? reviewChannel.toString() : `<#${setupData.reviewChannelId}>`}\n` +
              `**Канал логов:** ${selectedChannel.toString()}\n\n` +
              `Используйте \`/feedback panel\`, чтобы отправить панель отзывов в канал.`
            )
          );

        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Feedback setup error:', error);
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Не удалось сохранить настройки. Попробуйте ещё раз.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    if (id === 'feedback_modal') {
      const rating = interaction.fields.getTextInputValue('feedback_rating');
      const feedbackText = interaction.fields.getTextInputValue('feedback_text');
      const imageUrl = interaction.fields.getTextInputValue('feedback_image');

      const ratingNum = parseInt(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return interaction.reply({
          content: 'Оценка должна быть числом от 1 до 5!',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await feedbackDb.getConfig(interaction.guildId);

      if (!config) {
        return interaction.reply({
          content: 'Система отзывов не настроена!',
          flags: MessageFlags.Ephemeral
        });
      }

      const reviewChannel = interaction.guild.channels.cache.get(config.review_channel_id);
      if (!reviewChannel) {
        return interaction.reply({
          content: 'Канал отзывов не найден!',
          flags: MessageFlags.Ephemeral
        });
      }

      const starRating = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);

      const reviewSection = new SectionBuilder();
      reviewSection.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Новый отзыв\n\n> "${feedbackText}"\n\n**Оценка:** ${starRating} (${ratingNum}/5)\n**Оставил:** ${interaction.user.username}\n**ID пользователя:** ${interaction.user.id}`)
      );
      reviewSection.setThumbnailAccessory(
        new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL())
      );

      const reviewContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addSectionComponents(reviewSection);

      if (imageUrl && isValidImageUrl(imageUrl)) {
        reviewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems([
              new MediaGalleryItemBuilder()
                .setURL(imageUrl)
                .setDescription('Прикреплённое изображение')
            ])
          );
      }

      reviewContainer
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Спасибо за отзыв! Он помогает нам стать лучше.')
        );

      const nextButton = new ButtonBuilder()
        .setCustomId('open_feedback_modal')
        .setLabel('Оставить отзыв')
        .setStyle(ButtonStyle.Primary);

      reviewContainer.addActionRowComponents(new ActionRowBuilder().addComponents(nextButton));

      try {
        await reviewChannel.send({
          components: [reviewContainer],
          flags: MessageFlags.IsComponentsV2
        });

        if (config.log_channel_id) {
          const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
          if (logChannel) {
            const logContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Новый отзыв отправлен')
              )
              .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Пользователь:** ${interaction.user.username} (${interaction.user.id})\n**Оценка:** ${starRating} (${ratingNum}/5)\n**Отзыв:** ${feedbackText}\n**Сервер:** ${interaction.guild.name}`)
              );

            await logChannel.send({
              components: [logContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }

        return interaction.reply({
          content: 'Спасибо за отзыв! Он успешно отправлен.',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error('Feedback submission error:', error);
        return interaction.reply({
          content: 'Произошла ошибка при отправке отзыва!',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }

  return false;
}

module.exports = { handle };
