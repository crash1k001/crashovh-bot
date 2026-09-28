
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { createPaginationSession } = require('../../lib/pagination');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('google')
        .setDescription('Поиск в Google')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Поисковый запрос')
                .setRequired(true)
        ),

    name: 'google',
    aliases: ['search', 'g'],
    category: 'social',
    cooldown: 5,

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const query = isSlash
            ? interactionOrMessage.options.getString('query')
            : args.join(' ');
        const userId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;

        if (!config.SERPAPI.API_KEY) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Поиск в Google'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Ключ SerpApi не настроен.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!query) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Поиск в Google'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Использование: `google <поисковый запрос>`'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const blacklistedWords = [
            'porn', 'pussy', 'naked', 'vagina', 'dick', 'sex', 'xxx', 'nude', 'nsfw',
            'boobs', 'tits', 'penis', 'cock', 'fuck', 'shit', 'bitch', 'ass', 'anal',
            'orgasm', 'masturbate', 'horny', 'lesbian', 'gay porn', 'milf', 'teen sex',
            'adult', 'erotic', 'fetish', 'hardcore', 'blowjob', 'cumshot', 'threesome'
        ];

        if (blacklistedWords.some(word => query.toLowerCase().includes(word.toLowerCase()))) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Поиск в Google'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Запрос содержит недопустимый контент.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        let loadingMsg = null;

        if (isSlash) {
            await interactionOrMessage.deferReply();
        } else {
            const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Google · ${query}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Получаю результаты...'));
            loadingMsg = await interactionOrMessage.reply({ components: [loadingContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const paginationTarget = isSlash ? interactionOrMessage : loadingMsg;

        try {
            const { getJson } = require('serpapi');
            const searchResults = await getJson({ engine: 'google', q: query, api_key: config.SERPAPI.API_KEY });
            const results = (searchResults.organic_results || []).slice(0, 25);

            if (results.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Google · ${query}`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Результаты не найдены. Попробуйте другие ключевые слова.'));
                if (isSlash) return interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                return loadingMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const itemsPerPage = 5;
            const totalPages = Math.ceil(results.length / itemsPerPage);

            const fetchPage = async (pageIndex) => results.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

            const renderPage = async (pageIndex, pageResults) => {
                const startIndex = pageIndex * itemsPerPage;
                const resultsText = pageResults.map((result, index) => {
                    const num = startIndex + index + 1;
                    const snippet = result.snippet ? `\n-# ${result.snippet.substring(0, 120)}` : '';
                    return `**${num}.** [${result.title || 'Без названия'}](${result.link || '#'})${snippet}`;
                }).join('\n');

                return new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### Google · ${query}\n-# Страница ${pageIndex + 1}/${totalPages}`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(resultsText));
            };

            await createPaginationSession({
                interactionOrMessage: paginationTarget,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000,
                useEdit: !isSlash
            }).renderInitial();

        } catch (error) {
            console.error('Google search error:', error);
            let msg = 'Не удалось получить результаты. Попробуйте позже.';
            if (error.message?.includes('API key')) msg = 'Неверный ключ SerpAPI.';
            else if (error.message?.includes('rate limit') || error.message?.includes('quota')) msg = 'Превышен лимит запросов. Попробуйте позже.';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Google · ${query}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg));

            if (isSlash) return interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return loadingMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
