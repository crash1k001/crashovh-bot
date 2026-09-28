
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { addIgnoredUser, getIgnoredUser, getIgnoredUsersCount } = require('../../../../data/ignoreDb');

module.exports = {
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Отказано в доступе**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Вам нужно право Администратор, чтобы использовать эту команду.')
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const user = interaction.options.getUser('user');

    const count = getIgnoredUsersCount(interaction.guild.id);
    if (count >= 30) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Лимит достигнут**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Можно добавить не более 30 пользователей в список игнорируемых.')
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const existing = getIgnoredUser(interaction.guild.id, user.id);
    if (existing) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Уже в списке**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${user} уже в списке игнорируемых пользователей.`)
        );
      const reply = await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (error) {
          console.error('[IGNORE-USER] Failed to delete reply:', error.message);
        }
      }, 2000);
      return;
    }

    try {
      addIgnoredUser(interaction.guild.id, user.id);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Готово**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${user} успешно добавлен в список игнорируемых пользователей.`
        )
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error('Error adding ignored user:', error);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Ошибка**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось добавить пользователя в список игнорируемых. Попробуйте ещё раз.')
        );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
};
