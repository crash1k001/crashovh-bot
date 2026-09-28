
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
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder
} = require('discord.js');
const { AutomodConfig, AutomodWhitelist } = require('../../data/models');
const emojis = require('../../emojis.json');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === 'automod_setup_next_1') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      let selectedModules = [];

      if (interaction.client.automodSetup?.has(interaction.user.id)) {
        const session = interaction.client.automodSetup.get(interaction.user.id);
        selectedModules = session.selectedModules || [];
      }

      if (selectedModules.length === 0) {
        const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
        if (config) {
          const possibleModules = ['antiSpam', 'antiLink', 'antiInvite', 'antiBadWords', 'antiMassMention', 'antiCaps', 'antiPing'];
          selectedModules = possibleModules.filter(mod => config[mod]);
        }
      }

      if (selectedModules.length === 0) {
        return interaction.reply({
          content: 'Сначала выберите хотя бы один модуль из списка.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.automodSetup) interaction.client.automodSetup = new Map();
      interaction.client.automodSetup.set(interaction.user.id, {
        guildId: interaction.guild.id,
        selectedModules
      });

      const setupModule = require('../../hybrid/automod/subcommands/setup');
      await setupModule.step2(interaction, selectedModules);
      return true;
    }

    if (id === 'automod_setup_next_2') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const setupModule = require('../../hybrid/automod/subcommands/setup');
      await setupModule.step3(interaction);
      return true;
    }

    if (id === 'automod_setup_complete') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.automodSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Сессия истекла. Выполните `/automod setup` заново.',
          flags: MessageFlags.Ephemeral
        });
      }

      let config = null;
      try {
        const session = interaction.client.automodSetup.get(interaction.user.id);
        const selectedModules = session.selectedModules;

        const updateData = {
          enabled: true,
          antiSpam: selectedModules.includes('antiSpam'),
          antiLink: selectedModules.includes('antiLink'),
          antiInvite: selectedModules.includes('antiInvite'),
          antiBadWords: selectedModules.includes('antiBadWords'),
          antiMassMention: selectedModules.includes('antiMassMention'),
          antiCaps: selectedModules.includes('antiCaps'),
          antiPing: selectedModules.includes('antiPing')
        };

        await AutomodConfig.update(updateData, { where: { guildId: interaction.guild.id } });
        config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });

        interaction.client.automodSetup.delete(interaction.user.id);
      } catch (dbError) {
        console.error('[AUTOMOD SETUP] Database error:', dbError.message);
        interaction.client.automodSetup.delete(interaction.user.id);
        return interaction.reply({
          content: 'Ошибка сохранения настроек автомодерации. Попробуйте ещё раз.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Настройка автомодерации завершена!`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

      let punishmentSummary = '';
      const modules = [
        { key: 'antiSpam', name: 'Анти-спам', label: 'antiSpamPunishment' },
        { key: 'antiLink', name: 'Анти-ссылки', label: 'antiLinkPunishment' },
        { key: 'antiInvite', name: 'Анти-инвайты', label: 'antiInvitePunishment' },
        { key: 'antiBadWords', name: 'Анти-маты', label: 'antiBadWordsPunishment' },
        { key: 'antiMassMention', name: 'Анти-масс-упоминания', label: 'antiMassMentionPunishment' },
        { key: 'antiCaps', name: 'Анти-капс', label: 'antiCapsPunishment' },
        { key: 'antiPing', name: 'Анти-пинг', label: 'antiPingPunishment' }
      ];

      for (const mod of modules) {
        if (config[mod.key]) {
          const punishment = config[mod.label] || 'delete';
          const punishmentLabel = {
            'delete': 'Удалить сообщение',
            'warn': 'Удалить и предупредить',
            'mute': 'Мьют',
            'kick': 'Кик',
            'ban': 'Бан'
          }[punishment] || punishment;
          punishmentSummary += `${emojis.success} ${mod.name} → ${punishmentLabel}\n`;
        }
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Включённые защиты:**\n${punishmentSummary || 'Нет'}\n\n` +
          `Используйте \`/automod settings\` для просмотра полной конфигурации.`
        )
      );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_back') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      let config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) {
        config = await AutomodConfig.create({ guildId: interaction.guild.id });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка автомодерации\n**Шаг 1 из 3** — Выбор модулей')
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
              .setCustomId('automod_setup_modules')
              .setPlaceholder('Выберите модули для включения')
              .setMinValues(0)
              .setMaxValues(7)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Анти-спам').setDescription('Ограничение частоты сообщений').setValue('antiSpam').setDefault(config.antiSpam),
                new StringSelectMenuOptionBuilder().setLabel('Анти-ссылки').setDescription('Блокировать внешние ссылки').setValue('antiLink').setDefault(config.antiLink),
                new StringSelectMenuOptionBuilder().setLabel('Анти-инвайты').setDescription('Блокировать инвайты Discord').setValue('antiInvite').setDefault(config.antiInvite),
                new StringSelectMenuOptionBuilder().setLabel('Анти-маты').setDescription('Фильтровать запрещённые слова').setValue('antiBadWords').setDefault(config.antiBadWords),
                new StringSelectMenuOptionBuilder().setLabel('Анти-масс-упоминания').setDescription('Ограничить упоминания').setValue('antiMassMention').setDefault(config.antiMassMention),
                new StringSelectMenuOptionBuilder().setLabel('Анти-капс').setDescription('Блокировать чрезмерный капс').setValue('antiCaps').setDefault(config.antiCaps),
                new StringSelectMenuOptionBuilder().setLabel('Анти-пинг').setDescription('Блокировать @everyone/@here').setValue('antiPing').setDefault(config.antiPing)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_setup_next_1')
              .setLabel('Настроить наказания')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('automod_setup_cancel')
              .setLabel('Отмена')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_cancel') {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка автомодерации отменена')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Процесс настройки отменён. Изменения не применены.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_finish') {
      const guild = interaction.guild;
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**, чтобы настроить автомодерацию.',
          flags: MessageFlags.Ephemeral
        });
      }

      await AutomodConfig.update({ enabled: true }, { where: { guildId: guild.id } });
      const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка автомодерации завершена!')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Статус:** Включена\n` +
            `**Наказание:** ${config.punishment}\n\n` +
            `Используйте \`/automod settings\` для подробной настройки.`
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_toggle') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) return false;

      await config.update({ enabled: !config.enabled });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Автомодерация ${config.enabled ? 'включена' : 'отключена'}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            config.enabled
              ? 'Автомодерация включена. Сообщения будут проверяться.'
              : 'Автомодерация отключена. Сообщения больше не проверяются.'
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_edit_modules') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) return false;

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
              .setCustomId('automod_setup_modules')
              .setPlaceholder('Выберите модули для включения')
              .setMinValues(0)
              .setMaxValues(7)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Анти-спам').setDescription('Ограничение частоты сообщений').setValue('antiSpam').setDefault(config.antiSpam),
                new StringSelectMenuOptionBuilder().setLabel('Анти-ссылки').setDescription('Блокировать внешние ссылки').setValue('antiLink').setDefault(config.antiLink),
                new StringSelectMenuOptionBuilder().setLabel('Анти-инвайты').setDescription('Блокировать инвайты Discord').setValue('antiInvite').setDefault(config.antiInvite),
                new StringSelectMenuOptionBuilder().setLabel('Анти-маты').setDescription('Фильтровать запрещённые слова').setValue('antiBadWords').setDefault(config.antiBadWords),
                new StringSelectMenuOptionBuilder().setLabel('Анти-масс-упоминания').setDescription('Ограничить упоминания').setValue('antiMassMention').setDefault(config.antiMassMention),
                new StringSelectMenuOptionBuilder().setLabel('Анти-капс').setDescription('Блокировать чрезмерный капс').setValue('antiCaps').setDefault(config.antiCaps),
                new StringSelectMenuOptionBuilder().setLabel('Анти-пинг').setDescription('Блокировать @everyone/@here').setValue('antiPing').setDefault(config.antiPing)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_edit_done')
              .setLabel('Готово')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_edit_settings') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) return false;

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Изменить настройки')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Текущие пороги:**\n` +
            `Спам: ${config.spamThreshold} сообщ. / ${config.spamInterval}с\n` +
            `Упоминания: макс. ${config.mentionLimit}\n` +
            `Капс: макс. ${config.capsPercentage}%\n` +
            `**Канал логов:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Не задан'}\n\n` +
            `Выберите канал логов ниже:`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('automod_setup_logs')
              .setPlaceholder('Выберите канал логов')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_edit_done')
              .setLabel('Готово')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_edit_done') {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Настройки обновлены')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Настройки автомодерации сохранены.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_add_btn') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
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
          new TextDisplayBuilder().setContent('Выберите тип для добавления в исключения:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_whitelist_type_user')
              .setLabel('Пользователь')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('automod_whitelist_type_role')
              .setLabel('Роль')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('automod_whitelist_type_channel')
              .setLabel('Канал')
              .setStyle(ButtonStyle.Primary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_type_user') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Добавить пользователя в исключения')
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
              .setCustomId('automod_whitelist_add_user')
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

    if (id === 'automod_whitelist_type_role') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Добавить роль в исключения')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите роль для добавления в исключения:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId('automod_whitelist_add_role')
              .setPlaceholder('Выберите роль')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_type_channel') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Добавить канал в исключения')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите канал для добавления в исключения:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('automod_whitelist_add_channel')
              .setPlaceholder('Выберите канал')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_remove_btn') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const whitelist = await AutomodWhitelist.findAll({ where: { guildId: interaction.guild.id } });

      if (whitelist.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Список исключений пуст.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const options = whitelist.slice(0, 25).map(w => {
        const typeLabel = w.targetType === 'user' ? 'Пользователь' : w.targetType === 'role' ? 'Роль' : 'Канал';
        return {
          label: `${typeLabel}: ${w.targetId}`,
          value: w.targetId,
          description: `Убрать ${typeLabel.toLowerCase()} из исключений`
        };
      });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Убрать из исключений')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Выберите запись для удаления:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('automod_whitelist_remove')
              .setPlaceholder('Выберите запись для удаления')
              .addOptions(options)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_list_btn') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const whitelist = await AutomodWhitelist.findAll({ where: { guildId: interaction.guild.id } });
      const MODULES = AutomodWhitelist.MODULES;

      if (whitelist.length === 0) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Список исключений автомодерации')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Записей в списке исключений нет.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let detailedContent = '';
      for (const w of whitelist) {
        const modules = w.getModules();
        let moduleList;
        if (!modules || modules.length === 0) {
          moduleList = '`Все модули`';
        } else {
          moduleList = modules.map(m => `\`${MODULES[m] || m}\``).join(', ');
        }

        let mention;
        if (w.targetType === 'user') mention = `<@${w.targetId}>`;
        else if (w.targetType === 'role') mention = `<@&${w.targetId}>`;
        else mention = `<#${w.targetId}>`;

        detailedContent += `${mention}\n${moduleList}\n\n`;
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Список исключений автомодерации — подробно (${whitelist.length})`)
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
              .setCustomId('automod_whitelist_add_btn')
              .setLabel('Добавить')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('automod_whitelist_remove_btn')
              .setLabel('Убрать')
              .setStyle(ButtonStyle.Danger)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'automod_setup_modules') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.automodSetup) interaction.client.automodSetup = new Map();

      interaction.client.automodSetup.set(interaction.user.id, {
        guildId: interaction.guild.id,
        selectedModules: interaction.values || []
      });

      return interaction.deferUpdate();
    }

    if (id.startsWith('automod_punishment_')) {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const moduleKey = id.replace('automod_punishment_', '');
      const punishment = interaction.values[0];
      const punishmentFieldKey = moduleKey + 'Punishment';

      await AutomodConfig.update(
        { [punishmentFieldKey]: punishment },
        { where: { guildId: interaction.guild.id } }
      );

      return interaction.deferUpdate();
    }

    if (id === 'automod_whitelist_remove') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const targetId = interaction.values[0];
      const deleted = await AutomodWhitelist.destroy({
        where: { guildId: interaction.guild.id, targetId }
      });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            deleted
              ? `Запись \`${targetId}\` удалена из списка исключений.`
              : 'Запись не найдена в списке исключений.'
          )
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'automod_whitelist_add_channel') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) return interaction.deferUpdate();

      const [entry, created] = await AutomodWhitelist.findOrCreate({
        where: { guildId: interaction.guild.id, targetId: selectedChannel.id },
        defaults: { guildId: interaction.guild.id, targetId: selectedChannel.id, targetType: 'channel' }
      });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            created
              ? `Канал <#${selectedChannel.id}> добавлен в список исключений.`
              : `Канал <#${selectedChannel.id}> уже в списке исключений.`
          )
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_logs') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      const channelId = selectedChannel?.id || null;

      await AutomodConfig.update({ logChannelId: channelId }, { where: { guildId: interaction.guild.id } });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Настройка автомодерации\n**Шаг 3 из 3** — Настройка порогов')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Выберите канал логов для действий автомодерации:\n\n` +
            (selectedChannel ? `✅ **Канал логов установлен:** <#${channelId}>` : '⚠️ **Канал не выбран** — логирование будет отключено.')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('automod_setup_logs')
              .setPlaceholder(selectedChannel ? `#${selectedChannel.name}` : 'Выберите канал логов')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_setup_complete')
              .setLabel('Завершить настройку')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('automod_setup_back')
              .setLabel('Назад')
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
    if (id === 'automod_whitelist_add_user') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedUser = interaction.users.first();
      if (!selectedUser) return interaction.deferUpdate();

      const [entry, created] = await AutomodWhitelist.findOrCreate({
        where: { guildId: interaction.guild.id, targetId: selectedUser.id },
        defaults: { guildId: interaction.guild.id, targetId: selectedUser.id, targetType: 'user' }
      });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            created
              ? `${selectedUser.username} добавлен в список исключений.`
              : `${selectedUser.username} уже в списке исключений.`
          )
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isRoleSelectMenu()) {
    if (id === 'automod_whitelist_add_role') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'Вам нужно право **Управление сервером**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedRole = interaction.roles.first();
      if (!selectedRole) return interaction.deferUpdate();

      const [entry, created] = await AutomodWhitelist.findOrCreate({
        where: { guildId: interaction.guild.id, targetId: selectedRole.id },
        defaults: { guildId: interaction.guild.id, targetId: selectedRole.id, targetType: 'role' }
      });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            created
              ? `Роль **${selectedRole.name}** добавлена в список исключений.`
              : `Роль **${selectedRole.name}** уже в списке исключений.`
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
