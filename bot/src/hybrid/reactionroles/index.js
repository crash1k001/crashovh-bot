
const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('Настроить и управлять ролями по реакции на сервере')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Запустить мастер настройки ролей по реакции')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Удалить существующее сообщение с ролями по реакции')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('ID сообщения с ролями по реакции')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const setupModule = require('./subcommands/setup');
      await setupModule.execute(interaction);
    } else if (subcommand === 'remove') {
      const messageId = interaction.options.getString('message_id');
      const ReactionRoles = require('../../data/models/ReactionRoles');

      const config = await ReactionRoles.findOne({
        where: { messageId, guildId: interaction.guild.id }
      });

      if (!config) {
        const notFoundContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Не найдено')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Сообщение с ролями по реакции не найдено!')
          );
        return interaction.reply({
          components: [notFoundContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      try {
        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (channel) {
          await channel.messages.delete(messageId);
        }
      } catch (error) {
        console.error('Error deleting reaction roles message:', error);
      }

      await ReactionRoles.destroy({
        where: { messageId, guildId: interaction.guild.id }
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### ✅ Удалено')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Сообщение с ролями по реакции удалено.')
        );
      return interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
};
