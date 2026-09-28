
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const sequelize = require('../../../data/sequelize');

module.exports = {
    name: 'avgping',
    description: 'Проверить средний пинг бота по нескольким замерам',
    aliases: ['averageping', 'avglatency'],
    
    async execute(message) {
        const sent = await message.reply({ content: 'Считаю...', fetchReply: true });

        const sampleCount = 5;
        const dbSamples = [];

        for (let i = 0; i < sampleCount; i++) {
            const start = Date.now();
            try { await sequelize.query('SELECT 1'); } catch (_) {}
            dbSamples.push(Date.now() - start);
            if (i < sampleCount - 1) await new Promise(r => setTimeout(r, 100));
        }

        const roundTrip = sent.createdTimestamp - message.createdTimestamp;
        const avgDb = +(dbSamples.reduce((a, b) => a + b, 0) / sampleCount).toFixed(1);
        const avg = +((avgDb + roundTrip) / 2).toFixed(1);

        const ansi = [
            '```ansi',
            `\u001b[1;35mСредний пинг\u001b[0m\u001b[1;33m  (${sampleCount} замеров)\u001b[0m`,
            `\u001b[1;36mВремя отклика    :: ${roundTrip} MS\u001b[0m`,
            `\u001b[1;36mСредний по БД    :: ${avgDb} MS\u001b[0m`,
            `\u001b[1;36mОбщий средний    :: ${avg} MS\u001b[0m`,
            '```'
        ].join('\n');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(ansi)
            );

        await sent.edit({
            content: null,
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },
};
