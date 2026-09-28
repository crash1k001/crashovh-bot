
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const VoiceControlView = require('../../lib/j2cView');
const { J2CConfig } = require('../../data/models');
const j2cSetupModule = require('../../hybrid/j2c/subcommands/setup');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('j2c_')) {
      await VoiceControlView.handleButton(interaction);
      return true;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'j2c_dc_select') {
      const selectedUserId = interaction.values[0];
      const member = interaction.guild.members.cache.get(selectedUserId);

      if (!member) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Участник не найден!")
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      if (!member.voice.channel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Участник не в голосовом канале!")
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await member.voice.disconnect();
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${member.displayName} успешно отключён`)
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Не удалось отключить участника.")
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'j2c_setup_text') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Выберите корректный канал.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      interaction.client._j2cSetup = interaction.client._j2cSetup || {};
      interaction.client._j2cSetup[interaction.user.id] = {
        textChannelId: selectedChannel.id
      };

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка Join2Create\n**Шаг 2 из 3**')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Канал панели управления: <#${selectedChannel.id}>\n\nТеперь выберите **голосовой канал**, зайдя в который пользователи будут создавать временный канал:`)
        )
        .addActionRowComponents(
          new ActionRowBuilder()
            .addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId('j2c_setup_voice')
                .setPlaceholder('Выберите триггерный голосовой канал J2C')
                .setChannelTypes(ChannelType.GuildVoice)
            )
        );

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    if (id === 'j2c_setup_voice') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Выберите корректный канал.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      const setupData = interaction.client._j2cSetup?.[interaction.user.id];
      if (!setupData) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Сессия настройки истекла. Выполните `/j2c setup` заново.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      setupData.voiceChannelId = selectedChannel.id;

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка Join2Create\n**Шаг 3 из 3**')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Панель управления: <#${setupData.textChannelId}>\nТриггерный канал: <#${selectedChannel.id}>\n\nТеперь выберите **категорию**, где будут создаваться временные каналы:`)
        )
        .addActionRowComponents(
          new ActionRowBuilder()
            .addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId('j2c_setup_category')
                .setPlaceholder('Выберите категорию для временных каналов')
                .setChannelTypes(ChannelType.GuildCategory)
            )
        );

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    if (id === 'j2c_setup_category') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Выберите корректную категорию.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      const setupData = interaction.client._j2cSetup?.[interaction.user.id];
      if (!setupData || !setupData.textChannelId || !setupData.voiceChannelId) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Сессия настройки истекла. Выполните `/j2c setup` заново.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await J2CConfig.upsert({
          guildId: interaction.guild.id,
          textChannelId: setupData.textChannelId,
          voiceChannelId: setupData.voiceChannelId,
          categoryId: selectedChannel.id
        });

        const textChannel = interaction.guild.channels.cache.get(setupData.textChannelId);
        if (textChannel) {
          await j2cSetupModule.sendControlPanel(textChannel);
        }

        delete interaction.client._j2cSetup[interaction.user.id];

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Настройка Join2Create завершена')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Панель управления:** <#${setupData.textChannelId}>\n` +
              `**Триггерный канал:** <#${setupData.voiceChannelId}>\n` +
              `**Категория:** <#${selectedChannel.id}>\n\n` +
              'Панель управления опубликована. Теперь пользователи могут заходить в триггерный канал, чтобы создавать временные каналы!'
            )
          );

        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Error saving J2C config:', error);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Не удалось сохранить настройки J2C. Попробуйте ещё раз.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  return false;
}

module.exports = { handle };
