
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const Giveaway = require('../../data/models/Giveaway');
const GiveawayEntry = require('../../data/models/GiveawayEntry');
const emojis = require('../../emojis.json');
const { createPaginationSession } = require('../../lib/pagination');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('giveaway_enter_')) {
      const giveawayId = parseInt(id.replace('giveaway_enter_', ''));
      const giveaway = await Giveaway.findByPk(giveawayId);

      if (!giveaway || giveaway.ended) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Розыгрыш завершён**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Этот розыгрыш уже завершён!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const existingEntry = await GiveawayEntry.findOne({
        where: {
          giveawayId: giveaway.id,
          userId: interaction.user.id
        }
      });

      if (existingEntry) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Вы уже участвуете**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Вы уже участвуете в этом розыгрыше!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      await GiveawayEntry.create({
        giveawayId: giveaway.id,
        userId: interaction.user.id
      });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Участие подтверждено**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emojis.giveawayyes} Вы успешно приняли участие в розыгрыше!`)
      );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (id.startsWith('giveaway_participants_')) {
      const giveawayId = parseInt(id.replace('giveaway_participants_', ''));
      const giveaway = await Giveaway.findByPk(giveawayId);

      if (!giveaway) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Розыгрыш не найден**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Этот розыгрыш больше не существует!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const entries = await GiveawayEntry.findAll({
        where: { giveawayId: giveaway.id }
      });

      if (entries.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Пока нет участников**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Пока никто не участвует в этом розыгрыше!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const itemsPerPage = 7;
      const pages = [];
      for (let i = 0; i < entries.length; i += itemsPerPage) {
        pages.push(entries.slice(i, i + itemsPerPage));
      }

      const paginationSession = createPaginationSession({
        interactionOrMessage: interaction,
        pages: pages,
        renderPage: (pageIndex, pageData, state) => {
          const container = new ContainerBuilder().setAccentColor(0x2B2D31);

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Участники розыгрыша [${entries.length}]**`)
          );
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );

          const participantList = pageData.map((entry, idx) => {
            const globalIdx = pageIndex * itemsPerPage + idx + 1;
            return `\`${globalIdx}.\` <@${entry.userId}>`;
          }).join('\n');

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(participantList)
          );

          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Приз:** ${giveaway.prize}\n**Всего участников:** ${entries.length}`)
          );

          return container;
        },
        userId: interaction.user.id,
        timeout: 300000,
        flags: MessageFlags.Ephemeral,
      });

      await paginationSession.renderInitial();
      return true;
    }
  }

  return false;
}

module.exports = { handle };
