
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const os = require('os');
const fs = require('fs');

function getCPUUsage() {
    const cpus = os.cpus();
    const before = cpus.map(c => ({ ...c.times }));
    return new Promise(resolve => {
        setTimeout(() => {
            const after = os.cpus();
            let idle = 0, total = 0;
            after.forEach((cpu, i) => {
                for (const t in cpu.times) {
                    const diff = cpu.times[t] - before[i][t];
                    if (t === 'idle') idle += diff;
                    total += diff;
                }
            });
            resolve(((1 - idle / total) * 100).toFixed(1));
        }, 200);
    });
}

function getDiskInfo() {
    try {
        const stat = fs.statfsSync('/');
        const free = ((stat.bfree * stat.bsize) / (1024 ** 3)).toFixed(1);
        const total = ((stat.blocks * stat.bsize) / (1024 ** 3)).toFixed(1);
        return { free, total };
    } catch {
        return { free: 'н/д', total: 'н/д' };
    }
}

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
}

module.exports = {
    name: 'stats',
    description: "Показать системную статистику бота",
    aliases: ['botstats', 'statistics'],

    async execute(message) {
        const { client } = message;

        const servers = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const commands = (client.prefixCommands?.size || 0) + (client.commands?.size || 0);
        const shards = client.ws.shards?.size || 1;
        const uptime = formatUptime(client.uptime);
        const memory = (process.memoryUsage().heapUsed / (1024 ** 2)).toFixed(1);
        const cpuUsage = await getCPUUsage();
        const disk = getDiskInfo();

        const p = (label, value, w = 12) => `- ${label.padEnd(w)}:: ${value}`;

        const botBlock = [
            '```asciidoc',
            p('Серверы', servers),
            p('Пользователи', users),
            p('Команды', commands),
            p('Время работы', uptime),
            p('Шарды', shards),
            p('Память', `${memory} МБ`),
            p('Процессор', `${cpuUsage}%`),
            p('Свободно на диске', `${disk.free} ГБ`),
            '```'
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(botBlock));

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
