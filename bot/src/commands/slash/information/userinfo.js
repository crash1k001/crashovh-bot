
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  ComponentType
} = require("discord.js");

const emojis = require('../../../emojis.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Показать подробную информацию о пользователе")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Пользователь, о котором нужна информация")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const user = targetUser;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const userCreated = Math.floor(user.createdTimestamp / 1000);
    const memberJoined = member ? Math.floor(member.joinedTimestamp / 1000) : null;
    
    const presence = member?.presence;
    const status = presence?.status || 'offline';
    const activities = presence?.activities || [];
    
    const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guild.id) : null;
    const roleCount = roles ? roles.size : 0;
    const highestRole = member?.roles.highest;
    
    const permissions = member?.permissions.toArray() || [];
    const keyPermissions = permissions.filter(p => 
      ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageMessages', 'ManageRoles', 'BanMembers', 'KickMembers'].includes(p)
    );

    const statusEmojis = {
      online: emojis.online,
      idle: emojis.idle, 
      dnd: emojis.dnd,
      offline: emojis.offline
    };

    const buildUserOverviewContainer = () => {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.user} Информация о ${user.username}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`## ${emojis.clipboard} Основная информация`),
              new TextDisplayBuilder().setContent(`**Имя пользователя**: ${user.username}\n**Отображаемое имя**: ${user.displayName || user.username}\n**ID пользователя**: ${user.id}\n**Аккаунт создан**: <t:${userCreated}:F> (<t:${userCreated}:R>)`)
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
            )
        );

      if (member) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.house} Информация о сервере`),
            new TextDisplayBuilder().setContent(`**Вступил на сервер**: <t:${memberJoined}:F> (<t:${memberJoined}:R>)\n**Никнейм на сервере**: ${member.nickname || 'Нет'}\n**Статус**: ${statusEmojis[status]} ${statusLabels[status] || status}\n**Количество ролей**: ${roleCount}`)
          );

        if (highestRole && highestRole.id !== interaction.guild.id) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Высшая роль**: ${highestRole.name}`)
          );
        }
      }

      return container;
    };

    const buildRolesContainer = () => {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.masks} Роли ${user.username}\n*Роли и права на сервере*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

      if (!member) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${emojis.cross} Не участник сервера\n*Этот пользователь не состоит на сервере.*`)
        );
        return container;
      }

      if (roleCount === 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${emojis.memo} Роли\n*У этого пользователя нет ролей.*`)
        );
      } else {
        const roleList = roles.sort((a, b) => b.position - a.position).map(role => `@${role.name}`).join(', ');
        const topRole = roles.sort((a, b) => b.position - a.position).first();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${emojis.memo} Роли (${roleCount})`),
          new TextDisplayBuilder().setContent(`**Высшая роль**: @${topRole.name}\n**Все роли**: ${roleList}`)
        );
      }

      if (keyPermissions.length > 0) {
        const permList = keyPermissions.map(p => p.replace(/([A-Z])/g, ' $1').trim()).join('\n');
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.key} Ключевые права`),
            new TextDisplayBuilder().setContent(`\`\`\`\n${permList}\n\`\`\``)
          );
      }

      return container;
    };

    const buildActivityContainer = () => {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.fun} Активность ${user.username}\n*Текущий статус и занятия*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${statusEmojis[status]} Текущий статус`),
          new TextDisplayBuilder().setContent(`**Статус**: ${statusLabels[status] || status}`)
        );

      if (activities.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.target} Занятия`)
          );

        activities.slice(0, 3).forEach((activity, index) => {
          const activityTypes = {
            0: `${emojis.fun} Играет в`,
            1: `${emojis.tv} Стримит`, 
            2: `${emojis.musicNote} Слушает`,
            3: `${emojis.tv} Смотрит`,
            4: `${emojis.pencil} Произвольный статус`,
            5: `${emojis.trophy} Участвует в`
          };
          
          const activityType = activityTypes[activity.type] || `${emojis.question} Неизвестно`;
          let activityText = `**${activityType}**: ${activity.name}`;
          
          if (activity.details) activityText += `\n*${activity.details}*`;
          if (activity.state) activityText += `\n*${activity.state}*`;
          
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(activityText)
          );
          
          if (index < activities.length - 1 && index < 2) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
          }
        });
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('*Нет текущих занятий*')
        );
      }

      return container;
    };

    const addMenuToContainer = (container, currentView = 'overview') => {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('userinfo_menu')
            .setPlaceholder('Выберите категорию информации')
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel('Обзор пользователя')
                .setValue('overview')
                .setDefault(currentView === 'overview'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Роли и права')
                .setValue('roles')
                .setDefault(currentView === 'roles'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Активность и статус')
                .setValue('activity')
                .setDefault(currentView === 'activity')
            )
        )
      );

      return container;
    };

    const initialContainer = addMenuToContainer(buildUserOverviewContainer(), 'overview');
    
    if (user.bannerURL()) {
      initialContainer.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(user.bannerURL({ size: 1024 }))
            .setDescription(`Баннер ${user.username}`)
        )
      );
    }

    const response = await interaction.reply({
      components: [initialContainer],
      flags: MessageFlags.IsComponentsV2
    });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Это меню может использовать только автор команды!')
          );
        return i.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }

      if (i.customId === 'userinfo_menu') {
        const value = i.values[0];

        let containerToShow;
        if (value === 'overview') {
          containerToShow = addMenuToContainer(buildUserOverviewContainer(), 'overview');
        } else if (value === 'roles') {
          containerToShow = addMenuToContainer(buildRolesContainer(), 'roles');
        } else if (value === 'activity') {
          containerToShow = addMenuToContainer(buildActivityContainer(), 'activity');
        }

        if (value === 'overview' && user.bannerURL()) {
          containerToShow.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder()
                .setURL(user.bannerURL({ size: 1024 }))
                .setDescription(`Баннер ${user.username}`)
            )
          );
        }

        await i.update({
          components: [containerToShow],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });

    collector.on('end', async () => {
      try {
        const disabledContainer = buildUserOverviewContainer();
        disabledContainer.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );
        disabledContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('userinfo_menu_disabled')
              .setPlaceholder(`${emojis.user} Меню истекло`)
              .setDisabled(true)
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Истекло')
                  .setValue('expired')
              )
          )
        );
        
        if (user.bannerURL()) {
          disabledContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder()
                .setURL(user.bannerURL({ size: 1024 }))
                .setDescription(`Баннер ${user.username}`)
            )
          );
        }
        
        await interaction.editReply({ 
          components: [disabledContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        
      }
    });
  }
};
