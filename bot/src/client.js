
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } = require('discord.js');
const Dokdo = require('dokdo');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { loadSlashCommands, loadPrefixCommands, loadHybridCommands, reloadAllCommands } = require('./lib/commandLoader');
const { colors, printHeader, printLoading, printSuccess, printError, printInfo, printSystemReady } = require('./lib/consoleLogger');
const botLogger    = require('./lib/botLogger');
const runEmojiSync = require('./lib/emojiSync');

printHeader();

const _emitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  const msg = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (msg.includes('ready event has been renamed to clientReady')) return;
  return _emitWarning.call(process, warning, ...args);
};

process.on('unhandledRejection', (error) => {
  printError(`Unhandled rejection: ${error?.message ?? String(error)}`);
});

process.on('uncaughtException', (error) => {
  printError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

(async () => {
  await runEmojiSync();

  global.aerox = {
    bot: { color: '#5865F2' },
    addons: {
      ai: { geminiApiKeys: null }
    },
    db: { timezone: '+00:00' }
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  client.commands = new Collection();
  client.prefixCommands = new Collection();

  if (!process.env.SHELL) process.env.SHELL = '/bin/bash';

  client.dokdo = new Dokdo.Client(client, {
    prefix: config.PREFIX,
    aliases: ['dok', 'jsk'],
    owners: [config.OWNER_ID],
    secrets: [config.BOT_TOKEN]
  });

  client.reloadAllCommands = function () {
    try {
      return reloadAllCommands(this, __dirname);
    } catch (error) {
      return { success: false, message: 'Failed to reload commands', error: error.stack };
    }
  };

  const commandsPath  = path.join(__dirname, 'commands/slash');
  const pCommandsPath = path.join(__dirname, 'commands/prefix');
  const hybridPath    = path.join(__dirname, 'hybrid');

  loadSlashCommands(client, commandsPath);
  loadPrefixCommands(client, pCommandsPath);
  loadHybridCommands(client, hybridPath);

  printLoading('Event handlers');
  const eventsPath = path.join(__dirname, 'gateway');
  let loadedEvents = 0;

  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if ('name' in event && 'execute' in event) {
        client.on(event.name, (...args) => event.execute(...args, client));
        loadedEvents++;
      }
    }

    const eventSubdirs = ['logging', 'antinuke', 'automod'];
    const subdirsLoaded = [];
    for (const subdir of eventSubdirs) {
      const subdirPath = path.join(eventsPath, subdir);
      if (!fs.existsSync(subdirPath)) continue;
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const mod = require(path.join(subdirPath, file));
        if ('init' in mod && typeof mod.init === 'function') mod.init(client);
      }
      subdirsLoaded.push(subdir);
    }

    const standaloneInits = [
      { file: 'welcomeEvent.js', label: 'welcome' },
      { file: 'farewellEvent.js', label: 'farewell' },
      { file: 'snipeEvent.js',   label: 'snipe' }
    ];
    const standaloneLoaded = [];
    for (const { file, label } of standaloneInits) {
      const filePath = path.join(eventsPath, file);
      if (!fs.existsSync(filePath)) continue;
      const mod = require(filePath);
      if ('init' in mod && typeof mod.init === 'function') {
        mod.init(client);
        standaloneLoaded.push(label);
      }
    }

    const allModules = [...subdirsLoaded, ...standaloneLoaded].join(', ');
    printSuccess(`Event handlers ready — ${loadedEvents} events · ${allModules}`);
  } else {
    printInfo('No events directory found, skipping event loading');
  }

  printLoading('Database connection');
  const models = require('./data/models');

  const dbModules = {
    aiChannel:   require('./data/aiChannel'),
    aiHistory:   require('./data/aiHistory'),
    autobump:    require('./data/autobump'),
    autopost:    require('./data/autopost'),
    commandLock: require('./data/commandLock'),
    feedback:    require('./data/feedback'),
    userStats:   require('./data/userStats'),
    vanityRoles: require('./data/vanityRoles'),
    ignoreDb:    require('./data/ignoreDb'),
    mediaDb:     require('./data/mediaDb'),
    reminders:   require('./data/reminders'),
  };

  const COMMAND_HASH_FILE = path.join(__dirname, '.command_hash');

  async function registerCommands() {
    const commands = [];
    for (const command of client.commands.values()) {
      const commandData = command.data.toJSON();
      commandData.integration_types = [0, 1];
      commandData.contexts = [0, 1, 2];
      commands.push(commandData);
    }

    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(commands))
      .digest('hex');

    let savedHash = null;
    try { savedHash = fs.readFileSync(COMMAND_HASH_FILE, 'utf8').trim(); } catch (_) {}

    if (savedHash === currentHash) {
      printInfo('Slash commands unchanged — skipping registration');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);

    try {
      // First try the normal global registration.
      await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
      fs.writeFileSync(COMMAND_HASH_FILE, currentHash, 'utf8');
      return;
    } catch (globalError) {
      // Some bot applications reject the global application-command endpoint.
      // Fall back to guild registration so slash commands (including /ai ask)
      // still become available in every guild where the bot is already installed.
      printWarn(`Global slash-command registration failed: ${globalError.message}`);
      printInfo('Falling back to per-guild slash-command registration');

      const guilds = [...client.guilds.cache.values()];
      if (guilds.length === 0) throw globalError;

      const guildCommands = commands.map(commandData => {
        const copy = { ...commandData };
        delete copy.integration_types;
        delete copy.contexts;
        return copy;
      });

      let registered = 0;
      const failures = [];
      for (const guild of guilds) {
        try {
          await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, guild.id), {
            body: guildCommands
          });
          registered++;
        } catch (guildError) {
          failures.push(`${guild.name} (${guild.id}): ${guildError.message}`);
        }
      }

      if (failures.length > 0 && registered === 0) {
        throw new Error(`Global registration failed and guild registration failed for all ${failures.length} guild(s): ${failures[0]}`);
      }

      fs.writeFileSync(COMMAND_HASH_FILE, currentHash, 'utf8');
      printSuccess(`Guild slash commands registered in ${registered}/${guilds.length} guilds`);
      if (failures.length > 0) {
        printWarn(`Could not register slash commands in ${failures.length} guild(s)`);
      }
    }
  }

  async function gracefulShutdown(signal) {
    console.log(`\n${colors.YELLOW}⚠${colors.RESET}  Received ${signal}, shutting down gracefully...`);
    client.destroy();
    try { await models.sequelize.close(); } catch (_) {}
    process.exit(0);
  }

  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  client.on('error', (error) => {
    printError(`Discord client error: ${error.message}`);
    botLogger.logError(error, 'Discord client error', client).catch(() => {});
  });

  client.once('clientReady', async () => {
    printSuccess(`Authentication successful → ${colors.PURPLE}${client.user.tag}${colors.RESET}`);

    botLogger.init(client);

    client.user.setPresence({
      status: config.STATUS.status,
      activities: [{ name: config.STATUS.activity, type: ActivityType.Listening }]
    });

    /* Rotate the status text every 60s so the bot always shows live stats:
     * command count and guild count are real values from the running client. */
    if (!client._presenceTimer) {
      const presenceVariants = () => [
        { name: config.STATUS.activity, type: ActivityType.Listening },
        { name: `.help · ${client.commands.size} команд`, type: ActivityType.Listening },
        { name: `за ${client.guilds.cache.size} ${client.guilds.cache.size === 1 ? 'сервером' : 'серверами'}`, type: ActivityType.Watching },
        { name: `за ${client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0).toLocaleString('ru-RU')} участниками`, type: ActivityType.Watching },
      ];
      let pi = 0;
      client._presenceTimer = setInterval(() => {
        try {
          const variants = presenceVariants();
          pi = (pi + 1) % variants.length;
          client.user.setPresence({ status: config.STATUS.status, activities: [variants[pi]] });
        } catch { /* presence is cosmetic — never crash the bot over it */ }
      }, 60_000);
      client._presenceTimer.unref?.();
    }

    printLoading('Synchronizing slash commands');
    try {
      await registerCommands();
      printSuccess(`Command synchronization complete (${client.commands.size} commands)`);
    } catch (error) {
      printError(`Failed to register commands: ${error.message}`);
    }

    printInfo(`Connected to ${client.guilds.cache.size} guilds`);

    // ── Dashboard web server (same host, same process as the bot) ──
    try {
      const { createDashboardServer } = require('./dashboard-server');
      const cfg = require('./dashboard-config');
      const dashboard = createDashboardServer(client, models);
      const dashPort = parseInt(process.env.DASHBOARD_PORT || '3000', 10);
      dashboard.listen(dashPort, '0.0.0.0', () => {
        printSuccess(`Dashboard online → http://0.0.0.0:${dashPort}`);
        console.log('');
        console.log('  ┌────────────────────────── Niko Control Center ──────────────────────────┐');
        console.log(`  │  Лендинг + дашборд:   http://localhost:${dashPort}/                          │`);
        console.log(`  │  Вход через Discord:  http://localhost:${dashPort}/auth                       │`);
        console.log(`  │  Админ-панель:        http://localhost:${dashPort}/admin                     │`);
        console.log('  │  Redirect URI (Discord Developer Portal → OAuth2 → Redirects):          │');
        console.log(`  │    ${cfg.DASHBOARD_REDIRECT_URI || `http://localhost:${dashPort}/auth/callback`}`.padEnd(74) + '│');
        console.log('  └─────────────────────────────────────────────────────────────────────────┘');
        console.log('');
      });
    } catch (dashErr) {
      printError('Failed to start dashboard: ' + dashErr.message);
    }

    try {
      const { checkGiveaways } = require('./lib/giveawayUtils');
      setInterval(() => { checkGiveaways(client); }, 10000);

      const { startBackgroundRefresh: startAnimalRefresh } = require('./lib/animalApi');
      startAnimalRefresh();

      const { startBackgroundRefresh } = require('./lib/pfpApi');
      startBackgroundRefresh();
    } catch (error) {
      printError('Failed to initialize database-dependent systems: ' + error.message);
    }

    printSystemReady();

    // ── Telegram notification: bot is online ──
    try {
      const telegram = require('./telegram');
      if (telegram.isConfigured()) {
        telegram.events.botStarted(client.user.tag, client.guilds.cache.size).then((r) => {
          if (r.ok) printSuccess('Telegram notifications connected');
          else printError(`Telegram notification failed: ${r.error}`);
        });
      } else {
        printInfo('Telegram notifications disabled (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set)');
      }
    } catch (tgErr) {
      printError('Telegram module error: ' + tgErr.message);
    }
  });

  try {
    await Promise.all([
      models.dbReady,
      ...Object.values(dbModules).map(m => m.dbReady)
    ]);
    printSuccess('Database initialized and all tables synced');
  } catch (err) {
    printError('Database initialization failed: ' + err.message);
    process.exit(1);
  }

  /* Apply dashboard-saved runtime settings (prefix, presence, telegram…) on
   * top of config.js before login so the bot comes up in the saved state. */
  try {
    const settings = require('./lib/settings');
    await settings.loadAll();
    settings.applyToConfig();
    printSuccess('Runtime settings applied from dashboard_settings');
  } catch (e) {
    printInfo('Runtime settings not applied: ' + e.message);
  }

  /* Create the dashboard_admins table and seed the owner row early so the
   * admin-accounts module is ready before the dashboard serves requests. */
  try {
    const adminAccounts = require('./lib/adminAccounts');
    await adminAccounts.ensureOwner();
    printSuccess('Admin accounts ready (owner row present)');
  } catch (e) {
    printInfo('Admin accounts module not initialised: ' + e.message);
  }

  printLoading('Discord authentication');
  try {
    await client.login(config.BOT_TOKEN);
  } catch (error) {
    printError(`Startup failed: ${error.message}`);
    process.exit(1);
  }
})();
