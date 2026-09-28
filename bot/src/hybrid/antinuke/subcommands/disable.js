
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { AntinukeConfig } = require('../../../data/models');

module.exports = {
    name: 'disable',
    description: 'Отключить систему антинюка',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        
        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Только **Владелец сервера** может отключить антинюк.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
        
        if (!config || !config.enabled) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Не включено')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Антинюк сейчас не включён на этом сервере.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await config.update({ enabled: false });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Антинюк отключён')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Антинюк отключён. Ваш сервер больше не защищён от нюк-атак.')
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};
