
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const sequelize = require('../../../data/sequelize');

function pad(key, width = 7) {
    return key + ' '.repeat(Math.max(1, width - key.length));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Проверить пинг бота'),

    async execute(interaction) {
        await interaction.deferReply();

        const wsLatency = interaction.client.ws.ping;

        const t0 = Date.now();
        try { await sequelize.query('SELECT 1'); } catch (_) {}
        const readMs = (Date.now() - t0).toFixed(2);

        const t1 = Date.now();
        try { await sequelize.query('SELECT NOW()'); } catch (_) {}
        const writeMs = (Date.now() - t1).toFixed(2);

        const t2 = Date.now();
        try { await sequelize.query('SELECT 1+1'); } catch (_) {}
        const deleteMs = (Date.now() - t2).toFixed(2);

        const ESC = '\u001b';
        const purple = `${ESC}[1;35m`;
        const cyan   = `${ESC}[1;36m`;
        const reset  = `${ESC}[0m`;

        const latencyBlock = [
            '```ansi',
            `${purple}Пинг${reset}`,
            `${cyan}${pad('Бот')}:: v1${reset}`,
            `${cyan}${pad('Пинг')}:: ${wsLatency} MS${reset}`,
            '```'
        ].join('\n');

        const dbBlock = [
            '```ansi',
            `${purple}Производительность БД${reset}`,
            `${cyan}${pad('Чтение')}:: ${readMs} MS${reset}`,
            `${cyan}${pad('Запись')}:: ${writeMs} MS${reset}`,
            `${cyan}${pad('Удаление')}:: ${deleteMs} MS${reset}`,
            '```'
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(latencyBlock)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(dbBlock)
            );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },
};
