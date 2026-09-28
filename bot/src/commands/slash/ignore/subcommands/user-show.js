
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { getAllIgnoredUsers } = require('../../../../data/ignoreDb');

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

    const users = getAllIgnoredUsers(interaction.guild.id);

    if (!users || users.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Игнорируемые пользователи**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('На этом сервере сейчас нет игнорируемых пользователей.')
        );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const userList = users.map(u => `<@${u.user_id}>`).join('\n');

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Игнорируемые пользователи**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(userList)
    );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
