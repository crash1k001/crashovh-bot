
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
const emojis = require('../../../emojis.json');

function parseTime(timeStr) {
  const units = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  try {
    if (typeof timeStr !== 'string' || timeStr.length < 2) return 0;
    const unit = timeStr.slice(-1).toLowerCase();
    const value = parseInt(timeStr.slice(0, -1), 10);
    // NaN guard: parseInt('h') === NaN, and NaN * anything stays NaN —
    // which used to bypass the `<= 0` check below and crash PostgreSQL
    // with `invalid input syntax for type bigint: "NaN"`.
    if (!Number.isFinite(value) || value <= 0) return 0;
    const mult = units[unit];
    if (!mult) return 0;
    return value * mult;
  } catch {
    return 0;
  }
}

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;
    const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;

    if (!member.permissions.has('ManageGuild')) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Отказано в доступе**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Вам нужно право `Управление сервером`, чтобы начинать розыгрыши!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    let timeStr, winnersCount, prize, targetChannel = null;

    if (isSlash) {
      timeStr = interactionOrMessage.options.getString('duration');
      winnersCount = interactionOrMessage.options.getInteger('winners');
      prize = interactionOrMessage.options.getString('prize');
      targetChannel = interactionOrMessage.options.getChannel('channel') ?? null;
    } else {
      if (args.length < 3) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Некорректное использование**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Использование: `gstart <время> <победители> <приз>`\nПример: `gstart 1h 2 Discord Nitro`')
        );

        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      timeStr = args[0];
      winnersCount = parseInt(args[1]);
      prize = args.slice(2).join(' ');
    }

    const seconds = parseTime(timeStr);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Некорректное время**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Используйте формат: `1s`, `1m`, `1h` или `1d`')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (!Number.isFinite(Number(winnersCount)) || Number(winnersCount) < 1) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Некорректное число победителей**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Должен быть хотя бы 1 победитель!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    winnersCount = Math.floor(Number(winnersCount));

    const endTime = Math.floor(Date.now() / 1000) + seconds;

    /* Respect an explicit --channel: fall back to the command's channel.
     * Same channel-resolution logic as before for prefix usage. */
    const postChannel = targetChannel && targetChannel.guild && typeof targetChannel.send === 'function'
      ? targetChannel
      : interactionOrMessage.channel;

    const giveaway = await Giveaway.create({
      guildId: interactionOrMessage.guild.id,
      channelId: postChannel.id,
      hostId: user.id,
      prize: prize,
      winners: winnersCount,
      endTime: endTime,
      ended: false
    });

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **${prize}** ${emojis.gift || '🎁'}`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emojis.dots || ''} **Победителей:** ${winnersCount}\n` +
        `${emojis.dots || ''} **Окончание:** <t:${endTime}:R>\n` +
        `${emojis.dots || ''} **Организатор:** <@${user.id}>`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const enterButton = new ButtonBuilder()
      .setLabel('Участвовать')
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`giveaway_enter_${giveaway.id}`);

    const viewParticipantsButton = new ButtonBuilder()
      .setLabel('Участники')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(`giveaway_participants_${giveaway.id}`);

    const buttonRow = new ActionRowBuilder().addComponents(enterButton, viewParticipantsButton);
    container.addActionRowComponents(buttonRow);

    const giveawayMsg = await postChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    await giveaway.update({ messageId: giveawayMsg.id });

    const confirmContainer = new ContainerBuilder().setAccentColor(0x2B2D31);
    confirmContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Розыгрыш начат**')
    );
    confirmContainer.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    confirmContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Ваш розыгрыш успешно начат!')
    );

    const confirmMsg = await interactionOrMessage.reply({
      components: [confirmContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });

    if (!isSlash && confirmMsg) {
      setTimeout(() => {
        confirmMsg.delete().catch(() => {});
      }, 5000);
    }
  }
};
