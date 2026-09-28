
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const Giveaway = require('../../../data/models/Giveaway');
const { endGiveaway } = require('../../../lib/giveawayUtils');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;

    if (!member.permissions.has('ManageGuild')) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Отказано в доступе**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Вам нужно право `Управление сервером`, чтобы завершать розыгрыши!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    let targetMessageId;

    if (isSlash) {
      targetMessageId = interactionOrMessage.options.getString('message_id');
    } else {
      if (interactionOrMessage.reference?.messageId) {
        targetMessageId = interactionOrMessage.reference.messageId;
      } else if (args[0]) {
        targetMessageId = args[0];
      } else {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Сообщение не найдено**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Ответьте на сообщение розыгрыша или укажите его ID!')
        );

        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }

    const giveaway = await Giveaway.findOne({
      where: {
        messageId: targetMessageId,
        ended: false
      }
    });

    if (!giveaway) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Не найдено**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Активный розыгрыш для этого сообщения не найден!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    await endGiveaway(interactionOrMessage.client, giveaway);
    await giveaway.update({ ended: true });

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Розыгрыш завершён**')
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Розыгрыш успешно завершён!')
    );

    return interactionOrMessage.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
};
