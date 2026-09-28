
const {
  Events,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorSpacingSize,
  MessageType,
} = require("discord.js");
const { AFK, NoPrefix, GuildPrefix, Blacklist, AutoReact, GuildConfig, DisabledCommand } = require('../data/models');
const emojis = require('../emojis.json');
const { getMediaChannel, getBypass } = require('../data/mediaDb');

const { isAiChannel } = require('../data/aiChannel');
const { filterMentions } = require('../lib/mentionFilter');
const { generateAiResponse, CASUAL_PROMPT, hasApiKey, splitMessage } = require('../lib/aiUtils');
const { isAdminLockEnabled } = require('../lib/adminLock');
const commandLockDb = require('../data/commandLock');
const config = require('../config');
const botLogger = require('../lib/botLogger');
const { checkCooldown, storePendingReply, clearPendingReply } = require('../lib/cooldown');

const aiCooldowns = new Map();
const AI_COOLDOWN_MS = 5000;

const noPrefixCache = new Map();
const aiChannelCache = new Map();
const mediaChannelCache = new Map();
const guildConfigCache = new Map();
const autoReactCache = new Map();
const afkMentionCache = new Map();
const afkAuthorCache = new Map();
/* Blacklist checks hit the DB once per user/guild, then live here for 5 min
 * (they almost never change; unban/unblacklist invalidates on demand). */
const blacklistUserCache = new Map();
const blacklistGuildCache = new Map();
const CACHE_TTL = 30000;
const BLACKLIST_TTL = 300000;

function getCached(cache, key, ttl = CACHE_TTL) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.val;
  return undefined;
}
function setCache(cache, key, val) {
  cache.set(key, { val, ts: Date.now() });
}

