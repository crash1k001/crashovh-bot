
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');
const { getConfig, getVanityUsers } = require('../../../data/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const guild = interactionOrMessage.guild;
            const config = await getConfig(guild.id);

            if (!config) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# Настройки отсутствуют\nVanity-роли не настроены для этого сервера")
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("Выполните `/vanityroles setup`, чтобы начать")
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            const role = guild.roles.cache.get(config.roleId);
            const roleName = role ? `<@&${config.roleId}>` : `(роль удалена)`;
            const userCountRow = await getVanityUsers(guild.id);
            const userCount = userCountRow ? userCountRow.total : 0;

            const createdDate = new Date(config.createdAt * 1000);
            const formattedDate = `<t:${Math.floor(config.createdAt)}:d>`;

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Настройки Vanity-ролей")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Роль:** ${roleName}\n` +
                        `**Vanity-код:** ${config.vanityCode}\n` +
                        `**Пользователей с ролью:** ${userCount}\n` +
                        `**Дата настройки:** ${formattedDate}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "**Как это работает**\n" +
                        "- Распознаёт: discord.gg/code, .gg/code, /code в статусе пользователя\n" +
                        "- Автоматически выдаёт роль при обнаружении\n" +
                        "- Снимает роль при очистке статуса"
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error('Config command error:', error);
            const { ContainerBuilder, TextDisplayBuilder} = require('discord.js');
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Ошибка\nНе удалось получить настройки")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }
    }
};
