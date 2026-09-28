
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { removeIgnoredUser, getIgnoredUser } = require('../../../../data/ignoreDb');

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

    const existing = getIgnoredUser(interaction.guild.id, user.id);
    if (!existing) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Не найдено**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${user} не в списке игнорируемых пользователей.`)
        );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    try {
      removeIgnoredUser(interaction.guild.id, user.id);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Готово**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${user} успешно убран из списка игнорируемых пользователей.`
        )
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error('Error removing ignored user:', error);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Ошибка**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Не удалось убрать пользователя из списка игнорируемых. Попробуйте ещё раз.')
        );
      
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
};
