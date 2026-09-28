
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ComponentType, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const emojis = require('../../emojis.json');
const config = require('../../config');

const categories = {
    general: {
        name: 'Общие',
        description: 'Утилиты сервера, списки, аватар и другое',
        catEmoji: 'cat_general',
        commands: ['status', 'avatar', 'banner', 'servericon', 'membercount', 'urban', 'hash', 'snipe', 'editsnipe', 'purge', 'steal', 'remind', 'list boosters', 'list inrole', 'list emojis', 'list bots', 'list admins', 'list invoice', 'list mods', 'list early', 'list createpos', 'list roles']
    },
    information: {
        name: 'Информация',
        description: 'Инфо о боте, статистика сервера и пользователях',
        catEmoji: 'cat_information',
        commands: ['userinfo', 'serverinfo', 'invite', 'users', 'botinfo', 'ping', 'avgping', 'uptime', 'help', 'stats permissions', 'stats rolecall', 'stats rolecount', 'stats roleinfo', 'stats roleperms', 'stats topic', 'stats channelinfo', 'stats emojiinfo', 'stats emojistats', 'stats emptyroles', 'stats firstjoins', 'stats joined', 'stats joinedatpos', 'stats joinpos', 'stats lastjoins', 'stats listchannels']
    },
    moderation: {
        name: 'Модерация',
        description: 'Бан, кик, мьют, блокировка и другое',
        catEmoji: 'cat_moderation',
        commands: ['kick', 'ban', 'softban', 'unban', 'slowmode', 'lock', 'unlock', 'tempban', 'mute', 'unmute', 'temprole', 'rolegive', 'roleremove', 'nick']
    },
    antinuke: {
        name: 'Антинюк',
        description: 'Защита сервера от рейдов и нюков',
        catEmoji: 'cat_antinuke',
        commands: [
            'antinuke setup',
            'antinuke settings',
            'antinuke enable',
            'antinuke disable',
            'antinuke whitelist',
            'antinuke whitelist add',
            'antinuke whitelist remove',
            'antinuke whitelist list'
        ]
    },
    automod: {
        name: 'Автомодерация',
        description: 'Автоматические фильтры модерации сообщений',
        catEmoji: 'cat_automod',
        commands: ['automod setup', 'automod settings', 'automod enable', 'automod disable', 'automod whitelist']
    },
    tickets: {
        name: 'Тикеты',
        description: 'Управление системой тикетов поддержки',
        catEmoji: 'cat_tickets',
        commands: [
            'ticket setup', 'ticket panel', 'ticket addcategory', 'ticket removecategory',
            'ticket addrole', 'ticket removerole', 'ticket close', 'ticket open',
            'ticket delete', 'ticket add', 'ticket remove', 'ticket rename',
            'ticket claim', 'ticket transfer', 'ticket transcript', 'ticket reset'
        ]
    },
    welcome: {
        name: 'Приветствие',
        description: 'Настройка приветственных и прощальных сообщений',
        catEmoji: 'cat_welcome',
        commands: ['welcome setup', 'welcome config', 'welcome test', 'welcome reset', 'farewell setup', 'farewell config', 'farewell test', 'farewell reset']
    },
    logging: {
        name: 'Логирование',
        description: 'Настройка логирования событий сервера',
        catEmoji: 'cat_logging',
        commands: ['logging setup', 'logging config', 'logging reset']
    },
    fun: {
        name: 'Развлечения',
        description: 'Игры, мемы и развлекательные команды',
        catEmoji: 'cat_fun',
        commands: [
            'howdumb', 'howgay', 'dare', 'truth', 'simprate',
            'pickup', 'rickroll', 'meme',
            'nitro', 'token', 'texttoemoji', 'wizz', 'hack', 'ship'
        ]
    },
    roleplay: {
        name: 'Ролеплей',
        description: 'Обнять, поцеловать, шлёпнуть и другие действия',
        catEmoji: 'cat_roleplay',
        commands: [
            'hug', 'kiss', 'lick', 'pat', 'slap', 'tickle', 'poke', 'deathstare',
            'dance', 'cry', 'laugh', 'smile', 'blush', 'wink', 'thumbsup', 'clap',
            'bow', 'salute', 'facepalm', 'shrug', 'sleep', 'eat', 'kill', 'run'
        ]
    },
    social: {
        name: 'Социальное',
        description: 'Соцсети, веб-поиск и криптовалюты',
        catEmoji: 'cat_social',
        commands: ['youtube', 'github', 'wikipedia', 'news', 'google', 'ping', 'crypto balance', 'crypto price', 'crypto convert', 'crypto transaction', 'crypto news', 'crypto gainers', 'crypto losers']
    },
    utility: {
        name: 'Утилиты',
        description: 'Конвертация, файлы, задачи и игнор-лист',
        catEmoji: 'cat_utility',
        commands: ['lb', 'kg', 'ft', 'cm', 'hexdec', 'dechex', 'strbin', 'binstr', 'binint', 'intbin', 'encode', 'ascii85', 'rot13', 'base32', 'hex', 'todo add', 'todo list', 'todo remove', 'todo clear', 'dumpsettings', 'dumproles', 'dumpchannels', 'dumpvoicechannels', 'dumpcategories', 'dumpemotes', 'dumpmessages', 'dumphumans', 'dumpbots', 'dumpusers', 'dumpbans', 'dumpwarns', 'ignore command add', 'ignore command remove', 'ignore command show', 'ignore channel add', 'ignore channel remove', 'ignore channel show', 'ignore user add', 'ignore user remove', 'ignore user show', 'ignore bypass add', 'ignore bypass remove', 'ignore bypass show']
    },
};

