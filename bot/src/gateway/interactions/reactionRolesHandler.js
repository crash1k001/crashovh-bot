
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const ReactionRoles = require('../../data/models/ReactionRoles');
const setupModule = require('../../hybrid/reactionroles/subcommands/setup');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('rr_add_pair_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Это может использовать только автор команды!',
          flags: MessageFlags.Ephemeral
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`rr_add_pair_modal_${originalUserId}`)
        .setTitle('Добавить пару эмодзи-роль');

      const emojiInput = new TextInputBuilder()
        .setCustomId('rr_emoji')
        .setLabel('Эмодзи')
        .setPlaceholder('⚽')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true);

      const roleInput = new TextInputBuilder()
        .setCustomId('rr_role_id')
        .setLabel('ID роли')
        .setPlaceholder('123456789')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true);

      const roleLabel = new TextInputBuilder()
        .setCustomId('rr_role_label')
        .setLabel('Название роли (опционально)')
        .setPlaceholder('Фанат футбола')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(50)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(emojiInput),
        new ActionRowBuilder().addComponents(roleInput),
        new ActionRowBuilder().addComponents(roleLabel)
      );

      return interaction.showModal(modal);
    }

    if (id.startsWith('rr_step2_continue_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Это может использовать только автор команды!',
          flags: MessageFlags.Ephemeral
        });
      }

      await setupModule.step3(interaction);
      return true;
    }

    if (id.startsWith('rr_setup_confirm_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Это может использовать только автор команды!',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Сессия истекла. Выполните `/reactionroles setup` заново.',
          flags: MessageFlags.Ephemeral
        });
      }

      const session = interaction.client.reactionRolesSetup.get(interaction.user.id);

      const channel = interaction.guild.channels.cache.get(session.channelId);
      if (!channel) {
        return interaction.reply({
          content: 'Канал не найден!',
          flags: MessageFlags.Ephemeral
        });
      }

      let pairsText = '';
      for (const pair of session.emojiRolePairs) {
        const label = pair.roleLabel || `<@&${pair.roleId}>`;
        pairsText += `${pair.emoji} → ${label}\n`;
      }

      const rrContainer = new ContainerBuilder().setAccentColor(0x5B92D3)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Роли по реакции')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Отреагируй на это сообщение, чтобы получить роль!\n\n**Доступные роли:**\n${pairsText}`
          )
        );

      try {
        const postedMessage = await channel.send({
          components: [rrContainer],
          flags: MessageFlags.IsComponentsV2
        });

        await ReactionRoles.create({
          guildId: interaction.guild.id,
          messageId: postedMessage.id,
          channelId: session.channelId,
          embedTitle: 'Роли по реакции',
          embedDescription: 'Отреагируй, чтобы получить роль!',
          embedColor: 0x5B92D3,
          emojiRolePairs: session.emojiRolePairs,
          enabled: true
        });

        for (const pair of session.emojiRolePairs) {
          try {
            await postedMessage.react(pair.emoji);
          } catch (error) {
            console.error(`Failed to add reaction ${pair.emoji}:`, error);
          }
        }

        interaction.client.reactionRolesSetup.delete(interaction.user.id);

        const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### ✅ Роли по реакции созданы!')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Канал:** <#${session.channelId}>\n` +
              `**ID сообщения:** ${postedMessage.id}\n\n` +
              `Роли по реакции теперь активны! Участники могут реагировать, чтобы получить роль.`
            )
          );

        return interaction.update({
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Error creating reaction roles:', error);
        return interaction.reply({
          content: 'Не удалось создать сообщение с ролями по реакции!',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (id.startsWith('rr_setup_back_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Это может использовать только автор команды!',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Сессия истекла. Выполните `/reactionroles setup` заново.',
          flags: MessageFlags.Ephemeral
        });
      }

      const session = interaction.client.reactionRolesSetup.get(interaction.user.id);
      await setupModule.step2(interaction, session.channelId);
      return true;
    }

    if (id === 'rr_setup_cancel') {
      if (interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        interaction.client.reactionRolesSetup.delete(interaction.user.id);
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройка ролей по реакции отменена')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройка отменена.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isModalSubmit()) {
    if (id.startsWith('rr_add_pair_modal_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Это может использовать только автор команды!',
          flags: MessageFlags.Ephemeral
        });
      }

      const emoji = interaction.fields.getTextInputValue('rr_emoji');
      const roleId = interaction.fields.getTextInputValue('rr_role_id');
      const roleLabel = interaction.fields.getTextInputValue('rr_role_label') || null;

      try {
        const role = await interaction.guild.roles.fetch(roleId);
        if (!role) {
          return interaction.reply({
            content: `Роль <@&${roleId}> не найдена!`,
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (error) {
        return interaction.reply({
          content: `Некорректный ID роли: ${roleId}`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Сессия истекла. Выполните `/reactionroles setup` заново.',
          flags: MessageFlags.Ephemeral
        });
      }

      const session = interaction.client.reactionRolesSetup.get(interaction.user.id);

      session.emojiRolePairs.push({ emoji, roleId, roleLabel });

      let pairsSummary = '';
      for (const pair of session.emojiRolePairs) {
        const label = pair.roleLabel || `<@&${pair.roleId}>`;
        pairsSummary += `${pair.emoji} → ${label}\n`;
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройка ролей по реакции — шаг 2')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Текущие пары (${session.emojiRolePairs.length}):**\n${pairsSummary}\n` +
            `Добавьте ещё пары или нажмите **Продолжить** для перехода к проверке.`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`rr_add_pair_${interaction.user.id}`)
              .setLabel('Добавить ещё')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`rr_step2_continue_${interaction.user.id}`)
              .setLabel('Продолжить')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('rr_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Danger)
          )
        );

      await interaction.deferUpdate();
      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id.startsWith('rr_channel_select_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Это может использовать только автор команды!',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        return interaction.reply({
          content: 'Канал не выбран!',
          flags: MessageFlags.Ephemeral
        });
      }

      await setupModule.step2(interaction, selectedChannel.id);
      return true;
    }
  }

  return false;
}

module.exports = { handle };
