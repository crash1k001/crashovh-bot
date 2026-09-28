
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const { createPaginationSession } = require('../../lib/pagination');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wikipedia')
        .setDescription('Найти информацию в Wikipedia')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Что искать в Wikipedia')
                .setRequired(true)
        ),

    name: 'wikipedia',
    category: 'info',

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');

        try {
            const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: query,
                    format: 'json',
                    srlimit: 10
                },
                headers: {
                    'User-Agent': 'AeroXBot/1.0'
                },
                timeout: 8000
            });

            const results = searchRes.data.query.search;
            if (!results || results.length === 0) {
                const noResultsContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Не найдено')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `Статья Wikipedia не найдена по запросу: **${query}**\n\n` +
                            'Попробуйте другой запрос.'
                        )
                    );

                return interaction.editReply({
                    components: [noResultsContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const fetchPage = async (index) => {
                const pageTitle = results[index].title;

                const pageRes = await axios.get('https://en.wikipedia.org/w/api.php', {
                    params: {
                        action: 'query',
                        titles: pageTitle,
                        prop: 'extracts|pageimages',
                        explaintext: true,
                        exlimit: 1,
                        exintro: false,
                        piprop: 'original|thumbnail',
                        pithumbsize: 500,
                        pilimit: 'max',
                        format: 'json'
                    },
                    headers: {
                        'User-Agent': 'AeroXBot/1.0'
                    },
                    timeout: 8000
                });

                const pages = pageRes.data.query.pages;
                const pageId = Object.keys(pages)[0];
                const page = pages[pageId];

                const content = page.extract ? page.extract.substring(0, 3500) : 'Содержимое недоступно';
                const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;

                const imageUrls = [];
                if (page.thumbnail?.source) {
                    imageUrls.push(page.thumbnail.source);
                }

                
                const parseRes = await axios.get('https://en.wikipedia.org/w/api.php', {
                    params: {
                        action: 'parse',
                        page: pageTitle,
                        prop: 'text',
                        format: 'json'
                    },
                    headers: {
                        'User-Agent': 'AeroXBot/1.0'
                    },
                    timeout: 8000
                }).catch(() => null);

                if (parseRes?.data?.parse?.text) {
                    const imgRegex = /<img[^>]+src="([^"]+)"/g;
                    let match;
                    const foundImages = new Set();
                    while ((match = imgRegex.exec(parseRes.data.parse.text)) !== null) {
                        let imgUrl = match[1];
                        if (imgUrl.includes('wikipedia') && !imgUrl.includes('icon') && !imgUrl.includes('x20px') && !imgUrl.includes('x30px')) {
                            if (!imgUrl.startsWith('http')) imgUrl = 'https:' + imgUrl;
                            foundImages.add(imgUrl);
                        }
                    }
                    imageUrls.push(...Array.from(foundImages).slice(0, 4));
                }

                
                return { pageTitle, content, imageUrls: [...new Set(imageUrls)].slice(0, 5), wikiUrl };
            };

            const renderPage = async (pageIndex, pageData) => {
                const { pageTitle, content, imageUrls, wikiUrl } = pageData;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${pageTitle}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${content}\n\n` +
                            `[Читать полную статью](${wikiUrl})`
                        )
                    );

                if (imageUrls && imageUrls.length > 0) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                    )
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            imageUrls.map((url, idx) => 
                                new MediaGalleryItemBuilder()
                                    .setURL(url)
                                    .setDescription(`${pageTitle}`)
                            )
                        )
                    );
                }

                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );

                return container;
            };

            const userId = interaction.user.id;
            const paginationSession = createPaginationSession({
                interactionOrMessage: interaction,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages: results.length,
                initialPage: 0,
                timeout: 300000,
                });

            await paginationSession.renderInitial();

        } catch (error) {
            console.error('Wikipedia search error:', error.message);

            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Ошибка поиска')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Не удалось выполнить поиск в Wikipedia. Попробуйте позже.'
                    )
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
