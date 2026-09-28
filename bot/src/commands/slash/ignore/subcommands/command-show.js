
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { getAllIgnoredCommands } = require('../../../../data/ignoreDb');

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

    const commands = getAllIgnoredCommands(interaction.guild.id);

    if (!commands || commands.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Игнорируемые команды**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('На этом сервере сейчас нет игнорируемых команд.')
        );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const commandList = commands.map(cmd => `\`${cmd.command_name}\``).join('\n');

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Игнорируемые команды**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(commandList)
    );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
