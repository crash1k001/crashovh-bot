
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('github')
        .setDescription('Найти репозитории на GitHub')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Название репозитория или ключевые слова')
                .setRequired(true)
        ),

    name: 'github',
    aliases: ['gh', 'repo'],
    category: 'social',
    deferReply: true,

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const send = interactionOrMessage.deferred
            ? opts => interactionOrMessage.editReply(opts)
            : opts => interactionOrMessage.reply(opts);
        const searchQuery = isSlash
            ? interactionOrMessage.options.getString('query')
            : args.join(' ');

        if (!searchQuery) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Поиск GitHub'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    'Использование: `github <название репозитория>`'
                ));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const searchResults = await axios.get('https://api.github.com/search/repositories', {
                params: { q: searchQuery, sort: 'stars', order: 'desc', per_page: 10 },
                headers: { 'User-Agent': 'Discord-Bot' }
            });

            const repos = searchResults.data.items;

            if (!repos || repos.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Поиск GitHub'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `Репозитории не найдены по запросу **${searchQuery}**.`
                    ));
                return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const reposList = repos.slice(0, 5).map((repo, index) => {
                const stars = repo.stargazers_count.toLocaleString();
                const forks = repo.forks_count.toLocaleString();
                const lang = repo.language || 'н/д';
                return `**${index + 1}. ${repo.name}** (${stars} stars)\n` +
                       `${repo.description || 'Без описания'}\n` +
                       `Язык: ${lang} | Форков: ${forks}\n` +
                       `[Открыть репозиторий](${repo.html_url})`;
            }).join('\n\n');

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Поиск GitHub — ${searchQuery}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(reposList))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `Всего найдено репозиториев: ${searchResults.data.total_count.toLocaleString()}`
                ));

            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error('GitHub search error:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Поиск GitHub'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    'Не удалось связаться с GitHub. Попробуйте позже.'
                ));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
