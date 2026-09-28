
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { insertOrUpdateConfig, getConfig } = require('../../../data/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const message = isSlashCommand ? interactionOrMessage : interactionOrMessage;
            const guild = message.guild;
            const userId = isSlashCommand ? message.user.id : message.author.id;

            const existing = await getConfig(guild.id);
            if (existing) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Уже настроено'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Используйте `vanity config` для изменения или `vanity reset`, чтобы начать заново.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, flags: MessageFlags.Ephemeral });
            }

            
            if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# Отказано в доступе\nМне нужно право ManageRoles, чтобы настроить vanity-роли")
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("Выдайте мне это право и попробуйте снова.")
                    );
                
                return message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            
            const roles = guild.roles.cache
                .filter(role => 
                    role.id !== guild.id && 
                    !role.managed && 
                    role.position < guild.members.me.roles.highest.position
                )
                .sort((a, b) => b.position - a.position)
                .first(25);

            if (roles.length === 0) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("### Нет доступных ролей")
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("> Создайте роль ниже самой высокой роли бота\n> Роль не должна управляться приложением")
                    );
                
                return message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            
            const roleSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('vr_role_select')
                .setPlaceholder('Выберите роль для выдачи')
                .addOptions(
                    roles.map(role => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(role.name)
                            .setDescription(`Выдаётся при наличии vanity-кода в статусе`)
                            .setValue(role.id)
                    )
                );

            const setupContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Настройка Vanity-ролей\nВыдавать роль, когда vanity-код появляется в статусе пользователя")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Шаг 1:** Выберите роль для выдачи")
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(roleSelectMenu)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Шаг 2:** Укажите vanity-код (далее)")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Как это работает**\n- Распознаёт: discord.gg/vanitycode, .gg/vanitycode, /vanitycode\n- Выдаёт роль, если найдено в статусе\n- Снимает роль при очистке статуса")
                );

            const msg = await message.reply({
                components: [setupContainer],
                flags: MessageFlags.IsComponentsV2
            });

            let selectedRole = null;

            
            const collector = msg.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === userId,
                time: 300000 
            });

            collector.on('collect', async (interaction) => {
                try {
                    if (interaction.customId === 'vr_role_select') {
                        selectedRole = interaction.values[0];
                        
                        
                        const modal = new ModalBuilder()
                            .setCustomId('vr_code_modal')
                            .setTitle('Vanity-код');

                        const codeInput = new TextInputBuilder()
                            .setCustomId('code_input')
                            .setLabel('Введите vanity-код')
                            .setPlaceholder('напр., "coolserver" для discord.gg/coolserver')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(50);

                        modal.addComponents(new ActionRowBuilder().addComponents(codeInput));

                        try {
                            await interaction.showModal(modal);
                        } catch (error) {
                            console.error('Modal error:', error);
                            return;
                        }

                        
                        try {
                            const modalSubmit = await interaction.awaitModalSubmit({
                                time: 300000
                            });

                            const vanityCode = modalSubmit.fields.getTextInputValue('code_input').toLowerCase().trim();

                            
                            await insertOrUpdateConfig(guild.id, selectedRole, vanityCode);

                            const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`### Настройка завершена`)
                                )
                                .addSeparatorComponents(
                                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `**Роль:** <@&${selectedRole}>\n` +
                                        `**Vanity-код:** ${vanityCode}\n` +
                                        `> Пользователи с "${vanityCode}" в статусе будут автоматически получать роль`
                                    )
                                );

                            await modalSubmit.reply({
                                components: [successContainer],
                                flags: MessageFlags.IsComponentsV2
                            });

                            collector.stop();
                        } catch (error) {
                            if (error.code !== 'InteractionCollectorError') {
                                console.error('Modal error:', error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Setup error:', error);
                }
            });

            collector.on('end', () => {
                
            });

        } catch (error) {
            console.error('Setup command error:', error);
            const { ContainerBuilder, TextDisplayBuilder} = require('discord.js');
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Ошибка\nНе удалось настроить vanity-роли")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }
    }
};
