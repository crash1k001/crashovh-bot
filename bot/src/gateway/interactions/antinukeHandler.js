
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder
} = require('discord.js');
const { AntinukeConfig, AntinukeWhitelist } = require('../../data/models');
const emojis = require('../../emojis.json');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isStringSelectMenu()) {
    if (id === 'antinuke_setup_modules') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedModules = interaction.values;
      const allModules = ['antiBan', 'antiKick', 'antiChannelCreate', 'antiChannelDelete', 'antiChannelEdit', 'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate', 'antiWebhook', 'antiBot', 'antiEmoji'];

      const updateData = {};
      for (const mod of allModules) {
        updateData[mod] = selectedModules.includes(mod);
      }

      await AntinukeConfig.update(updateData, { where: { guildId: guild.id } });

      return interaction.deferUpdate();
    }

    if (id.startsWith('antinuke_whitelist_events:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];
      const selectedEvents = interaction.values;

      const existing = await AntinukeWhitelist.findOne({
        where: { guildId: guild.id, userId }
      });

      if (existing) {
        const currentEvents = existing.events || [];
        const mergedEvents = [...new Set([...currentEvents, ...selectedEvents])];
        await existing.update({ events: mergedEvents });
      } else {
        await AntinukeWhitelist.create({
          guildId: guild.id,
          userId: userId,
          addedBy: interaction.user.id,
          events: selectedEvents
        });
      }

      const EVENTS = AntinukeWhitelist.EVENTS;
      const eventNames = selectedEvents.map(e => EVENTS[e] || e).join(', ');

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<@${userId}> добавлен в исключения для: **${eventNames}**`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('antinuke_whitelist_remove_events:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];
      const eventsToRemove = interaction.values;

      const existing = await AntinukeWhitelist.findOne({
        where: { guildId: guild.id, userId }
      });

      if (!existing) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Пользователь не в списке исключений.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const currentEvents = existing.events || [];
      const remainingEvents = currentEvents.filter(e => !eventsToRemove.includes(e));

      if (remainingEvents.length === 0) {
        await existing.destroy();
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`<@${userId}> удалён из списка исключений.`)
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      await existing.update({ events: remainingEvents });

      const EVENTS = AntinukeWhitelist.EVENTS;
      const removedNames = eventsToRemove.map(e => EVENTS[e] || e).join(', ');

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Убраны исключения для: **${removedNames}**`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_punishment_select') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const punishment = interaction.values[0];
      await AntinukeConfig.update({ punishment }, { where: { guildId: guild.id } });
      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка антинюка\n**Шаг 2 из 3** — Порог и наказание')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройте, сколько действий запускает антинюк и какое наказание применять:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Выберите порог')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 действия').setValue('2').setDefault(config.threshold === 2),
                new StringSelectMenuOptionBuilder().setLabel('3 действия').setValue('3').setDefault(config.threshold === 3),
                new StringSelectMenuOptionBuilder().setLabel('5 действий').setValue('5').setDefault(config.threshold === 5),
                new StringSelectMenuOptionBuilder().setLabel('10 действий').setValue('10').setDefault(config.threshold === 10)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Выберите наказание')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Снять все роли').setDescription('Снять все роли с нарушителя').setValue('stripall').setDefault(config.punishment === 'stripall'),
                new StringSelectMenuOptionBuilder().setLabel('Кикнуть').setDescription('Кикнуть нарушителя с сервера').setValue('kick').setDefault(config.punishment === 'kick'),
                new StringSelectMenuOptionBuilder().setLabel('Забанить').setDescription('Забанить нарушителя на сервере').setValue('ban').setDefault(config.punishment === 'ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_next_2')
              .setLabel('Далее')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_threshold_select') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const threshold = parseInt(interaction.values[0]);
      await AntinukeConfig.update({ threshold }, { where: { guildId: guild.id } });
      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка антинюка\n**Шаг 2 из 3** — Порог и наказание')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройте, сколько действий запускает антинюк и какое наказание применять:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Выберите порог')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 действия').setValue('2').setDefault(config.threshold === 2),
                new StringSelectMenuOptionBuilder().setLabel('3 действия').setValue('3').setDefault(config.threshold === 3),
                new StringSelectMenuOptionBuilder().setLabel('5 действий').setValue('5').setDefault(config.threshold === 5),
                new StringSelectMenuOptionBuilder().setLabel('10 действий').setValue('10').setDefault(config.threshold === 10)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Выберите наказание')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Снять все роли').setDescription('Снять все роли с нарушителя').setValue('stripall').setDefault(config.punishment === 'stripall'),
                new StringSelectMenuOptionBuilder().setLabel('Кикнуть').setDescription('Кикнуть нарушителя с сервера').setValue('kick').setDefault(config.punishment === 'kick'),
                new StringSelectMenuOptionBuilder().setLabel('Забанить').setDescription('Забанить нарушителя на сервере').setValue('ban').setDefault(config.punishment === 'ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_next_2')
              .setLabel('Далее')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isUserSelectMenu()) {
    if (id === 'antinuke_whitelist_add') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedUser = interaction.users.first();
      if (!selectedUser) {
        return interaction.update({ components: [] });
      }

      const EVENTS = AntinukeWhitelist.EVENTS;
      const eventOptions = Object.entries(EVENTS).map(([value, label]) => ({
        label: label,
        value: value,
        description: `Исключение для ${label}`
      }));

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Добавить в исключения: ${selectedUser.username}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите, для каких событий добавить исключение:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`antinuke_whitelist_events:${selectedUser.id}`)
              .setPlaceholder('Выберите события для исключения')
              .setMinValues(1)
              .setMaxValues(Object.keys(EVENTS).length)
              .addOptions(eventOptions)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`antinuke_whitelist_all:${selectedUser.id}`)
              .setLabel('Исключить из всех событий')
              .setStyle(ButtonStyle.Primary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_remove') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedUser = interaction.users.first();
      if (!selectedUser) {
        return interaction.update({ components: [] });
      }

      const deleted = await AntinukeWhitelist.destroy({
        where: { guildId: guild.id, userId: selectedUser.id }
      });

      if (!deleted) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${selectedUser.username}** не в списке исключений.`)
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${selectedUser.username}** удалён из списка исключений.`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isButton()) {
    if (id === 'antinuke_setup_next_1') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка антинюка\n**Шаг 2 из 3** — Порог и наказание')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройте, сколько действий запускает антинюк и какое наказание применять:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Выберите порог')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 действия').setValue('2'),
                new StringSelectMenuOptionBuilder().setLabel('3 действия').setValue('3').setDefault(true),
                new StringSelectMenuOptionBuilder().setLabel('5 действий').setValue('5'),
                new StringSelectMenuOptionBuilder().setLabel('10 действий').setValue('10')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Выберите наказание')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Снять все роли').setDescription('Снять все роли с нарушителя').setValue('stripall').setDefault(true),
                new StringSelectMenuOptionBuilder().setLabel('Кикнуть').setDescription('Кикнуть нарушителя с сервера').setValue('kick'),
                new StringSelectMenuOptionBuilder().setLabel('Забанить').setDescription('Забанить нарушителя на сервере').setValue('ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_next_2')
              .setLabel('Далее')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_setup_next_2') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка антинюка\n**Шаг 3 из 3** — Канал логов')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите канал для оповещений антинюка:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('antinuke_setup_logs')
              .setPlaceholder('Выберите канал логов')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_finish')
              .setLabel('Завершить настройку')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_setup_finish') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const [config] = await AntinukeConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });
      try {
        config.enabled = true;
        await config.save();
      } catch (err) {
        console.error('[ANTINUKE SETUP] Failed to enable antinuke:', err.message);
      }

      const enabledModules = [];
      const moduleNames = {
        antiBan: 'Анти-бан',
        antiKick: 'Анти-кик',
        antiChannelCreate: 'Анти-создание каналов',
        antiChannelDelete: 'Анти-удаление каналов',
        antiRoleCreate: 'Анти-создание ролей',
        antiRoleDelete: 'Анти-удаление ролей',
        antiRoleUpdate: 'Анти-изменение ролей',
        antiWebhook: 'Анти-вебхуки',
        antiBot: 'Анти-бот'
      };

      for (const [key, name] of Object.entries(moduleNames)) {
        if (config[key]) enabledModules.push(name);
      }

      const punishmentLabels = { stripall: 'Снять все роли', kick: 'Кик', ban: 'Бан' };

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка антинюка завершена!')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Ваш сервер теперь защищён!\n\n` +
            `**Порог:** ${config.threshold} действий за ${config.timeframe}с\n` +
            `**Наказание:** ${punishmentLabels[config.punishment]}\n` +
            `**Канал логов:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Не задан'}\n\n` +
            `**Включённые модули:**\n${enabledModules.map(m => `${emojis.enabled} ${m}`).join('\n') || 'Нет'}`
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_setup_cancel') {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройка отменена')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройка антинюка отменена.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_toggle') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может включать/отключать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
      if (!config) return true;

      await config.update({ enabled: !config.enabled });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Антинюк ${config.enabled ? 'включён' : 'отключён'}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            config.enabled
              ? 'Антинюк включён. Ваш сервер теперь защищён.'
              : 'Антинюк отключён. Ваш сервер больше не защищён.'
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_add_btn') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Добавить в исключения')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите пользователя для добавления в исключения:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
              .setCustomId('antinuke_whitelist_add')
              .setPlaceholder('Выберите пользователя')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_remove_btn') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Убрать из исключений')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите пользователя для удаления из исключений:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
              .setCustomId('antinuke_whitelist_remove')
              .setPlaceholder('Выберите пользователя для удаления')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('antinuke_whitelist_all:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];

      const existing = await AntinukeWhitelist.findOne({
        where: { guildId: guild.id, userId }
      });

      if (existing) {
        await existing.update({ events: null });
      } else {
        await AntinukeWhitelist.create({
          guildId: guild.id,
          userId: userId,
          addedBy: interaction.user.id,
          events: null
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<@${userId}> добавлен в исключения для **всех событий**.`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('antinuke_whitelist_remove_all:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может управлять списком исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];

      const deleted = await AntinukeWhitelist.destroy({
        where: { guildId: guild.id, userId }
      });

      if (!deleted) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Пользователь не в списке исключений.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<@${userId}> удалён из списка исключений.`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_list_btn') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может смотреть список исключений.',
          flags: MessageFlags.Ephemeral
        });
      }

      const whitelist = await AntinukeWhitelist.findAll({ where: { guildId: guild.id } });
      const EVENTS = AntinukeWhitelist.EVENTS;

      if (whitelist.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Список исключений антинюка')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Нет пользователей в списке исключений.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let detailedContent = '';
      for (const w of whitelist) {
        const events = w.events;
        let eventList;
        if (!events || events.length === 0) {
          eventList = '`Все события`';
        } else {
          eventList = events.map(e => `\`${EVENTS[e] || e}\``).join(', ');
        }
        detailedContent += `<@${w.userId}>\n${eventList}\n\n`;
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Список исключений антинюка — подробно (${whitelist.length})`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(detailedContent.trim())
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_whitelist_add_btn')
              .setLabel('Добавить')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('antinuke_whitelist_remove_btn')
              .setLabel('Убрать')
              .setStyle(ButtonStyle.Danger)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_edit_modules') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может изменять настройки антинюка.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Изменить модули')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите модули защиты для включения:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_setup_modules')
              .setPlaceholder('Выберите модули для включения')
              .setMinValues(0)
              .setMaxValues(9)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Анти-бан').setDescription('Предотвращать массовый бан').setValue('antiBan').setDefault(config.antiBan),
                new StringSelectMenuOptionBuilder().setLabel('Анти-кик').setDescription('Предотвращать массовый кик').setValue('antiKick').setDefault(config.antiKick),
                new StringSelectMenuOptionBuilder().setLabel('Анти-создание каналов').setDescription('Предотвращать массовое создание каналов').setValue('antiChannelCreate').setDefault(config.antiChannelCreate),
                new StringSelectMenuOptionBuilder().setLabel('Анти-удаление каналов').setDescription('Предотвращать массовое удаление каналов').setValue('antiChannelDelete').setDefault(config.antiChannelDelete),
                new StringSelectMenuOptionBuilder().setLabel('Анти-создание ролей').setDescription('Предотвращать массовое создание ролей').setValue('antiRoleCreate').setDefault(config.antiRoleCreate),
                new StringSelectMenuOptionBuilder().setLabel('Анти-удаление ролей').setDescription('Предотвращать массовое удаление ролей').setValue('antiRoleDelete').setDefault(config.antiRoleDelete),
                new StringSelectMenuOptionBuilder().setLabel('Анти-изменение ролей').setDescription('Предотвращать выдачу опасных прав').setValue('antiRoleUpdate').setDefault(config.antiRoleUpdate),
                new StringSelectMenuOptionBuilder().setLabel('Анти-вебхуки').setDescription('Предотвращать создание вебхуков').setValue('antiWebhook').setDefault(config.antiWebhook),
                new StringSelectMenuOptionBuilder().setLabel('Анти-бот').setDescription('Предотвращать добавление ботов').setValue('antiBot').setDefault(config.antiBot)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_edit_done')
              .setLabel('Готово')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_edit_settings') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может изменять настройки антинюка.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Изменить настройки')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройте порог и наказание:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Выберите порог')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 действия').setValue('2').setDefault(config.threshold === 2),
                new StringSelectMenuOptionBuilder().setLabel('3 действия').setValue('3').setDefault(config.threshold === 3),
                new StringSelectMenuOptionBuilder().setLabel('5 действий').setValue('5').setDefault(config.threshold === 5),
                new StringSelectMenuOptionBuilder().setLabel('10 действий').setValue('10').setDefault(config.threshold === 10)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Выберите наказание')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Снять все роли').setValue('stripall').setDefault(config.punishment === 'stripall'),
                new StringSelectMenuOptionBuilder().setLabel('Кикнуть').setValue('kick').setDefault(config.punishment === 'kick'),
                new StringSelectMenuOptionBuilder().setLabel('Забанить').setValue('ban').setDefault(config.punishment === 'ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('antinuke_setup_logs')
              .setPlaceholder('Выберите канал логов')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_edit_done')
              .setLabel('Готово')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_edit_done') {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройки обновлены')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройки антинюка сохранены.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'antinuke_setup_logs') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Только владелец сервера может настраивать антинюк.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      const channelId = selectedChannel?.id || null;

      await AntinukeConfig.update({ logChannelId: channelId }, { where: { guildId: guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка антинюка\n**Шаг 3 из 3** — Канал логов')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Выберите канал для оповещений антинюка:\n\n` +
            (selectedChannel ? `✅ **Канал логов установлен:** <#${channelId}>` : '⚠️ **Канал не выбран** — логирование будет отключено.')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('antinuke_setup_logs')
              .setPlaceholder(selectedChannel ? `#${selectedChannel.name}` : 'Выберите канал логов')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_finish')
              .setLabel('Завершить настройку')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  return false;
}

module.exports = { handle };
