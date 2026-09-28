
const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const ReactionRoles = require('../../../data/models/ReactionRoles');

module.exports = {
  name: 'reactionroles',
  description: 'Настроить и управлять ролями по реакции',
  
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      const noPermContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Недостаточно прав')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Вам нужно право **Управление сервером**, чтобы использовать эту команду.')
        );
      return interaction.reply({
        components: [noPermContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    
    if (!interaction.client.reactionRolesSetup) {
      interaction.client.reactionRolesSetup = new Map();
    }

    await this.step1(interaction);
  },

  async step1(interaction) {
    const userId = interaction.user?.id ?? interaction.author?.id;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Настройка ролей по реакции — шаг 1')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Выберите канал, куда будет отправлено сообщение с ролями по реакции:')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(`rr_channel_select_${userId}`)
            .setPlaceholder('Выберите текстовый канал')
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1)
        )
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async step2(interaction, channelId) {
    
    if (!interaction.client.reactionRolesSetup) {
      interaction.client.reactionRolesSetup = new Map();
    }

    interaction.client.reactionRolesSetup.set(interaction.user.id, {
      guildId: interaction.guild.id,
      channelId: channelId,
      emojiRolePairs: []
    });

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Настройка ролей по реакции — шаг 2')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Настройте сообщение:**\n\nНажмите "Добавить пару", чтобы добавить пары эмодзи-роль, или "Продолжить" для перехода к проверке.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_add_pair_${interaction.user.id}`)
            .setLabel('Добавить пару')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`rr_step2_continue_${interaction.user.id}`)
            .setLabel('Продолжить')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rr_setup_cancel`)
            .setLabel('Отмена')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async step3(interaction) {
    
    if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
      return interaction.reply({
        content: 'Сессия истекла. Выполните `/reactionroles setup` заново.',
        flags: MessageFlags.Ephemeral
      });
    }

    const session = interaction.client.reactionRolesSetup.get(interaction.user.id);

    if (session.emojiRolePairs.length === 0) {
      return interaction.reply({
        content: 'Добавьте хотя бы одну пару эмодзи-роль!',
        flags: MessageFlags.Ephemeral
      });
    }

    
    let pairsSummary = '';
    for (const pair of session.emojiRolePairs) {
      pairsSummary += `${pair.emoji} → <@&${pair.roleId}>\n`;
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Настройка ролей по реакции — шаг 3')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Канал:** <#${session.channelId}>\n\n` +
          `**Пары эмодзи-роль:**\n${pairsSummary}\n\n` +
          `Проверьте настройки и подтвердите отправку сообщения.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_setup_confirm_${interaction.user.id}`)
            .setLabel('Подтвердить и отправить')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rr_setup_back_${interaction.user.id}`)
            .setLabel('Назад')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rr_setup_cancel`)
            .setLabel('Отмена')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
