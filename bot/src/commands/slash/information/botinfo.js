
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const os = require('os');
const fs = require('fs');

function pad(key, width = 12) {
    return key + ' '.repeat(Math.max(1, width - key.length));
}

function formatRam(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' ГБ';
}

async function getCpuUsage() {
    const start = os.cpus().map(c => ({ ...c.times }));
    await new Promise(r => setTimeout(r, 150));
    const end = os.cpus().map(c => ({ ...c.times }));
    let idle = 0, total = 0;
    for (let i = 0; i < start.length; i++) {
        for (const type of Object.keys(start[i])) {
            const diff = end[i][type] - start[i][type];
            total += diff;
            if (type === 'idle') idle += diff;
        }
    }
    return ((1 - idle / total) * 100).toFixed(1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription("Показать информацию о боте"),

    async execute(interaction) {
        await interaction.deferReply();

        const { client } = interaction;

        const servers  = client.guilds.cache.size;
        const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
        const cpuUsage = await getCpuUsage();
        const avatarURL = client.user.displayAvatarURL({ size: 256 });

        let diskFree = 'н/д';
        try {
            const d = fs.statfsSync('/');
            diskFree = (d.bsize * d.bavail / 1e9).toFixed(1) + ' ГБ свободно';
        } catch (_) {}

        const cpuModel = os.cpus()[0]?.model?.trim() ?? 'Неизвестно';
        const cores    = os.cpus().length;
        const ramTotal = formatRam(os.totalmem());
        let diskTotal  = 'н/д';
        try {
            const d = fs.statfsSync('/');
            diskTotal = (d.bsize * d.blocks / 1e9).toFixed(1) + ' ГБ';
        } catch (_) {}

        const sysType = `${os.type()} ${os.release()}`;

        const botOverview =
            `### Обзор бота\n` +
            `\`\`\`asciidoc\n` +
            `- ${pad('Серверы')}:: ${servers}\n` +
            `- ${pad('Пользователи')}:: ${users.toLocaleString('ru-RU')}\n` +
            `- ${pad('Кластеры')}:: 1\n` +
            `- ${pad('Использование RAM')}:: ${ramUsage} МБ\n` +
            `- ${pad('Загрузка CPU')}:: ${cpuUsage}%\n` +
            `- ${pad('Диск')}:: ${diskFree}\n` +
            `\`\`\``;

        const sysInfo =
            `### Информация о системе\n` +
            `\`\`\`asciidoc\n` +
            `- ${pad('Система')}:: ${sysType}\n` +
            `- ${pad('Процессор')}:: ${cpuModel}\n` +
            `- ${pad('Ядра')}:: ${cores}\n` +
            `- ${pad('RAM')}:: ${ramTotal}\n` +
            `- ${pad('Диск')}:: ${diskTotal}\n` +
            `\`\`\``;

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(botOverview)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(avatarURL)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(sysInfo)
            );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
