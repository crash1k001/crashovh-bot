
const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');

module.exports = {
  name: 'reactionroles',
  aliases: ['rr'],
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

  async execute(interactionOrMessage, args) {
    const isSlash = typeof interactionOrMessage.isCommand === 'function' && interactionOrMessage.isCommand();

    if (isSlash) {
      const subcommand = interactionOrMessage.options.getSubcommand();

      if (subcommand === 'setup') {
        const setupModule = require('./subcommands/setup');
        return setupModule.execute(interactionOrMessage);
      } else if (subcommand === 'remove') {
        const messageId = interactionOrMessage.options.getString('message_id');
        return this._remove(interactionOrMessage, messageId);
      }
    } else {
      if (!args || !args.length) {
        return require('../../lib/helpMenu').sendHelp('reactionroles', interactionOrMessage);
      }
      const sub = args[0].toLowerCase();
      if (sub === 'setup') {
        const setupModule = require('./subcommands/setup');
        return setupModule.execute(interactionOrMessage);
      } else if (sub === 'remove') {
        const messageId = args[1];
        if (!messageId) {
          return interactionOrMessage.reply('Укажите ID сообщения. Использование: `.rr remove <ID_сообщения>`');
        }
        return this._remove(interactionOrMessage, messageId);
      } else {
        return require('../../lib/helpMenu').sendHelp('reactionroles', interactionOrMessage);
      }
    }
  },

  async _remove(ctx, messageId) {
    const ReactionRoles = require('../../data/models/ReactionRoles');
    const isSlash = typeof ctx.isCommand === 'function' && ctx.isCommand();

    const config = await ReactionRoles.findOne({
      where: { messageId, guildId: ctx.guild.id }
    });

    if (!config) {
      if (isSlash) {
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
        return ctx.reply({
          components: [notFoundContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
      return ctx.reply('Сообщение с ролями по реакции не найдено!');
    }

    try {
      const channel = ctx.guild.channels.cache.get(config.channelId);
      if (channel) {
        await channel.messages.delete(messageId);
      }
    } catch (error) {
      console.error('Error deleting reaction roles message:', error);
    }

    await ReactionRoles.destroy({
      where: { messageId, guildId: ctx.guild.id }
    });

    if (isSlash) {
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
      return ctx.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    return ctx.reply('✅ Сообщение с ролями по реакции удалено!');
  }
};
