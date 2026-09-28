/* The bot's own white drawn emojis (bot/src/emojis.json) — exposed to the
 * dashboard as CDN URLs. The IDs below are synced from bot/src/emojis.json
 * (which bot/src/lib/emojiSync.js rewrites with the emoji IDs owned by THIS
 * application), so the dashboard and Discord commands show the same emojis.
 *
 * If the bot is offline these images still load from Discord's CDN.
 * `NikoEmoji` falls back to a plain unicode emoji on error, so the UI never
 * shows a broken image. */
export const EMOJI_IDS = {
  gift: "1553666425518952448",
  tick: "1553666456401608704",
  cross: "1553666414928338954",
  dots: "1553666419345072218",
  info: "1553666467881422848",
  warning: "1553666375946600468",
  music: "1553666468766294146",
  people: "1553666444791779448",
  house: "1553666373966897212",
  trophy: "1553666458423394385",
  target: "1553666454333689876",
  clipboard: "1553666413477232702",
  key: "1553666433807028244",
  heart: "1553666427842723860",
  games: "1553666424629895219",
  filter: "1553666422205583460",
  arrow: "1553666378995867649",
  hourglass: "1553666372964327516",
  question: "1553666450647027722",
  masks: "1553666437598683186",
  tv: "1553666374570606625",
  pencil: "1553666443751723058",
  chart: "1553666466140921916",
  online: "1553666442275197058",
} as const;

export type NikoEmojiName = keyof typeof EMOJI_IDS;

export function nikoEmojiUrl(name: NikoEmojiName): string {
  return `https://cdn.discordapp.com/emojis/${EMOJI_IDS[name]}.png?size=64&quality=lossless`;
}

/* Component-style helper is intentionally NOT here (this is a .ts module);
 * see <NikoEmoji /> in components/shared.tsx. */
