
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { getNekoGif, hasNekoEndpoint } = require("./nekoHelper");
const { getRandomTenorGif } = require("./gifHelper");

const roleplayActions = {
  hug: {
    title: "Объятия",
    nekoAction: "hug",
    tenorSearch: "anime hug",
    message: (actor, target) => `**${actor.username}** дарит **${target.username}** тёплые объятия`,
    buttonLabel: "Обнять в ответ",
    buttonStyle: ButtonStyle.Primary
  },
  pat: {
    title: "Поглаживание",
    nekoAction: "pat",
    tenorSearch: "anime pat head",
    message: (actor, target) => `**${actor.username}** гладит **${target.username}** по голове`,
    buttonLabel: "Погладить в ответ",
    buttonStyle: ButtonStyle.Primary
  },
  kiss: {
    title: "Поцелуй",
    nekoAction: "kiss",
    tenorSearch: "anime kiss",
    message: (actor, target) => `**${actor.username}** целует **${target.username}**`,
    buttonLabel: "Поцеловать в ответ",
    buttonStyle: ButtonStyle.Danger
  },
  slap: {
    title: "Пощёчина",
    nekoAction: "slap",
    tenorSearch: "anime slap",
    message: (actor, target) => `**${actor.username}** даёт пощёчину **${target.username}**`,
    buttonLabel: "Ответить пощёчиной",
    buttonStyle: ButtonStyle.Danger
  },
  poke: {
    title: "Тык",
    nekoAction: "poke",
    tenorSearch: "anime poke",
    message: (actor, target) => `**${actor.username}** тыкает **${target.username}**`,
    buttonLabel: "Ткнуть в ответ",
    buttonStyle: ButtonStyle.Primary
  },
  tickle: {
    title: "Щекотка",
    nekoAction: "tickle",
    tenorSearch: "anime tickle",
    message: (actor, target) => `**${actor.username}** щекочет **${target.username}**`,
    buttonLabel: "Пощекотать в ответ",
    buttonStyle: ButtonStyle.Primary
  },
  kill: {
    title: "Убийство",
    nekoAction: "kill",
    tenorSearch: "anime kill",
    message: (actor, target) => `**${actor.username}** устраняет **${target.username}**`,
    buttonLabel: "Дать отпор",
    buttonStyle: ButtonStyle.Danger
  },
  lick: {
    title: "Лизь",
    nekoAction: null,
    tenorSearch: "anime lick",
    message: (actor, target) => `**${actor.username}** лижет **${target.username}**`,
    buttonLabel: "Лизнуть в ответ",
    buttonStyle: ButtonStyle.Primary
  },
  deathstare: {
    title: "Испепеляющий взгляд",
    nekoAction: "deathstare",
    tenorSearch: "anime death stare",
    message: (actor, target) => `**${actor.username}** бросает на **${target.username}** смертоносный взгляд`,
    buttonLabel: "Ответить взглядом",
    buttonStyle: ButtonStyle.Danger
  }
};

async function buildRoleplayResponse(action, actor, target, includeButton = true) {
  const actionConfig = roleplayActions[action];
  if (!actionConfig) {
    console.error(`Unknown roleplay action: ${action}`);
    return null;
  }

  try {
    let gifUrl;
    if (actionConfig.nekoAction && hasNekoEndpoint(actionConfig.nekoAction)) {
      gifUrl = await getNekoGif(actionConfig.nekoAction);
    } else {
      gifUrl = await getRandomTenorGif(actionConfig.tenorSearch);
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${actionConfig.title}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

    if (gifUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
          new MediaGalleryItemBuilder().setURL(gifUrl)
        ])
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(actionConfig.message(actor, target))
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (includeButton) {
      const respondButton = new ButtonBuilder()
        .setCustomId(`${action}_back_${actor.id}_${target.id}`)
        .setLabel(actionConfig.buttonLabel)
        .setStyle(actionConfig.buttonStyle);

      const buttonRow = new ActionRowBuilder().addComponents(respondButton);
      container.addActionRowComponents(buttonRow);
    }

    return container;
  } catch (error) {
    console.error(`Error building roleplay response for ${action}:`, error);
    return null;
  }
}

module.exports = { buildRoleplayResponse, roleplayActions };