const extraCategories = {
    animals: {
        name: 'Животные',
        description: 'Милые фото животных и случайные факты',
        catEmoji: 'cat_animals',
        commands: ['cat', 'dog', 'fox', 'duck', 'panda', 'redpanda', 'bird', 'bunny', 'bear', 'pig', 'possum', 'sheep', 'snake', 'squirrel', 'animalfact']
    },
    giveaway: {
        name: 'Розыгрыши',
        description: 'Создание, завершение и переброс розыгрышей',
        catEmoji: 'cat_giveaway',
        commands: ['giveaway start', 'giveaway end', 'giveaway reroll']
    },
    vanity: {
        name: 'Vanity-роли',
        description: 'Автоматические роли за vanity-ссылку сервера',
        catEmoji: 'cat_vanityroles',
        commands: ['vanity setup', 'vanity config', 'vanity reset']
    },
    feedback: {
        name: 'Отзывы',
        description: 'Панель и система отправки отзывов',
        catEmoji: 'cat_feedback',
        commands: ['feedback setup', 'feedback panel', 'feedback config', 'feedback reset']
    },
    j2c: {
        name: 'Join2Create',
        description: 'Динамическое создание голосовых каналов',
        catEmoji: 'cat_join2create',
        commands: ['j2c setup', 'j2c config', 'j2c reset']
    },
    automation: {
        name: 'Автоматизация',
        description: 'Триггеры автореакций и автопостинга',
        catEmoji: 'cat_automation',
        commands: ['autoreact add', 'autoreact remove', 'autoreact list', 'autoreact reset', 'autopost add', 'autopost remove', 'autopost reset']
    },
    profiles: {
        name: 'Профили',
        description: 'Настройка профиля пользователя и бота',
        catEmoji: 'cat_profiles',
        commands: ['profile view', 'profile description', 'profile social', 'profile background', 'profile reset', 'profile card', 'serveravatar', 'serverbanner', 'serverbio', 'servername', 'serverresetprofile']
    },
    media: {
        name: 'Медиа',
        description: 'Медиа-каналы и аватарки',
        catEmoji: 'cat_media',
        commands: ['pfp anime', 'pfp male', 'pfp female', 'media setup', 'media remove', 'media config', 'media bypass add', 'media bypass remove', 'media bypass show']
    },
    misc: {
        name: 'Разное',
        description: 'Калькулятор, AFK, матрица и другое',
        catEmoji: 'cat_misc',
        commands: ['calc', 'define', 'matrix', 'size', 'afk']
    },
    tracking: {
        name: 'Отслеживание',
        description: 'Таблицы лидеров по сообщениям и приглашениям',
        catEmoji: 'cat_tracking',
        commands: ['leaderboard messages', 'leaderboard invites', 'messages', 'invites']
    },
    voice: {
        name: 'Голос',
        description: 'Инструменты модерации голосовых каналов',
        catEmoji: 'cat_voice',
        commands: ['voice kick', 'voice kickall', 'voice mute', 'voice muteall', 'voice unmute', 'voice unmuteall', 'voice deafen', 'voice deafenall', 'voice undeafen', 'voice undeafenall', 'voice move', 'voice moveall', 'voice pull', 'voice pullall', 'voice lock', 'voice unlock', 'voice private', 'voice unprivate']
    },
    ai: {
        name: 'Искусственный интеллект',
        description: 'AI-чат, анализ изображений и другое',
        catEmoji: 'cat_ai',
        commands: ['ai enable', 'ai disable', 'ai analyse', 'ai ask']
    },
    reactionroles: {
        name: 'Роли по реакции',
        description: 'Меню самостоятельно назначаемых ролей',
        catEmoji: 'cat_reactionroles',
        commands: ['reactionroles setup', 'reactionroles remove']
    },
};

