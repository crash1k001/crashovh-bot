
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const Giveaway = require('../../../data/models/Giveaway');
const GiveawayEntry = require('../../../data/models/GiveawayEntry');
const emojis = require('../../../emojis.json');

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
        new TextDisplayBuilder().setContent('Вам нужно право `Управление сервером`, чтобы перевыбирать победителей!')
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
        ended: true
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
        new TextDisplayBuilder().setContent('Завершённый розыгрыш для этого сообщения не найден!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const entries = await GiveawayEntry.findAll({
      where: { giveawayId: giveaway.id }
    });

    if (!entries || entries.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Нет участников**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Не найдено участников для перевыбора!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const winnerCount = Math.min(giveaway.winners, entries.length);
    const winners = [];
    const availableEntries = [...entries];

    for (let i = 0; i < winnerCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableEntries.length);
      winners.push(availableEntries.splice(randomIndex, 1)[0]);
    }

    const winnerLinks = [];
    for (const winner of winners) {
      try {
        const user = await interactionOrMessage.client.users.fetch(winner.userId);
        winnerLinks.push(`<@${user.id}>`);
      } catch {
        winnerLinks.push(`<@${winner.userId}>`);
      }
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **Новые победители!** ${emojis.gift || '🎁'}`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Приз:** ${giveaway.prize}\n` +
        `**Новые победители:** ${winnerLinks.join(', ')}\n\n` +
        `${emojis.giveawayyes} Поздравляем! 🎊`
      )
    );

    const giveawayMessage = await interactionOrMessage.channel.messages.fetch(targetMessageId).catch(() => null);

    if (giveawayMessage) {
      const giveawayLinkButton = new ButtonBuilder()
        .setLabel('Ссылка на розыгрыш')
        .setStyle(ButtonStyle.Link)
        .setURL(giveawayMessage.url);

      const buttonRow = new ActionRowBuilder().addComponents(giveawayLinkButton);
      container.addActionRowComponents(buttonRow);
    }

    await interactionOrMessage.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: winners.map(w => w.userId) }
    });

    await interactionOrMessage.reply({
      components: [new ContainerBuilder().setAccentColor(0x2B2D31).addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Перевыбор завершён**')
      ).addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Новые победители выбраны!')
      )],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });

    for (const winner of winners) {
      try {
        const user = await interactionOrMessage.client.users.fetch(winner.userId);
        const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31);
        dmContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.giveawayyes} Ты выиграл(а) **${giveaway.prize}** на сервере **${interactionOrMessage.guild.name}** ${emojis.heart || '❤️'}`)
        );

        if (giveawayMessage) {
          const jumpButton = new ButtonBuilder()
            .setLabel('Смотреть сообщение')
            .setStyle(ButtonStyle.Link)
            .setURL(giveawayMessage.url);

          const buttonRow = new ActionRowBuilder().addComponents(jumpButton);
          dmContainer.addActionRowComponents(buttonRow);
        }

        await user.send({
          components: [dmContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (e) {
        console.error(`Не удалось отправить ЛС победителю перевыбора ${winner.userId}:`, e);
      }
    }
  }
};
