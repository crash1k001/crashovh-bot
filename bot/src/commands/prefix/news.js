
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../lib/pagination');
const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser();

function stripHTML(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

async function fetchSauravNews(category = 'technology') {
    try {
        const response = await axios.get(
            `https://saurav.tech/NewsAPI/top-headlines/category/${category}/us.json`,
            { timeout: 8000 }
        );
        return response.data.articles || [];
    } catch (error) {
        console.error('SauravNews error:', error.message);
        return [];
    }
}

async function fetchGoogleNews(query) {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const feed = await parser.parseURL(url);
        return feed.items.slice(0, 5).map(item => ({
            title: stripHTML(item.title),
            content: stripHTML(item.content || item.contentSnippet || item.description || 'Нет содержимого'),
            url: item.link,
            source: 'Google News'
        }));
    } catch (error) {
        console.error('Google News error:', error.message);
        return [];
    }
}

async function fetchBBCNews() {
    try {
        const feed = await parser.parseURL('https://feeds.bbci.co.uk/news/rss.xml');
        return feed.items.slice(0, 5).map(item => ({
            title: stripHTML(item.title),
            content: stripHTML(item.content || item.contentSnippet || item.description || 'Нет содержимого'),
            url: item.link,
            source: 'BBC News'
        }));
    } catch (error) {
        console.error('BBC News error:', error.message);
        return [];
    }
}

async function fetchTechCrunchNews() {
    try {
        const feed = await parser.parseURL('https://techcrunch.com/feed/');
        return feed.items.slice(0, 5).map(item => ({
            title: stripHTML(item.title),
            content: stripHTML(item.content || item.contentSnippet || item.description || 'Нет содержимого'),
            url: item.link,
            source: 'TechCrunch'
        }));
    } catch (error) {
        console.error('TechCrunch error:', error.message);
        return [];
    }
}

async function aggregateNews(query = null) {
    let articles = [];

    if (query) {
        const googleResults = await fetchGoogleNews(query);
        articles = googleResults;
    } else {
        const [saurav, bbc, techcrunch] = await Promise.all([
            fetchSauravNews('technology'),
            fetchBBCNews(),
            fetchTechCrunchNews()
        ]);

        articles = [...saurav, ...bbc, ...techcrunch];
    }

    return articles.slice(0, 15);
}

module.exports = {
    name: 'news',
    aliases: ['headlines', 'articles'],
    description: 'Получить последние новости из разных источников',
    category: 'info',

    async execute(message, args) {
        const query = args.length > 0 ? args.join(' ') : null;

        try {
            const articles = await aggregateNews(query);

            if (!articles || articles.length === 0) {
                const noResultsContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Статьи не найдены')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            query
                                ? `Статьи не найдены по запросу: **${query}**\n\nПопробуйте другой запрос.`
                                : 'Сейчас нет доступных статей.'
                        )
                    );

                return message.reply({
                    components: [noResultsContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const itemsPerPage = 1;
            const totalPages = articles.length;

            const fetchPage = async (pageIndex) => {
                return [articles[pageIndex]];
            };

            const renderPage = async (pageIndex, pageResults) => {
                const article = pageResults[0];
                const title = article.title || 'Без названия';
                const content = article.content || article.description || article.contentSnippet || 'Содержимое недоступно';
                const source = article.source || 'Неизвестно';
                const url = article.url || '#';

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# Новости`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${content}\n\n` +
                            `Источник: ${source}\n` +
                            `[Читать полную статью](${url})`
                        )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    );

                return container;
            };

            const userId = message.author.id;

            const paginationSession = createPaginationSession({
                interactionOrMessage: message,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000,
                });

            await paginationSession.renderInitial();

        } catch (error) {
            console.error('News command error:', error);

            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Ошибка')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Не удалось получить новости. Попробуйте позже.'
                    )
                );

            return message.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
