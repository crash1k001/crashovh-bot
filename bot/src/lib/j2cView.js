
const {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const { TempChannel } = require('../data/models');
const emojis = require('../emojis.json');

class VoiceControlView {
    static getComponents() {
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_lock')
                    .setEmoji(emojis.j2c_lock)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_unlock')
                    .setEmoji(emojis.j2c_unlock)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_hide')
                    .setEmoji(emojis.j2c_hide)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_unhide')
                    .setEmoji(emojis.j2c_unhide)
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_claim')
                    .setEmoji(emojis.j2c_claim)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_disconnect')
                    .setEmoji(emojis.j2c_disconnect)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_activity')
                    .setEmoji(emojis.j2c_activity)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_info')
                    .setEmoji(emojis.j2c_info)
                    .setStyle(ButtonStyle.Secondary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_increase')
                    .setEmoji(emojis.j2c_increase)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_decrease')
                    .setEmoji(emojis.j2c_decrease)
                    .setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2, row3];
    }

    static async getUserTempVC(userId, guildId, client) {
        const tempChannel = await TempChannel.findOne({
            where: { guildId, ownerId: userId },
            raw: true
        });

        if (tempChannel) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                try {
                    return await guild.channels.fetch(tempChannel.channelId);
                } catch (err) {
                    console.error('Error fetching temp channel:', err);
                    return null;
                }
            }
        }
        return null;
    }

    static async handleButton(interaction) {
        const { customId, user, guild, client } = interaction;
        const member = interaction.member;

        let vc = await VoiceControlView.getUserTempVC(user.id, guild.id, client);

        
        if (!vc && member.voice && member.voice.channel) {
            const tempChannel = await TempChannel.findOne({
                where: { guildId: guild.id, channelId: member.voice.channel.id },
                raw: true
            });

            if (tempChannel && tempChannel.ownerId === user.id) {
                vc = member.voice.channel;
            }
        }

        if (!vc && !['j2c_claim'].includes(customId)) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("У вас нет своего голосового канала!")
                );
            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        switch (customId) {
            case 'j2c_lock':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Заблокирован канал ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось заблокировать канал.' });
                }
                break;

            case 'j2c_unlock':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Разблокирован канал ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось разблокировать канал.' });
                }
                break;

            case 'j2c_hide':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Скрыт канал ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось скрыть канал.' });
                }
                break;

            case 'j2c_unhide':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Показан канал ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось показать канал.' });
                }
                break;

            case 'j2c_claim':
                if (!member.voice || !member.voice.channel) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Вам нужно находиться в голосовом канале!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                const claimVC = member.voice.channel;
                const tempChannelRecordData = await TempChannel.findOne({
                    where: { guildId: guild.id, channelId: claimVC.id },
                    raw: true
                });

                if (!tempChannelRecordData) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Это не временный голосовой канал!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                const currentOwner = guild.members.cache.get(tempChannelRecordData.ownerId);
                if (currentOwner && claimVC.members.has(currentOwner.id)) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Владелец всё ещё в канале!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await TempChannel.update(
                        { ownerId: user.id },
                        { where: { channelId: claimVC.id } }
                    );
                    await claimVC.edit({ name: `Канал ${user.displayName}` });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Вы забрали канал ${claimVC.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось забрать канал.' });
                }
                break;

            case 'j2c_disconnect':
                if (vc.members.size <= 1) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Некого отключать!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                const { StringSelectMenuBuilder } = require('discord.js');
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('j2c_dc_select')
                    .setPlaceholder('Выберите участника для отключения')
                    .addOptions(
                        vc.members
                            .filter(m => m.id !== user.id)
                            .map(m => ({
                                label: m.displayName,
                                value: m.id
                            }))
                            .slice(0, 25)
                    );

                const disconnectContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Отключить участника**\n\nВыберите участника для отключения от вашего голосового канала:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(selectMenu)
                    );

                await interaction.reply({
                    components: [disconnectContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
                break;

            case 'j2c_activity':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const activityContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("**Голосовые активности**\n\nНажмите правой кнопкой на голосовой канал и выберите 'Активности', чтобы начать!")
                    );
                await interaction.editReply({
                    components: [activityContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                break;

            case 'j2c_info':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const infoContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**${vc.name}**\n\n` +
                            `**Участников:** ${vc.members.size}\n` +
                            `**Лимит:** ${vc.userLimit || 'Без лимита'}\n` +
                            `**Битрейт:** ${vc.bitrate / 1000}кбит/с`
                        )
                    );
                await interaction.editReply({
                    components: [infoContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                break;

            case 'j2c_increase':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const newLimit = Math.min((vc.userLimit || 0) + 1, 99);
                    await vc.edit({ userLimit: newLimit });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Лимит участников увеличен до ${newLimit}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось увеличить лимит участников.' });
                }
                break;

            case 'j2c_decrease':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const current = vc.userLimit || 1;
                    const newLimit = Math.max(current - 1, 0);
                    await vc.edit({ userLimit: newLimit || null });
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                newLimit === 0 ? 'Лимит участников снят' : `Лимит участников уменьшен до ${newLimit}`
                            )
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Не удалось уменьшить лимит участников.' });
                }
                break;
        }
    }
}

module.exports = VoiceControlView;