const allCategories = { ...categories, ...extraCategories };

// Fallback Unicode icons keep .help readable if application emoji IDs are
// temporarily unavailable. Custom Niko emojis are still used whenever they
// are present in emojis.json.
const categoryEmojiFallbacks = {
    cat_home: '🏠', cat_general: '⚙️', cat_information: 'ℹ️',
    cat_moderation: '🛡️', cat_antinuke: '🧨', cat_automod: '🤖',
    cat_tickets: '🎫', cat_welcome: '👋', cat_logging: '📋',
    cat_fun: '🎮', cat_roleplay: '🎭', cat_social: '🌐',
    cat_utility: '🛠️', cat_animals: '🐾', cat_giveaway: '🎁',
    cat_vanityroles: '✨', cat_feedback: '💬', cat_j2c: '🔊',
    cat_automation: '⚡', cat_profiles: '👤', cat_media: '🖼️',
    cat_misc: '📦', cat_tracking: '📊', cat_voice: '🎙️',
    cat_ai: '🧠', cat_reactionroles: '🎯'
};

function getCategoryEmoji(key) {
    return (key && emojis[key]) || categoryEmojiFallbacks[key] || '•';
}

function getCategoryEmojiObject(key) {
    const value = emojis[key];
    if (value) {
        const parsed = parseEmoji(value);
        if (parsed) return parsed;
    }
    const fallback = categoryEmojiFallbacks[key];
    return fallback ? { name: fallback } : undefined;
}

async function createHelpContainer(categoryKey = null, botAvatarURL, userAvatarURL, clientId, guildId = null, botUsername = 'Бот') {
    const container = new ContainerBuilder().setAccentColor(0x2C2F33);

    if (!categoryKey) {
        let guildPrefix = config.PREFIX;
        if (guildId) {
            const { GuildPrefix } = require('../../data/models');
            const customPrefix = await GuildPrefix.getPrefix(guildId);
            if (customPrefix) {
                guildPrefix = customPrefix;
            }
        }

        const allCats = { ...categories, ...extraCategories };
        const categoryList = Object.values(allCats).map(cat => {
            const emojiStr = getCategoryEmoji(cat.catEmoji);
            return `> ${emojiStr} \`»\` **${cat.name}**`;
        }).join('\n');

        const headerSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Привет, я ${botUsername}`)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `- **Префикс на этом сервере:** \`${guildPrefix}\`\n` +
                    `- **Изменить префикс:** **/setprefix**\n` +
                    `- **[Сервер поддержки](${config.SUPPORT_SERVER}) — если нужна помощь**`
                )
            );
        if (botAvatarURL) {
            headerSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(botAvatarURL));
        }

        container
            .addSectionComponents(headerSection)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(categoryList)
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    } else {
        const category = allCategories[categoryKey];
        if (!category) return container;

        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${category.name}`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        if (categoryKey === 'music' && category.subcategories) {
            const commandsSection = new SectionBuilder();
            const subcategoryTexts = Object.entries(category.subcategories).map(([subKey, subcategory]) => {
                const commandList = subcategory.commands.map(cmd => `\`${cmd}\``).join(', ');
                return `**__${subcategory.name}__**\n${commandList}`;
            }).join('\n\n');
            commandsSection.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(subcategoryTexts)
            );
            if (botAvatarURL) {
                commandsSection.setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(botAvatarURL)
                );
            }
            container.addSectionComponents(commandsSection);
        } else {
            const commandsSection = new SectionBuilder();
            const commandList = category.commands.map(cmd => `\`${cmd}\``).join(', ');
            commandsSection.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(commandList)
            );
            if (botAvatarURL) {
                commandsSection.setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(botAvatarURL)
                );
            }
            container.addSectionComponents(commandsSection);
        }

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    return container;
}