setInterval(() => {
  const now = Date.now();
  for (const cache of [noPrefixCache, aiChannelCache, mediaChannelCache, guildConfigCache, autoReactCache, afkMentionCache, afkAuthorCache, blacklistUserCache, blacklistGuildCache]) {
    for (const [k, v] of cache) {
      if (now - v.ts >= CACHE_TTL) cache.delete(k);
    }
  }
}, 60000);

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days > 0) parts.push(`${days} дн.`);
  if (hours % 24 > 0) parts.push(`${hours % 24} ч.`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} мин.`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60} сек.`);

  return parts.join(', ') || '0 сек.';
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) {
      botLogger.logDM(message);
      return;
    }

    if (client.dokdo) await client.dokdo.run(message);

    try {
      let guildConfig = getCached(guildConfigCache, message.guildId);
      if (guildConfig === undefined) {
        guildConfig = await GuildConfig.findOne({ where: { guildId: message.guildId }, raw: true });
        setCache(guildConfigCache, message.guildId, guildConfig);
      }
      const isEnabled = guildConfig ? guildConfig.autoreactEnabled : true;      if (isEnabled) {
          let reactions = getCached(autoReactCache, message.guildId);
        if (reactions === undefined) {
          reactions = await AutoReact.findAll({ where: { guildId: message.guildId } });
          setCache(autoReactCache, message.guildId, reactions);
        }
        const lowerContent = message.content.toLowerCase();
        const matchingEmojis = reactions
          .filter(r => lowerContent.includes(r.trigger.toLowerCase()))
          .map(r => {
            const customEmojiMatch = r.emoji.match(/<a?:.+:(\d+)>/);
            return customEmojiMatch ? customEmojiMatch[1] : r.emoji;
          });

        if (matchingEmojis.length > 0) {
          await Promise.all(
            matchingEmojis.map(emoji =>
              message.react(emoji).catch(err => {
                console.error(`[AUTOREACT] Failed to react with ${emoji}:`, err.message);
              })
            )
          );
        }
      }
    } catch (error) {
      console.error('[AUTOREACT] Error processing reactions:', error.message);
    }

    const globalPrefix = config.PREFIX;

    const cachedNoPrefix = getCached(noPrefixCache, message.author.id);
    const [serverPrefix, noPrefixFetched] = await Promise.all([
      GuildPrefix.getPrefix(message.guildId),
      cachedNoPrefix === undefined
        ? NoPrefix.isNoPrefixUser(message.author.id)
        : Promise.resolve(cachedNoPrefix)
    ]);

    let hasNoPrefix;
    if (cachedNoPrefix !== undefined) {
      hasNoPrefix = cachedNoPrefix;
    } else {
      hasNoPrefix = noPrefixFetched;
      setCache(noPrefixCache, message.author.id, hasNoPrefix);
    }

    let messageContent;
    let isMediaCommand = false;

    const mentionPrefix = `<@${client.user.id}>`;
    const mentionPrefixAlt = `<@!${client.user.id}>`;
    const startsWithMention =
      message.content.startsWith(mentionPrefix) ||
      message.content.startsWith(mentionPrefixAlt);

    let usedPrefixStr = '';
    if (serverPrefix && message.content.startsWith(serverPrefix)) {
      messageContent = message.content.slice(serverPrefix.length).trim();
      usedPrefixStr = serverPrefix;
    } else if (!serverPrefix && message.content.startsWith(globalPrefix)) {
      messageContent = message.content.slice(globalPrefix.length).trim();
      usedPrefixStr = globalPrefix;
    } else if (startsWithMention) {
      const usedMention = message.content.startsWith(mentionPrefixAlt) ? mentionPrefixAlt : mentionPrefix;
      messageContent = message.content.slice(usedMention.length).trim();
      usedPrefixStr = `@${client.user.username} `;
    } else if (hasNoPrefix) {
      messageContent = message.content.trim();
      usedPrefixStr = '';
    } else {
      messageContent = null;
    }

    // Resolve the command once — result is reused for media-channel check and dispatch
    let resolvedCmd = null;
    if (messageContent && client.prefixCommands) {
      const allWords = messageContent.split(/ +/);
      const usedPrefixFlag = (serverPrefix ? message.content.startsWith(serverPrefix) : message.content.startsWith(globalPrefix)) ||
        startsWithMention;

      for (let wordCount = Math.min(allWords.length, 3); wordCount > 0; wordCount--) {
        const potentialCommand = allWords.slice(0, wordCount).join(' ').toLowerCase();
        if (client.prefixCommands.has(potentialCommand)) {
          const command = client.prefixCommands.get(potentialCommand);
          const args = allWords.slice(wordCount);

          if (!usedPrefixFlag && potentialCommand.length <= 2 && command.name !== 'ai') {
            const restOfMessage = allWords.slice(wordCount).join(' ').toLowerCase();
            if (restOfMessage.length > 0) {
              const looksLikeArgs = /^(<@!?\d+>|\d{17,19}|--?\w+|@\w+)/.test(restOfMessage) ||
                args.length === 0;
              if (!looksLikeArgs) {
                continue;
              }
            }
          }

          resolvedCmd = { command, args, potentialCommand, usedPrefixFlag };
          break;
        }
      }
    }

    if (resolvedCmd?.command?.allowMediaChannel === true) {
      isMediaCommand = true;
    }

    if (!isMediaCommand) {
      let mediaChannelData = getCached(mediaChannelCache, message.guild.id);
      if (mediaChannelData === undefined) {
        mediaChannelData = await getMediaChannel(message.guild.id);
        setCache(mediaChannelCache, message.guild.id, mediaChannelData);
      }
      if (mediaChannelData && message.channel.id === mediaChannelData.channel_id) {
        const isBypassed = await getBypass(message.guild.id, message.author.id);

        if (!isBypassed) {
          
          const hasMedia = message.attachments.size > 0 || message.embeds.length > 0;

          if (!hasMedia) {
            try {
              await message.delete();

              const warningContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `${message.author} This channel is configured for Media only. Please send only media files.`
                  )
                );

              const warningMsg = await message.channel.send({
                components: [warningContainer],
                flags: MessageFlags.IsComponentsV2
              });
              setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
            } catch (error) {
              console.error('Error enforcing media channel:', error);
            }
            return;
          }
        }
      }
    }

    const aiCacheKey = `${message.guild.id}:${message.channel.id}`;
    let inAiChannel = getCached(aiChannelCache, aiCacheKey);
    if (inAiChannel === undefined) {
      inAiChannel = await isAiChannel(message.guild.id, message.channel.id);
      setCache(aiChannelCache, aiCacheKey, inAiChannel);
    }

    if (resolvedCmd && messageContent) {
      const firstWord = messageContent.split(/ +/)[0].toLowerCase();
      const isAiCommand = firstWord === 'ai';
      const { command, args, potentialCommand, usedPrefixFlag } = resolvedCmd;

      if (!(inAiChannel && !usedPrefixFlag && !isAiCommand && !hasNoPrefix)) {
        try {
          /* Per-guild command toggles from the dashboard (disabled_commands).
           * Resolve the canonical command name, then check the override map. */
          try {
            if (message.guild?.id) {
              const overrides = await DisabledCommand.getOverrides(message.guild.id);
              const canonical = command.name || potentialCommand;
              if (overrides.get(canonical) === false || overrides.get(potentialCommand) === false) {
                const offContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Команда отключена`))
                  .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Команда \`\`${potentialCommand}\`\` выключена на этом сервере.`));
                return message.reply({ components: [offContainer], flags: MessageFlags.IsComponentsV2 });
              }
            }
          } catch { /* DB hiccup — fail open */ }

          try {
            let userBlacklisted = getCached(blacklistUserCache, message.author.id, BLACKLIST_TTL);
            let guildBlacklisted = getCached(blacklistGuildCache, message.guildId, BLACKLIST_TTL);
            if (userBlacklisted === undefined || guildBlacklisted === undefined) {
              const fetches = await Promise.all([
                userBlacklisted === undefined
                  ? Blacklist.model.findOne({ where: { type: 'user', entityId: message.author.id } })
                  : Promise.resolve(userBlacklisted),
                guildBlacklisted === undefined
                  ? Blacklist.model.findOne({ where: { type: 'guild', entityId: message.guildId } })
                  : Promise.resolve(guildBlacklisted)
              ]);
              if (userBlacklisted === undefined) {
                userBlacklisted = fetches[0];
                setCache(blacklistUserCache, message.author.id, userBlacklisted);
              }
              if (guildBlacklisted === undefined) {
                guildBlacklisted = fetches[1];
                setCache(blacklistGuildCache, message.guildId, guildBlacklisted);
              }
            }

            if (userBlacklisted) {
              const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('### Вы в чёрном списке')
                )
                .addSeparatorComponents(
                  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('Вам ограничен доступ к использованию этого бота.')
                );
              return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (guildBlacklisted) {
              const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('### Сервер в чёрном списке')
                )
                .addSeparatorComponents(
                  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('На этом сервере ограничено использование бота.')
                );
              return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
          } catch (err) {
            console.error('[BLACKLIST] Error:', err.message);
          }

          if (command.ownerOnly && message.author.id !== config.OWNER_ID) {
            return message.reply('❌ Эта команда доступна только владельцу бота.');
          }

          if (isAdminLockEnabled() && message.author.id !== config.OWNER_ID) {              const lockContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('### Команды заблокированы владельцем')
                )
                .addSeparatorComponents(
                  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent('В данный момент все команды заблокированы владельцем.')
                );

            return message.reply({
              components: [lockContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }

          const cmdToLockCheck = command.name.toLowerCase();
          const potentialCommandLower = potentialCommand.toLowerCase();
          let isLocked;
          if (cmdToLockCheck === potentialCommandLower) {
            isLocked = await commandLockDb.isLocked(cmdToLockCheck);
          } else {
            const [lock1, lock2] = await Promise.all([
              commandLockDb.isLocked(cmdToLockCheck),
              commandLockDb.isLocked(potentialCommandLower)
            ]);
            isLocked = lock1 || lock2;
          }

          if (isLocked && message.author.id !== config.OWNER_ID) {
            const lockContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Команда заблокирована')
              )
              .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Команда \`\`${command.name}\`\` заблокирована владельцем на этом сервере.`)
              );

            return message.reply({
              components: [lockContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }

          if (message.author.id !== config.OWNER_ID) {
            const { onCooldown, remaining } = checkCooldown(message.author.id, command.name);
            if (onCooldown) {
              const cooldownContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`**Кулдаун команды**`)
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`**Эй, притормози!** Ты делаешь это слишком часто. ${emojis.angry}\n-# Попробуй снова через **${remaining}s**`)
                );
              const cooldownMsg = await message.reply({ components: [cooldownContainer], flags: MessageFlags.IsComponentsV2 });
              const timeoutId = setTimeout(async () => {
                try { await cooldownMsg.delete(); } catch (_) {}
                clearPendingReply(message.author.id);
              }, parseFloat(remaining) * 1000);
              storePendingReply(message.author.id, timeoutId, async () => {
                try { await cooldownMsg.delete(); } catch (_) {}
              });
              return;
            }
          }

          try {
            await command.execute(message, args);
            botLogger.logPrefixCommand(message, command.name, usedPrefixStr);
          } catch (error) {
            console.error('Command execution error:', error);
            botLogger.logError(error, `Prefix command: ${usedPrefixStr}${command.name}`, message.client).catch(() => {});
            return message.reply('❌ Что-то пошло не так при выполнении этой команды.');
          }
          return;
        } catch (error) {
          console.error('Command parsing error:', error);
        }
      }
    }

    if (inAiChannel) {
      if (!hasApiKey()) {
        return;
      }

      const userMessage = message.content.trim();
      if (!userMessage) return;

      const now = Date.now();
      const lastUsed = aiCooldowns.get(message.author.id) || 0;
      if (now - lastUsed < AI_COOLDOWN_MS) {
        const remaining = Math.ceil((AI_COOLDOWN_MS - (now - lastUsed)) / 1000);
        return message.reply(`Подожди ${remaining}с перед отправкой следующего сообщения AI.`).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
      }
      aiCooldowns.set(message.author.id, now);

      try {
        await message.channel.sendTyping();

        const result = await generateAiResponse({
          userId: message.author.id,
          channelId: message.channelId,
          guildId: message.guildId,
          prompt: userMessage,
          systemPrompt: CASUAL_PROMPT,
          includeHistory: true,
          saveToHistory: true,
          model: 'openai/gpt-oss-120b',
          maxTokens: 2048
        });

        if (result.success) {
          const chunks = result.chunks || splitMessage(result.content);

          for (let i = 0; i < chunks.length; i++) {
            if (i === 0) {
              await message.reply(chunks[i]);
            } else {
              await message.channel.send(chunks[i]);
            }
          }
        }
      } catch (error) {
        console.error('[AI CHANNEL] Error:', error.message);
      }
      return;
    }

    const afkAuthorKey = `${message.guildId}:${message.author.id}`;
    let userAFK = getCached(afkAuthorCache, afkAuthorKey);
    if (userAFK === undefined) {
      const foundAFK = await AFK.findOne({ where: { guildId: message.guildId, userId: message.author.id } });
      if (foundAFK) {
        await foundAFK.destroy();
        userAFK = foundAFK;
      } else {
        userAFK = null;
        setCache(afkAuthorCache, afkAuthorKey, null);
      }
    }

    if (userAFK) {
      afkMentionCache.delete(afkAuthorKey);
      afkAuthorCache.delete(afkAuthorKey);

      const duration = Date.now() - userAFK.time;
      const afkRemovedContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} **С возвращением**`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Ты был в AFK ${formatDuration(duration)}`)
        );

      await message.reply({
        components: [afkRemovedContainer],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      }).then(msg => {
        setTimeout(() => msg.delete().catch(err => {
          console.warn('[MESSAGE_CREATE] Failed to delete AFK notification:', err.message);
        }), 5000);
      }).catch(err => {
        console.error('[MESSAGE_CREATE] Failed to send AFK notification:', err.message);
      });
    }

    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users) {
        if (user.bot) continue;
        if (userId === message.author.id) continue;

        const afkCacheKey = `${message.guildId}:${userId}`;
        let mentionedAFK = getCached(afkMentionCache, afkCacheKey);
        if (mentionedAFK === undefined) {
          mentionedAFK = await AFK.findOne({
            where: {
              guildId: message.guildId,
              userId: userId
            }
          });
          setCache(afkMentionCache, afkCacheKey, mentionedAFK);
        }

        if (mentionedAFK) {
          const afkDuration = Date.now() - mentionedAFK.time;
          const afkNoticeContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**${user.username} сейчас в AFK**`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**Reason:** ${mentionedAFK.reason}\n**Since:** <t:${Math.round(mentionedAFK.time / 1000)}:R>`)
            );

          await message.reply({
            components: [afkNoticeContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
          });

          if (mentionedAFK.dm) {
            try {
              const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`${emojis.success} **Уведомление об AFK**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`- **From:** ${message.author.username}\n- **Server:** ${message.guild.name}\n- **Channel:** [${message.channel.name}](${message.url})`)
                );

              await user.send({
                components: [dmContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
              });
            } catch (error) {
              console.log(`Could not send DM to ${user.username}`);
            }
          }
          break;
        }
      }
    }

    if (message.mentions.users.has(client.user.id) && message.type !== MessageType.Reply && message.content.trim() === `<@${client.user.id}>`) {
      let prefixForDisplay = serverPrefix;
      if (!prefixForDisplay) {
        prefixForDisplay = config.PREFIX;
      }
      const prefix = prefixForDisplay;
      const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

      const container = new ContainerBuilder().setAccentColor(0x2B2D31);

      const content = (
        `**Привет, <@${message.author.id}>!**\n` +
        `**Я ${client.user.username}, твой дружелюбный бот.**\n` +
        `**Префикс на этом сервере: \`${prefix}\`**\n` +
        `**Введи \`${prefix}help\`, чтобы получить дополнительную информацию.**`
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Добро пожаловать в ${client.user.username}`)
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] },
      });
    }
  },
};
