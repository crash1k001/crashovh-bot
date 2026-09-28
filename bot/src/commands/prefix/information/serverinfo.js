
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ChannelType,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ComponentType
} = require("discord.js");

const emojis = require('../../../emojis.json');
const { createPaginationSession } = require('../../../lib/pagination');

module.exports = {
  name: "serverinfo",
  description: "Показать подробную информацию о сервере",
  aliases: ["sinfo", "si"],

  async execute(message, args) {
    const guild = message.guild;
    let currentView = 'general';
    let activeSession = null;
    
    const createdAt = guild.createdAt.toISOString().slice(0, 19).replace('T', ' ');
    const verificationLevels = { 0: 'Отсутствует', 1: 'Низкий', 2: 'Средний', 3: 'Высокий', 4: 'Очень высокий' };
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    
    const allRoles = Array.from(guild.roles.cache.values()).reverse();
    const allEmojis = Array.from(guild.emojis.cache.values());
    const rolesPerPage = 20;
    const emojisPerPage = 20;
    const totalRolePages = Math.ceil(allRoles.length / rolesPerPage) || 1;
    const totalEmojiPages = Math.ceil(allEmojis.length / emojisPerPage) || 1;

    const buildGeneralContainer = () => {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${guild.name}`)
      );
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      
      if (guild.description) {
        if (guild.icon) {
          container.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**__Описание__**\n${guild.description}`)
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true, size: 256 }))
              )
          );
        } else {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**__Описание__**\n${guild.description}`)
          );
        }
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
      }
      
      let aboutContent = `**__О сервере__**\n`;
      aboutContent += `**Название:** ${guild.name}\n`;
      aboutContent += `**ID:** ${guild.id}\n`;
      aboutContent += `**Владелец:** <@${guild.ownerId}>\n`;
      aboutContent += `**Создан:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n`;
      aboutContent += `**Участников:** ${guild.memberCount}`;
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(aboutContent)
      );
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      
      let statsContent = `**__Общая статистика__**\n`;
      statsContent += `**Уровень верификации:** ${verificationLevels[guild.verificationLevel] || guild.verificationLevel}\n`;
      statsContent += `**Каналов:** ${guild.channels.cache.size}\n`;
      statsContent += `**Ролей:** ${guild.roles.cache.size}\n`;
      statsContent += `**Уровень буста:** ${guild.premiumTier} (Бустов: ${guild.premiumSubscriptionCount || 0})`;
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(statsContent)
      );
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      
      let channelsContent = `**__Каналы__**\n`;
      channelsContent += `**Всего:** ${guild.channels.cache.size}\n`;
      channelsContent += `Каналы: ${textChannels} текстовых, ${voiceChannels} голосовых`;
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(channelsContent)
      );
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      if (guild.banner) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(guild.bannerURL({ dynamic: true, size: 1024 }))
              .setDescription(`Баннер сервера ${guild.name}`)
          )
        );
      }
      
      return container;
    };

    const createDropdown = () => {
      return new StringSelectMenuBuilder()
        .setCustomId('serverinfo_select')
        .setPlaceholder('Выберите категорию информации')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Общая информация')
            .setDescription('Базовая информация и статистика сервера')
            .setValue('general'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Роли сервера')
            .setDescription(`Все ${allRoles.length} ролей сервера с постраничным просмотром`)
            .setValue('roles'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Эмодзи сервера')
            .setDescription(`Все ${allEmojis.length} эмодзи сервера с постраничным просмотром`)
            .setValue('emojis')
        );
    };

    const addMenuToContainer = (container) => {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );
      return container;
    };

    const renderRolesPage = async (pageIndex, pageData, state) => {
      const startIndex = pageIndex * rolesPerPage;
      const endIndex = Math.min(startIndex + rolesPerPage, allRoles.length);
      const pageRoles = allRoles.slice(startIndex, endIndex);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Роли сервера`)
      );
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      
      let content = `*Страница ${pageIndex + 1} из ${totalRolePages} • Показано ролей: ${pageRoles.length}*\n\n`;
      
      pageRoles.forEach((role, index) => {
        const roleNumber = startIndex + index + 1;
        content += `**${roleNumber}.** \`${role.name}\` - \`${role.id}\`\n`;
      });
      
      content += `\n**Всего ролей:** ${allRoles.length}`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );
      
      return container;
    };

    const renderEmojisPage = async (pageIndex, pageData, state) => {
      const startIndex = pageIndex * emojisPerPage;
      const endIndex = Math.min(startIndex + emojisPerPage, allEmojis.length);
      const pageEmojis = allEmojis.slice(startIndex, endIndex);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Эмодзи сервера`)
      );
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      
      let content = `*Страница ${pageIndex + 1} из ${totalEmojiPages} • Показано эмодзи: ${pageEmojis.length}*\n\n`;
      
      pageEmojis.forEach((emoji, index) => {
        const emojiNumber = startIndex + index + 1;
        content += `**${emojiNumber}.** ${emoji} - \`${emoji.name}\` ${emoji.animated ? '(Анимированный)' : ''}\n`;
      });
      
      content += `\n**Всего эмодзи:** ${allEmojis.length}`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
      
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );
      
      return container;
    };

    const generalContainer = addMenuToContainer(buildGeneralContainer());

    const response = await message.reply({
      components: [generalContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [] }
    });

    const dropdownCollector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000
    });

    dropdownCollector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Вы не можете взаимодействовать с этим сообщением.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const selectedView = interaction.values[0];
      currentView = selectedView;

      if (activeSession) {
        activeSession.stop();
        activeSession = null;
      }

      if (selectedView === 'general') {
        const container = addMenuToContainer(buildGeneralContainer());
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } else if (selectedView === 'roles') {
        await interaction.deferUpdate();
        
        activeSession = createPaginationSession({
          interactionOrMessage: response,
          pages: async (pageIndex) => pageIndex,
          renderPage: renderRolesPage,
          userId: message.author.id,
          totalPages: totalRolePages,
          initialPage: 0,
          timeout: 300000,
          useEdit: true
        });
        
        await activeSession.renderInitial();
      } else if (selectedView === 'emojis') {
        await interaction.deferUpdate();
        
        activeSession = createPaginationSession({
          interactionOrMessage: response,
          pages: async (pageIndex) => pageIndex,
          renderPage: renderEmojisPage,
          userId: message.author.id,
          totalPages: totalEmojiPages,
          initialPage: 0,
          timeout: 300000,
          useEdit: true
        });
        
        await activeSession.renderInitial();
      }
    });

    dropdownCollector.on('end', () => {
      if (activeSession) {
        activeSession.stop();
      }
      response.edit({ components: [] }).catch(() => {});
    });
  }
};