function parseEmoji(str) {
    if (!str) return undefined;
    const match = str.match(/<(a?):(\w+):(\d+)>/);
    if (!match) return undefined;
    return { animated: match[1] === 'a', name: match[2], id: match[3] };
}

function createSelectMenu(currentCategory = null) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('↘ Выберите модуль');

    const homeEmoji = parseEmoji(emojis.cat_home);
    selectMenu.addOptions({
        label: 'Главная',
        description: 'Вернуться на главную страницу помощи',
        value: 'home',
        emoji: homeEmoji,
        default: currentCategory === 'home'
    });

    for (const [key, category] of Object.entries(categories)) {
        const option = {
            label: category.name,
            description: category.description || `Команд: ${category.commands.length}`,
            value: key,
            default: currentCategory === key
        };
        if (category.catEmoji) {
            const categoryEmoji = getCategoryEmojiObject(category.catEmoji);
            if (categoryEmoji) option.emoji = categoryEmoji;
        }
        selectMenu.addOptions(option);
    }

    return new ActionRowBuilder().addComponents(selectMenu);
}

function createExtraSelectMenu(currentCategory = null) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_extra_category_select')
        .setPlaceholder('↘ Выберите категорию');

    for (const [key, category] of Object.entries(extraCategories)) {
        const option = {
            label: category.name,
            description: category.description || `Команд: ${category.commands.length}`,
            value: key,
            default: currentCategory === key
        };
        if (category.catEmoji) {
            const categoryEmoji = getCategoryEmojiObject(category.catEmoji);
            if (categoryEmoji) option.emoji = categoryEmoji;
        }
        selectMenu.addOptions(option);
    }

    return new ActionRowBuilder().addComponents(selectMenu);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Показать все доступные команды')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Категория для просмотра (например general, automod, fun)')
                .setRequired(false)
        ),

    name: 'help',
    description: 'Показать все доступные команды',
    aliases: ['h'],
    category: 'information',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const { client } = interactionOrMessage;
        const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
        const guildId = interactionOrMessage.guildId;

        const { sendHelp, registry } = require('../../lib/helpMenu');

        const rawArg = isSlash
            ? interactionOrMessage.options.getString('category')
            : (args[0] || null);

        if (rawArg) {
            const key = rawArg.toLowerCase();
            if (registry[key]) {
                return sendHelp(key, interactionOrMessage);
            }
            const matchedKey = Object.keys(allCategories).find(k =>
                allCategories[k].name.toLowerCase() === key
            );
            if (matchedKey && registry[matchedKey]) {
                return sendHelp(matchedKey, interactionOrMessage);
            }
        }

        const botAvatarURL = client.user.displayAvatarURL({ dynamic: true, size: 256 });
        const userAvatarURL = user.displayAvatarURL({ dynamic: true, size: 128 });
        const clientId = client.user.id;
        const botUsername = client.user.username;

        const container = await createHelpContainer(null, botAvatarURL, userAvatarURL, clientId, guildId, botUsername);
        const selectMenuRow = createSelectMenu();
        const extraSelectMenuRow = createExtraSelectMenu();

        container.addActionRowComponents(selectMenuRow);
        container.addActionRowComponents(extraSelectMenuRow);
        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Работает на движке Niko')
            );

        const reply = await interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
            fetchReply: true
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 240000
        });

        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== user.id) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2C2F33)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
                    );
                return selectInteraction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const selectedCategory = selectInteraction.values[0];
            const isHome = selectedCategory === 'home';
            const newContainer = await createHelpContainer(isHome ? null : selectedCategory, botAvatarURL, userAvatarURL, clientId, guildId, botUsername);
            const newSelectMenu = createSelectMenu(isHome ? null : selectedCategory);
            const newExtraSelectMenu = createExtraSelectMenu(isHome ? null : selectedCategory);

            newContainer.addActionRowComponents(newSelectMenu);
            newContainer.addActionRowComponents(newExtraSelectMenu);
            if (isHome) {
                newContainer
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Работает на движке Niko')
                    );
            }

            await selectInteraction.update({
                components: [newContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            });
        });
    }
};
