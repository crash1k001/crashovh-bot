
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'uptime',
    description: 'Узнать, сколько бот работает без перезагрузки',
    aliases: ['up', 'online'],
    
    async execute(message) {
        const { client } = message;
        
        const uptimeMs = client.uptime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        const uptimeFull = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        const uptimeShort = days > 0 ? `${days} days, ${hours} hours` : hours > 0 ? `${hours} hours, ${minutes} minutes` : `${minutes} minutes, ${seconds} seconds`;
        
        const startTime = Math.floor((Date.now() - uptimeMs) / 1000);
        const currentTime = Math.floor(Date.now() / 1000);
        
        const wsLatency = client.ws.ping;
        const status = wsLatency < 100 ? `${emojis.online} Отлично` : wsLatency < 200 ? `${emojis.idle} Хорошо` : `${emojis.dnd} Плохо`;

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Время работы бота**`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Время работы**: \`${uptimeFull}\`\n` +
                    `**Запущен**: <t:${startTime}:R>\n` +
                    `**Вебсокет**: \`${wsLatency}ms\``
                )
            );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
    },
};
