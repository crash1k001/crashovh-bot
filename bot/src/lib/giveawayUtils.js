
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
const Giveaway = require('../data/models/Giveaway');
const GiveawayEntry = require('../data/models/GiveawayEntry');
const emojis = require('../emojis.json');

let isChecking = false;

async function endGiveaway(client, giveaway) {
  try {
    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const entries = await GiveawayEntry.findAll({
      where: { giveawayId: giveaway.id }
    });

    if (!entries || entries.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **${giveaway.prize}** ${emojis.gift || '🎁'}`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.dots || ''} **Победители:** Нет участников\n` +
          `${emojis.dots || ''} **Завершён:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
          `${emojis.dots || ''} **Организатор:** <@${giveaway.hostId}>\n\n` +
          `**Розыгрыш завершён!**`
        )
      );

      try {
        const msg = await channel.messages.fetch(giveaway.messageId);
        await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (e) {
        console.error('Не удалось обновить сообщение розыгрыша:', e);
      }
      return;
    }

    const winnerCount = Math.min(giveaway.winners, entries.length);
    const winners = [];
    const availableEntries = [...entries];

    for (let i = 0; i < winnerCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableEntries.length);
      winners.push(availableEntries.splice(randomIndex, 1)[0]);
    }

    const winnerMentions = winners.map(w => `<@${w.userId}>`);

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **${giveaway.prize}** ${emojis.gift || '🎁'}`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emojis.dots || ''} **Победители:** ${winnerMentions.join(', ')}\n` +
        `${emojis.dots || ''} **Завершён:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
        `${emojis.dots || ''} **Организатор:** <@${giveaway.hostId}>\n\n` +
        `**Розыгрыш завершён!**`
      )
    );

    let giveawayMsg = null;
    try {
      giveawayMsg = await channel.messages.fetch(giveaway.messageId);
      await giveawayMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {
      console.error('Не удалось обновить сообщение розыгрыша:', e);
    }

    const channelContainer = new ContainerBuilder().setAccentColor(0x2B2D31);
    channelContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emojis.giveawayyes} Поздравляем! ${winnerMentions.join(', ')}, вы выиграли **${giveaway.prize}** ${emojis.heart || '❤️'}, организатор — <@${giveaway.hostId}>`
      )
    );

    if (giveawayMsg) {
      channelContainer.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Ссылка на розыгрыш').setStyle(ButtonStyle.Link).setURL(giveawayMsg.url)
        )
      );
    }

    await channel.send({
      components: [channelContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: winners.map(w => w.userId) }
    });

    await Promise.all(winners.map(async (winner) => {
      try {
        const user = await client.users.fetch(winner.userId);
        const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31);
        dmContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.giveawayyes} Ты выиграл(а) **${giveaway.prize}** на сервере **${guild.name}** ${emojis.heart || '❤️'}`)
        );

        if (giveawayMsg) {
          dmContainer.addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setLabel('Смотреть сообщение').setStyle(ButtonStyle.Link).setURL(giveawayMsg.url)
            )
          );
        }

        await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
      } catch (e) {
        console.error(`Не удалось отправить ЛС победителю ${winner.userId}:`, e);
      }
    }));
  } catch (e) {
    console.error('Ошибка завершения розыгрыша:', e);
  }
}

async function checkGiveaways(client) {
  if (isChecking) return;
  isChecking = true;
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiredGiveaways = await Giveaway.findAll({
      where: {
        ended: false,
        endTime: { [require('sequelize').Op.lte]: now }
      }
    });

    if (expiredGiveaways.length === 0) return;

    await Promise.all(expiredGiveaways.map(async (giveaway) => {
      await endGiveaway(client, giveaway);
      await giveaway.update({ ended: true });
    }));
  } finally {
    isChecking = false;
  }
}

module.exports = {
  endGiveaway,
  checkGiveaways
};
