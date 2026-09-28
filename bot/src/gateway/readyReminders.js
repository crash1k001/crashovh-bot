
const { Events, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const remindersDb = require('../data/reminders');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Skip a tick while the DB is unreachable instead of hammering a broken
        // connection every 10s (prevents reminder error spam after a timeout).
        let backoffUntil = 0;
        setInterval(async () => {
            if (Date.now() < backoffUntil) return;
            try {
                const now = Date.now();
                const due = await remindersDb.getPendingReminders(now);

                for (const reminder of due) {
                    await remindersDb.deleteReminder(reminder.id);

                    const setAt = Math.floor(Number(reminder.createdAt) / 1000);
                    const body = `> **Message:** ${reminder.message}\n> Set <t:${setAt}:f>`;

                    const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('**Reminder Ended**')
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(body)
                        );

                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`<@${reminder.userId}> **Reminder Ended**`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(body)
                        );

                    try {
                        const user = await client.users.fetch(reminder.userId).catch(() => null);
                        if (user) {
                            await user.send({
                                components: [dmContainer],
                                flags: MessageFlags.IsComponentsV2,
                            });
                            continue;
                        }
                    } catch (_) {}

                    try {
                        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
                        if (channel && channel.isTextBased()) {
                            await channel.send({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { users: [reminder.userId] },
                            });
                        }
                    } catch (_) {}
                }
            } catch (error) {
                const msg = String(error?.message ?? error);
                if (/Connection terminated|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(msg)) {
                    // transient DB outage: quiet retry in 30s, no error spam
                    backoffUntil = Date.now() + 30_000;
                    console.warn('[Reminders] DB недоступен, повтор через 30с:', msg);
                } else {
                    console.error('[Reminders] Error processing reminders:', error);
                }
            }
        }, 10000);
    }
};
