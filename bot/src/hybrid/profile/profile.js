
const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    AttachmentBuilder
} = require('discord.js');
const path = require('path');
const { NoPrefix, Profile } = require('../../data/models');
const { profileImage } = require('../../lib/profileCard');
const emojis = require('../../emojis.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Управление вашим профилем')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Посмотреть профиль пользователя')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь для просмотра')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('description')
                .setDescription('Установить описание профиля')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Описание вашего профиля')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('social')
                .setDescription('Добавить ссылку на соцсеть')
                .addStringOption(option =>
                    option.setName('platform')
                        .setDescription('Платформа соцсети')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Facebook', value: 'Facebook' },
                            { name: 'Instagram', value: 'Instagram' },
                            { name: 'LinkedIn', value: 'LinkedIn' },
                            { name: 'SnapChat', value: 'Snapchat' },
                            { name: 'YouTube', value: 'YouTube' },
                            { name: 'Сайт', value: 'Website' },
                            { name: 'TikTok', value: 'Tiktok' },
                            { name: 'Telegram', value: 'Telegram' },
                            { name: 'Spotify', value: 'Spotify' },
                            { name: 'Twitter/X', value: 'Twitter' },
                            { name: 'Twitch', value: 'Twitch' }
                        )
                )
                .addStringOption(option =>
                    option.setName('link')
                        .setDescription('Ссылка на ваш профиль')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('background')
                .setDescription('Установить фон карточки профиля')
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('URL изображения для фона')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Сбросить профиль (описание, соцсети, фон)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('card')
                .setDescription('Посмотреть изображение карточки профиля')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь для просмотра')
                        .setRequired(false)
                )
        ),

    name: 'profile',
    description: 'Управление вашим профилем',
    usage: '[view @пользователь] | [description <текст>] | [social <платформа> <ссылка>] | [background <url>] | [reset] | [card @пользователь]',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();

        let subcommandName;

        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            subcommandName = args[0]?.toLowerCase();
            if (!subcommandName || !['view', 'description', 'social', 'background', 'reset', 'card'].includes(subcommandName)) {
                subcommandName = 'view';
            } else {
                args = args.slice(1);
            }
        }

        if (subcommandName === 'description') {
            const subcommandsPath = path.join(__dirname, 'subcommands');
            const subcommand = require(path.join(subcommandsPath, 'description.js'));
            return subcommand.execute(interactionOrMessage, args);
        }

        if (subcommandName === 'social') {
            const subcommandsPath = path.join(__dirname, 'subcommands');
            const subcommand = require(path.join(subcommandsPath, 'social.js'));
            return subcommand.execute(interactionOrMessage, args);
        }

        if (subcommandName === 'background') {
            const subcommandsPath = path.join(__dirname, 'subcommands');
            const subcommand = require(path.join(subcommandsPath, 'background.js'));
            return subcommand.execute(interactionOrMessage, args);
        }

        if (subcommandName === 'reset') {
            const subcommandsPath = path.join(__dirname, 'subcommands');
            const subcommand = require(path.join(subcommandsPath, 'reset.js'));
            return subcommand.execute(interactionOrMessage, args);
        }

        if (subcommandName === 'card') {
            const subcommandsPath = path.join(__dirname, 'subcommands');
            const subcommand = require(path.join(subcommandsPath, 'card.js'));
            return subcommand.execute(interactionOrMessage, args);
        }

        let targetUser;
        let reply;

        if (isSlashCommand) {
            await interactionOrMessage.deferReply();
            targetUser = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            reply = (content) => interactionOrMessage.editReply(content);
        } else {
            const thinkingMsg = await interactionOrMessage.reply(`${emojis.loading} Загружаю профиль...`);
            const mentionedUser = interactionOrMessage.mentions.users.first();
            targetUser = mentionedUser || interactionOrMessage.author;
            reply = (content) => thinkingMsg.edit({ content: null, ...content });
        }

        try {
            targetUser = await targetUser.fetch(true);
        } catch { }

        let presenceStatus = 'offline';
        try {
            const guild = interactionOrMessage.guild;
            if (guild) {
                const member = await guild.members.fetch(targetUser.id);
                presenceStatus = member?.presence?.status || 'offline';
            }
        } catch { }

        const tick = emojis.enable;
        const cross = emojis.disable;

        const hasNoPrefix = await NoPrefix.isNoPrefixUser(targetUser.id);
        const noPrefixStatus = hasNoPrefix ? tick : cross;
        const premiumStatus = cross;

        const userDescription = await Profile.getDescription(targetUser.id);
        const userSocials = await Profile.getSocials(targetUser.id);
        const userBackground = await Profile.getBackground(targetUser.id);

        const getPlatformEmoji = (platform) => {
            const key = platform.toLowerCase();
            return emojis[key] || '';
        };

        let socialsText = 'Соцсети не добавлены.';
        if (userSocials.length > 0) {
            socialsText = userSocials.map(s => {
                const emoji = getPlatformEmoji(s.platform);
                return `${emoji} [${s.platform}](${s.link})`;
            }).join(' | ');
        }

        let profileCardBuffer;
        try {
            const client = interactionOrMessage.client;
            profileCardBuffer = await profileImage(targetUser, {
                botToken: client.token,
                presenceStatus: presenceStatus,
                customBackground: userBackground || undefined
            });
        } catch (error) {

            const container = new ContainerBuilder().setAccentColor(0x2B2D31);
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Профиль ${targetUser.username}\n*Ошибка создания карточки профиля*`)
            );
            return reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const attachment = new AttachmentBuilder(profileCardBuffer, { name: 'profile.png' });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://profile.png')
            )
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Пользователь** ${targetUser.username}`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Без префикса** ${noPrefixStatus}`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(socialsText)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(userDescription ? `*${userDescription}*` : '*Нет*')
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        await reply({
            components: [container],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
