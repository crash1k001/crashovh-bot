
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { createPaginationSession } = require('../../../lib/pagination');
const {
    generateAiResponse,
    SYSTEM_PROMPT,
    hasApiKey
} = require('../../../lib/aiUtils');
const emojis = require('../../../emojis.json');

const PAGE_CHAR_LIMIT = 3500;

module.exports = {
    name: 'ask',
    description: 'Пообщаться с AI',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();

        let prompt;
        if (isSlashCommand) {
            prompt = interactionOrMessage.options.getString('prompt');
        } else {
            prompt = args.join(' ');
        }

        if (!prompt) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Ошибка**\n\nУкажите текст запроса.')
                );

            return isSlashCommand
                ? await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 })
                : await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!hasApiKey()) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Ошибка**\n\nAI-сервис не настроен.')
                );

            return isSlashCommand
                ? await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 })
                : await interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        let thinkingMsg = null;
        if (isSlashCommand) {
            await interactionOrMessage.deferReply();
        } else {
            thinkingMsg = await interactionOrMessage.reply({
                content: `${emojis.loading} ${interactionOrMessage.client.user.username} думает...`
            });
        }

        try {
            const userId = isSlashCommand ? interactionOrMessage.user.id : interactionOrMessage.author.id;
            const channelId = interactionOrMessage.channelId;
            const guildId = interactionOrMessage.guildId;

            const result = await generateAiResponse({
                userId,
                channelId,
                guildId,
                prompt,
                systemPrompt: SYSTEM_PROMPT,
                includeHistory: true,
                saveToHistory: true
            });

            if (!result.success) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Ошибка**\n\n${result.error || 'Не удалось получить ответ от AI.'}`)
                    );

                if (isSlashCommand) {
                    return await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                } else {
                    return await thinkingMsg.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
                }
            }

            const aiResponse = result.content;

            if (aiResponse.length <= PAGE_CHAR_LIMIT) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31);
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${interactionOrMessage.client.user.username}`)
                );
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(aiResponse)
                );

                if (isSlashCommand) {
                    await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                } else {
                    await thinkingMsg.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
                }
            } else {
                const pages = [];
                let remaining = aiResponse;

                while (remaining.length > 0) {
                    if (remaining.length <= PAGE_CHAR_LIMIT) {
                        pages.push(remaining);
                        break;
                    }

                    let splitIndex = remaining.lastIndexOf('\n', PAGE_CHAR_LIMIT);
                    if (splitIndex === -1 || splitIndex < PAGE_CHAR_LIMIT * 0.5) {
                        splitIndex = remaining.lastIndexOf(' ', PAGE_CHAR_LIMIT);
                    }
                    if (splitIndex === -1 || splitIndex < PAGE_CHAR_LIMIT * 0.5) {
                        splitIndex = PAGE_CHAR_LIMIT;
                    }

                    pages.push(remaining.substring(0, splitIndex));
                    remaining = remaining.substring(splitIndex).trim();
                }

                const paginationSession = createPaginationSession({
                    interactionOrMessage: isSlashCommand ? interactionOrMessage : thinkingMsg,
                    pages: pages,
                    userId: userId,
                    useEdit: !isSlashCommand,
                    renderPage: (pageIndex, pageData, state) => {
                        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`### ${interactionOrMessage.client.user.username} (Страница ${pageIndex + 1}/${state.totalPages})`)
                        );
                        container.addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                        );
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(pageData)
                        );
                        return container;
                    }
                });

                await paginationSession.renderInitial();
            }

        } catch (error) {
            console.error('AI ask command error:', error);

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Ошибка**\n\nПроизошла непредвиденная ошибка.')
                );

            if (isSlashCommand) {
                await interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } else {
                await thinkingMsg.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }
    }
};
