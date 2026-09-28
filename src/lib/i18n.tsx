import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";

export type Lang = "ru" | "en";

/* Full dictionary for both languages. Keys are grouped by area. */
const DICT = {
  // system page / misc additions
  "adm.sessionEnded": { ru: "Сессия админа завершена", en: "Admin session ended" },
  "adm.adminSession": { ru: "Сессия админа", en: "Admin session" },
  "adm.testSent": { ru: "Тестовое сообщение отправлено в Telegram", en: "Test message sent to Telegram" },
  "adm.notSent": { ru: "не отправлено", en: "not sent" },
  "adm.shardsGateway": { ru: "Шарды Discord Gateway", en: "Discord Gateway shards" },
  "adm.oneShard": { ru: "Один шард (без шардинга)", en: "A single shard (no sharding)" },
  "adm.waitingBot": { ru: "Ожидание бота…", en: "Waiting for the bot…" },
  "adm.envTitle": { ru: "Окружение", en: "Environment" },
  "adm.platform": { ru: "Платформа", en: "Platform" },
  "adm.telegramTitle": { ru: "Telegram уведомления", en: "Telegram notifications" },
  "adm.statusWord": { ru: "Статус", en: "Status" },
  "adm.connected": { ru: "подключён", en: "connected" },
  "adm.notConfigured": { ru: "не настроен", en: "not configured" },
  "adm.checking": { ru: "проверка…", en: "checking…" },
  "adm.sendTest": { ru: "Отправить тест", en: "Send a test" },
  "adm.telegramHint": { ru: "задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env", en: "set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env" },
  "adm.storageTitle": { ru: "Хранилище", en: "Storage" },
  "adm.storageWord": { ru: "Соединение", en: "Connection" },
  "adm.storageConnected": { ru: "подключено", en: "connected" },
  "adm.noData": { ru: "нет данных", en: "no data" },
  "adm.models": { ru: "Разделов", en: "Sections" },
  "adm.rowsInStore": { ru: "Записей", en: "Records" },
  "adm.dangerZone": { ru: "Опасная зона", en: "Danger zone" },
  "adm.dangerSub": { ru: "Действия применяются к живому процессу бота немедленно.", en: "These actions apply to the live bot process immediately." },
  "adm.reloadAll": { ru: "Перезагрузить все команды", en: "Reload every command" },
  "adm.reloadAllSub": { ru: "Очищает и заново загружает slash + prefix + hybrid реестры", en: "Clears and reloads the slash + prefix + hybrid registries" },
  "adm.endSession": { ru: "Завершить админ-сессию", en: "End the admin session" },
  "adm.endSessionSub": { ru: "Мгновенно закрывает доступ к /admin на этом устройстве", en: "Instantly closes /admin access on this device" },

  // admin / users additions
  "adm.reasonFromPanel": { ru: "из панели", en: "from the panel" },
  "adm.noReason": { ru: "без причины", en: "no reason" },
  "adm.userBlocked": { ru: "Пользователь заблокирован", en: "User blocked" },
  "adm.unblocked": { ru: "Разблокирован", en: "Unblocked" },
  "adm.blockUser": { ru: "Заблокировать", en: "Block" },
  "adm.grantedBy": { ru: "выдал", en: "granted by" },

  // nav / shell
  "nav.dashboard": { ru: "Обзор", en: "Overview" },
  "nav.servers": { ru: "Серверы", en: "Servers" },
  "nav.commands": { ru: "Команды", en: "Commands" },
  "nav.moderation": { ru: "Модерация", en: "Moderation" },
  "nav.analytics": { ru: "Аналитика", en: "Analytics" },
  "nav.support": { ru: "Поддержка", en: "Support" },
  "nav.botOnline": { ru: "Бот в сети", en: "Bot online" },
  "nav.botOffline": { ru: "Бот офлайн", en: "Bot offline" },
  "nav.logout": { ru: "Выйти", en: "Log out" },
  "nav.login": { ru: "Войти через Discord", en: "Log in with Discord" },
  "nav.controlCenter": { ru: "Центр управления", en: "Control Center" },
  "nav.adminPanel": { ru: "Админ-панель", en: "Admin panel" },
  "nav.backToDashboard": { ru: "Назад в дашборд", en: "Back to dashboard" },

  // common
  "common.loading": { ru: "загрузка…", en: "loading…" },
  "common.offline": { ru: "бот офлайн", en: "bot offline" },
  "common.save": { ru: "Сохранить", en: "Save" },
  "common.close": { ru: "Закрыть", en: "Close" },
  "common.cancel": { ru: "Отмена", en: "Cancel" },
  "common.delete": { ru: "Удалить", en: "Delete" },
  "common.create": { ru: "Создать", en: "Create" },
  "common.add": { ru: "Добавить", en: "Add" },
  "common.refresh": { ru: "Обновить", en: "Refresh" },
  "common.live": { ru: "Live", en: "Live" },
  "common.search": { ru: "Поиск…", en: "Search…" },
  "common.all": { ru: "Все", en: "All" },
  "common.select": { ru: "— выберите —", en: "— select —" },
  "common.none": { ru: "— выключено —", en: "— disabled —" },
  "common.participants": { ru: "участн.", en: "entries" },
  "common.winner": { ru: "победитель(ей)", en: "winner(s)" },
  "common.ended": { ru: "завершён", en: "ended" },
  "common.until": { ru: "до", en: "until" },
  "common.empty": { ru: "Пока пусто", en: "Nothing here yet" },
  "common.error": { ru: "Ошибка", en: "Error" },
  "common.notFound": { ru: "Ничего не найдено", en: "Nothing found" },
  "common.copy": { ru: "Скопировать", en: "Copy" },
  "common.copied": { ru: "Скопировано", en: "Copied" },
  "common.backHome": { ru: "На главную", en: "Back home" },
  "common.back": { ru: "Назад", en: "Previous" },
  "common.next": { ru: "Вперёд", en: "Next" },
  "common.enabled": { ru: "включено", en: "enabled" },
  "common.disabled": { ru: "выключено", en: "disabled" },
  "common.of100": { ru: "из 100", en: "of 100" },
  "common.members": { ru: "участников", en: "members" },
  "common.onServer": { ru: "бот на сервере", en: "bot on server" },
  "common.botMissing": { ru: "бота нет", en: "no bot" },
  "common.noAccess": { ru: "Нет прав или бот недоступен", en: "No permission or the bot is unavailable" },
  "common.min": { ru: "мин", en: "min" },
  "common.hoursShort": { ru: "ч", en: "h" },
  "common.daysShort": { ru: "д", en: "d" },
  "common.endingSoon": { ru: "завершается…", en: "ending…" },

  // punishments (antinuke / automod)
  "pun.stripall": { ru: "снять все", en: "strip all" },
  "pun.kick": { ru: "кик", en: "kick" },
  "pun.ban": { ru: "бан", en: "ban" },
  "pun.warn": { ru: "варн", en: "warn" },
  "pun.mute": { ru: "мут", en: "mute" },
  "pun.delete": { ru: "удалить", en: "delete" },

  // landing / public site
  "ln.features": { ru: "Возможности", en: "Features" },
  "ln.stats": { ru: "Статистика", en: "Stats" },
  "ln.vlogs": { ru: "Влоги", en: "Vlogs" },
  "ln.dashboard": { ru: "Дашборд", en: "Dashboard" },
  "ln.openDashboard": { ru: "Открыть дашборд", en: "Open dashboard" },
  "ln.enterDashboard": { ru: "Войти в дашборд", en: "Enter the dashboard" },
  "ln.product": { ru: "Продукт", en: "Product" },
  "ln.help": { ru: "Помощь", en: "Help" },
  "ln.privacy": { ru: "Политика конфиденциальности", en: "Privacy policy" },
  "ln.terms": { ru: "Договор-оферта · Условия", en: "Terms of service" },
  "ln.loginDiscord": { ru: "Вход через Discord", en: "Sign in with Discord" },
  "ln.owner": { ru: "Владелец", en: "Owner" },
  "ln.ownerDesc": { ru: "Разработка и поддержка Niko Control Center", en: "Development and maintenance of Niko Control Center" },
  "ln.rights": { ru: "Все права защищены.", en: "All rights reserved." },
  "ln.privacyShort": { ru: "Конфиденциальность", en: "Privacy" },
  "ln.termsShort": { ru: "Условия", en: "Terms" },
  "ln.runsOn": { ru: "работает на Niko", en: "powered by Niko" },
  "ln.language": { ru: "Язык", en: "Language" },
  "ln.menu": { ru: "Меню", en: "Menu" },

  // vlogs
  "vlog.title": { ru: "Дневник разработки", en: "Dev log" },
  "vlog.backHome": { ru: "На главную", en: "Back home" },
  "vlog.entries": { ru: "записей", en: "posts" },
  "vlog.all": { ru: "Все", en: "All" },
  "vlog.loading": { ru: "Загрузка влогов…", en: "Loading vlogs…" },
  "vlog.empty": { ru: "Здесь пока пусто", en: "Nothing here yet" },
  "vlog.emptyTag": { ru: "Записей с таким тегом нет — выберите другой.", en: "No posts with that tag — pick another one." },
  "vlog.fetching": { ru: "Получаем последние записи с бота.", en: "Fetching the latest posts from the bot." },
  "vlog.showMore": { ru: "Показать ещё", en: "Show more" },
  "vlog.readMore": { ru: "Читать полностью", en: "Read more" },
  "vlog.collapse": { ru: "Свернуть", en: "Collapse" },
  "vlog.none": { ru: "Влогов пока нет", en: "No vlogs yet" },
  "vlog.follow": { ru: "Следите за обновлениями — здесь появятся новости разработки Niko.", en: "Stay tuned — Niko development news will show up here." },
  "vlog.subtitle": { ru: "Обновления Niko, разборы функций и отчёты — с картинками и подробностями.", en: "Niko updates, feature deep dives and reports — with screenshots and details." },
  "vlog.allLink": { ru: "Все влоги", en: "All vlogs" },
  "vlog.imageWord": { ru: "изображение", en: "image" },
  "vlog.landingTeaser": { ru: "Обновления бота, разборы новых функций и отчёты — с картинками.", en: "Bot updates, feature deep dives and reports — with screenshots." },

  // overview
  "ov.subtitle": { ru: "Живые данные из процесса бота (обновление каждые 10 секунд)", en: "Live data from the bot process (refreshes every 10 seconds)" },
  "ov.connecting": { ru: "подключение к процессу бота…", en: "connecting to the bot process…" },
  "ov.waiting": { ru: "Ожидание процесса бота", en: "Waiting for the bot process" },
  "ov.notRunning": { ru: "Бот не запущен", en: "Bot is not running" },
  "ov.notRunningHint": { ru: "Дашборд показывает только реальные данные. Запустите бота — и статистика появится здесь автоматически.", en: "The dashboard shows real data only. Start the bot and statistics will appear here automatically." },
  "ov.hello": { ru: "Привет", en: "Hi" },
  "ov.guilds": { ru: "Серверы", en: "Servers" },
  "ov.guildsSub": { ru: "где добавлен Niko", en: "where Niko is added" },
  "ov.vitals": { ru: "Пульс", en: "Vitals" },
  "ov.users": { ru: "Пользователи", en: "Users" },
  "ov.usersSub": { ru: "суммарно на серверах", en: "across all servers" },
  "ov.commands": { ru: "Команд всего", en: "Total commands" },
  "ov.commandsSub": { ru: "slash + prefix + hybrid", en: "slash + prefix + hybrid" },
  "ov.ping": { ru: "Ping", en: "Ping" },
  "ov.pingSub": { ru: "отклик Discord", en: "Discord response" },
  "ov.chartTitle": { ru: "Серверы во времени", en: "Servers over time" },
  "ov.chartSub": { ru: "Точка раз в минуту, пока открыта страница", en: "One point per minute while the page is open" },
  "ov.now": { ru: "сейчас", en: "now" },
  "ov.bot": { ru: "Бот", en: "Bot" },
  "ov.uptime": { ru: "Аптайм", en: "Uptime" },
  "ov.channels": { ru: "Каналов", en: "Channels" },
  "ov.shards": { ru: "Шарды", en: "Shards" },
  "ov.shardsSub": { ru: "Реальные статусы Discord Gateway", en: "Real Discord Gateway statuses" },
  "ov.noShards": { ru: "бот работает без шардинга (одна сессия gateway)", en: "bot runs without sharding (a single gateway session)" },
  "ov.modules": { ru: "Модули бота", en: "Bot modules" },
  "ov.modulesSub": { ru: "Что реально включено в этом Niko", en: "What is actually enabled in this Niko" },
  "ov.console": { ru: "Живая консоль", en: "Live console" },
  "ov.consoleSub": { ru: "События процесса бота — видно только администрации", en: "Bot process events — visible to admins only" },
  "ov.consoleStream": { ru: "поток", en: "stream" },
  "ov.consoleAdminOnly": { ru: "доступно только администрации", en: "admins only" },
  "ov.consoleEmpty": { ru: "событий пока нет — они появятся, когда бот начнёт работать", en: "no events yet — they appear once the bot is running" },
  "ov.topCommands": { ru: "Команды за сессию", en: "Commands this session" },
  "ov.topCommandsSub": { ru: "Живой счётчик interactionCreate", en: "Live interactionCreate counter" },
  "ov.calls": { ru: "вызовов", en: "calls" },
  "ov.yourGuilds": { ru: "Ваши серверы", en: "Your servers" },
  "ov.yourGuildsSub": { ru: "Где у вас есть права управления", en: "Where you have manage permissions" },
  "ov.all": { ru: "Все →", en: "All →" },
  "ov.noGuilds": { ru: "нет доступных серверов — войдите через Discord и проверьте права", en: "no servers available — log in with Discord and check permissions" },
  "ov.noCmdUses": { ru: "команды ещё не использовались с момента запуска бота", en: "no commands have been used since the bot started" },
  "ov.measuring": { ru: "измерение…", en: "measuring…" },
  "ov.host": { ru: "Хост", en: "Host" },
  "ov.hostSub": { ru: "Процесс, в котором работает бот", en: "The process running the bot" },
  "ov.ram": { ru: "Память (RSS)", en: "Memory (RSS)" },
  "ov.node": { ru: "Node.js", en: "Node.js" },
  "ov.platform": { ru: "Платформа", en: "Platform" },
  "ov.uptimeHost": { ru: "Аптайм процесса", en: "Process uptime" },
  "ov.cmdTypes": { ru: "Типы команд", en: "Command types" },
  "ov.cmdTypesSub": { ru: "Сколько команд каждого типа загружено", en: "How many commands of each type are loaded" },
  "ov.quick": { ru: "Быстрые действия", en: "Quick actions" },
  "ov.quickSub": { ru: "Часто нужное — в один клик", en: "Frequently used, one click away" },
  "ov.invite": { ru: "Пригласить бота", en: "Invite the bot" },
  "ov.inviteSub": { ru: "Добавить Niko на сервер", en: "Add Niko to a server" },
  "ov.support": { ru: "Сервер поддержки", en: "Support server" },
  "ov.supportSub": { ru: "Помощь и новости", en: "Help and news" },
  "ov.adminPanel": { ru: "Админ-панель", en: "Admin panel" },
  "ov.adminPanelSub": { ru: "Полный контроль над ботом", en: "Full bot control" },

  // servers list
  "srv.title": { ru: "Серверы", en: "Servers" },
  "srv.withBot": { ru: "С ботом", en: "With bot" },
  "srv.noBot": { ru: "Не подключённые", en: "Not connected" },
  "srv.filterHint": { ru: "только где вы менеджер", en: "only where you are a manager" },
  "srv.searchHint": { ru: "Поиск сервера...", en: "Search servers..." },
  "srv.needAuth": { ru: "Нужен вход через Discord", en: "Discord login required" },
  "srv.needAuthHint": { ru: "Авторизуйтесь — и здесь появятся серверы, где у вас есть право «Управление сервером».", en: "Sign in and servers where you have «Manage Server» will appear here." },
  "srv.botPresent": { ru: "бот на сервере", en: "bot on server" },
  "srv.botMissing": { ru: "бот не приглашён", en: "bot not invited" },
  "srv.invite": { ru: "Пригласить бота", en: "Invite the bot" },
  "srv.members": { ru: "участники", en: "members" },
  "srv.yourRole": { ru: "ваша роль", en: "your role" },
  "srv.notFound": { ru: "Ничего не найдено", en: "Nothing found" },
  "srv.tabOverview": { ru: "Обзор", en: "Overview" },
  "srv.tabGiveaways": { ru: "Розыгрыши", en: "Giveaways" },
  "srv.tabLogs": { ru: "Логи", en: "Logs" },
  "srv.tabWelcome": { ru: "Приветствия", en: "Greetings" },
  "srv.swTitle": { ru: "Основные переключатели", en: "Main switches" },
  "srv.swSub": { ru: "Действуют сразу после включения", en: "Applied instantly after enabling" },
  "srv.swLogging": { ru: "Логирование", en: "Logging" },
  "srv.swLoggingDesc": { ru: "Включить запись событий сервера", en: "Enable server event logging" },
  "srv.swWelcome": { ru: "Приветствия", en: "Greetings" },
  "srv.swWelcomeDesc": { ru: "Сообщения новым участникам", en: "Messages for new members" },
  "srv.swFarewell": { ru: "Прощания", en: "Farewells" },
  "srv.swFarewellDesc": { ru: "Сообщения при выходе участников", en: "Messages when members leave" },
  "srv.swAutoreact": { ru: "AutoReact", en: "AutoReact" },
  "srv.swAutoreactDesc": { ru: "Автоматические реакции бота", en: "Automatic bot reactions" },
  "srv.antinuke": { ru: "Антинукле", en: "Antinuke" },
  "srv.antinukeSub": { ru: "Защита от рейдов и масс-действий модераторов", en: "Protection against raids and moderator mass-actions" },
  "srv.antinukeOn": { ru: "Антинукле включён", en: "Antinuke enabled" },
  "srv.antinukeOnDesc": { ru: "Защита от рейдов и масс-действий", en: "Raid and mass-action protection" },
  "srv.punishment": { ru: "Наказание", en: "Punishment" },
  "srv.threshold": { ru: "Порог срабатывания", en: "Trigger threshold" },
  "srv.timeframe": { ru: "Окно, сек", en: "Window, sec" },
  "srv.automod": { ru: "Автомод", en: "AutoMod" },
  "srv.automodSub": { ru: "Автоматическая фильтрация сообщений на сервере", en: "Automatic message filtering for your server" },
  "srv.automodOn": { ru: "Автомод включён", en: "AutoMod enabled" },
  "srv.automodOnDesc": { ru: "Авто-фильтры сообщений на сервере", en: "Automatic message filters" },
  "srv.defaultPunishment": { ru: "Наказание по умолчанию", en: "Default punishment" },
  "srv.modActions": { ru: "Последние мод-действия", en: "Recent mod actions" },
  "srv.noRights": { ru: "Нет прав или бот недоступен", en: "No permission or the bot is unavailable" },
  "srv.loadFail": { ru: "Не удалось загрузить настройки сервера", en: "Failed to load server settings" },
  "srv.prefix": { ru: "Префикс", en: "Prefix" },
  "srv.prefixDesc": { ru: "Символ перед текстовой командой (например !)", en: "Character before a text command (e.g. !)" },
  "srv.prefixSaved": { ru: "Префикс сохранён", en: "Prefix saved" },
  "srv.aiChannels": { ru: "Каналы AI-чата", en: "AI chat channels" },
  "srv.aiChannelsDesc": { ru: "Где бот отвечает на сообщения с помощью AI", en: "Where the bot answers messages using AI" },
  "srv.addChannel": { ru: "Добавить канал", en: "Add channel" },
  "srv.selectChannel": { ru: "Канал для добавления", en: "Channel to add" },
  "srv.searchCommands": { ru: "Поиск команды…", en: "Search commands…" },
  "srv.commandsIntro": { ru: "Включайте и выключайте любую команду отдельно для этого сервера", en: "Turn any command on or off for this server individually" },
  "srv.enabledCount": { ru: "включено", en: "enabled" },
  "srv.whitelist": { ru: "Белый список", en: "Whitelist" },
  "srv.blacklist": { ru: "Чёрный список", en: "Blacklist" },
  "srv.whitelistHint": { ru: "Добавляйте ID по одному — они применяются сразу", en: "Add IDs one by one — they apply immediately" },
  "srv.idPlaceholder": { ru: "Вставьте Discord ID", en: "Paste a Discord ID" },
  "srv.saveChannelFail": { ru: "Не удалось сохранить — проверьте права бота в канале", en: "Could not save — check the bot's permissions in the channel" },
  "srv.changeFail": { ru: "Не удалось изменить — бот на связи?", en: "Could not apply — is the bot online?" },
  "srv.savePrefixFail": { ru: "Не удалось сохранить префикс", en: "Could not save the prefix" },
  "srv.aiOn": { ru: "AI-чат включён в канале", en: "AI chat enabled in the channel" },
  "srv.aiOff": { ru: "AI-чат выключен в канале", en: "AI chat disabled in the channel" },
  "srv.aiNone": { ru: "Ни один канал не выбран — AI-чат выключен", en: "No channel selected — AI chat is off" },
  "srv.removeChannel": { ru: "Выключить в этом канале", en: "Disable in this channel" },
  "srv.currentWord": { ru: "Текущий", en: "Current" },
  "srv.appliesSeconds": { ru: "применяется до 30 секунд", en: "applies within 30 seconds" },
  "srv.prefixPlaceholder": { ru: "напр. ! или n.", en: "e.g. ! or n." },
  "srv.slashCommands": { ru: "Слэш-команды на этом сервере", en: "Slash commands on this server" },
  "srv.slashHint": { ru: "Выключенная команда не отвечает участникам этого сервера. Действует в течение 30 секунд.", en: "A disabled command stops responding for this server only. Takes effect within 30 seconds." },
  "srv.disabledCount": { ru: "Выключено", en: "Disabled" },
  "srv.botUnavailable": { ru: "бот недоступен — список команд пуст", en: "bot unreachable — the command list is empty" },
  "srv.needNumericId": { ru: "Нужен числовой Discord ID", en: "A numeric Discord ID is required" },
  "srv.addFail": { ru: "Не удалось добавить", en: "Could not add" },
  "srv.listEmpty": { ru: "Список пуст", en: "The list is empty" },
  "srv.allEvents": { ru: "все события", en: "all events" },
  "srv.wlAntinuke": { ru: "Белый список антинука", en: "Antinuke whitelist" },
  "srv.wlAntinukeDesc": { ru: "Эти пользователи не наказываются антинуком, даже при масс-действиях", en: "These users are never punished by antinuke, even during mass actions" },
  "srv.wlUserPlaceholder": { ru: "ID пользователя (напр. 123456789012345678)", en: "User ID (e.g. 123456789012345678)" },
  "srv.wlAutomod": { ru: "Белый список автомода", en: "AutoMod whitelist" },
  "srv.wlAutomodDesc": { ru: "Пользователи/роли/каналы, которых автомод не проверяет", en: "Users, roles or channels that AutoMod leaves alone" },
  "srv.wlIdPlaceholder": { ru: "ID (user / role / channel)", en: "ID (user / role / channel)" },

  // guild detail
  "gd.overview": { ru: "Обзор", en: "Overview" },
  "gd.overviewDesc": { ru: "статус и здоровье", en: "status and health" },
  "gd.modules": { ru: "Модули", en: "Modules" },
  "gd.modulesDesc": { ru: "AI-чат и префикс", en: "AI chat and prefix" },
  "gd.commands": { ru: "Команды", en: "Commands" },
  "gd.commandsDesc": { ru: "вкл/выкл команд", en: "command toggles" },
  "gd.moderation": { ru: "Модерация", en: "Moderation" },
  "gd.moderationDesc": { ru: "антинук и автомод", en: "antinuke and automod" },
  "gd.giveaways": { ru: "Розыгрыши", en: "Giveaways" },
  "gd.giveawaysDesc": { ru: "создание и приз", en: "create and prize" },
  "gd.logging": { ru: "Логи", en: "Logs" },
  "gd.loggingDesc": { ru: "каналы событий", en: "event channels" },
  "gd.welcome": { ru: "Приветствия", en: "Greetings" },
  "gd.welcomeDesc": { ru: "вход и выход", en: "join and leave" },
  "gd.whitelists": { ru: "Белые списки", en: "Whitelists" },
  "gd.whitelistsDesc": { ru: "исключения", en: "exceptions" },
  "gd.health": { ru: "здоровье сервера", en: "server health" },
  "gd.healthTitle": { ru: "Здоровье настройки сервера", en: "Server setup health" },
  "gd.healthSub": { ru: "Честная оценка на основе включённых модулей — не цифры ради цифр", en: "An honest score based on which modules are actually enabled" },
  "gd.activeModules": { ru: "Активные модули", en: "Active modules" },
  "gd.statMembers": { ru: "Участники", en: "Members" },
  "gd.statChannels": { ru: "Каналы", en: "Channels" },
  "gd.statVoice": { ru: "Голосовые", en: "Voice" },
  "gd.statBoosts": { ru: "Бусты", en: "Boosts" },
  "gd.allServers": { ru: "Все серверы", en: "All servers" },
  "gd.unavailable": { ru: "Сервер недоступен", en: "Server unavailable" },
  "gd.unavailableHint": { ru: "Не удалось загрузить сервер — бот на нём есть, а прав у вас не хватило", en: "Could not load the server — the bot is there but you lack permissions" },
  "gd.loading": { ru: "Загрузка…", en: "Loading…" },
  "gd.checklist": { ru: "Проверьте эти пункты, чтобы выжать из Niko максимум", en: "Fix these items to get the most out of Niko" },
  "gd.aiChat": { ru: "AI-чат", en: "AI chat" },
  "gd.hAntinuke": { ru: "Антинук включён", en: "Antinuke enabled" },
  "gd.hAutomod": { ru: "Автомод включён", en: "AutoMod enabled" },
  "gd.hLogging": { ru: "Логирование включено", en: "Logging enabled" },
  "gd.hWelcome": { ru: "Приветствия новичкам", en: "Welcome messages on" },
  "gd.hAi": { ru: "AI-чат настроен", en: "AI chat configured" },
  "gd.hGiveaways": { ru: "Розыгрыши проводились", en: "Giveaways have run" },
  "gd.hTickets": { ru: "Тикеты работают", en: "Tickets are in use" },
  "gd.hModeration": { ru: "Мод-действия выполнялись", en: "Moderator actions recorded" },
  "gd.reactions": { ru: "реакций", en: "reactions" },
  "gd.activeWord": { ru: "активных", en: "active" },
  "gd.openWord": { ru: "открытых", en: "open" },
  "gd.tickets": { ru: "Тикеты", en: "Tickets" },
  "gd.logs": { ru: "Логи", en: "Logs" },

  // antinuke modules
  "an.antiBan": { ru: "Масс-баны", en: "Mass bans" },
  "an.antiKick": { ru: "Масс-кики", en: "Mass kicks" },
  "an.antiChannelCreate": { ru: "Создание каналов", en: "Channel creation" },
  "an.antiChannelDelete": { ru: "Удаление каналов", en: "Channel deletion" },
  "an.antiChannelEdit": { ru: "Изменение каналов", en: "Channel edits" },
  "an.antiRoleCreate": { ru: "Создание ролей", en: "Role creation" },
  "an.antiRoleDelete": { ru: "Удаление ролей", en: "Role deletion" },
  "an.antiRoleUpdate": { ru: "Опасные правки ролей", en: "Dangerous role edits" },
  "an.antiWebhook": { ru: "Вебхуки", en: "Webhooks" },
  "an.antiBot": { ru: "Добавление ботов", en: "Bot additions" },
  "an.antiGuildUpdate": { ru: "Изменение сервера", en: "Server edits" },
  "an.antiEmoji": { ru: "Эмодзи", en: "Emojis" },

  // automod modules
  "am.antiSpam": { ru: "Анти-спам", en: "Anti-spam" },
  "am.antiLink": { ru: "Блок ссылок", en: "Link block" },
  "am.antiInvite": { ru: "Блок инвайтов", en: "Invite block" },
  "am.antiBadWords": { ru: "Фильтр слов", en: "Word filter" },
  "am.antiMassMention": { ru: "Лимит упоминаний", en: "Mention limit" },
  "am.antiCaps": { ru: "КАПС-фильтр", en: "CAPS filter" },
  "am.antiPing": { ru: "Блок @everyone", en: "@everyone block" },
  "am.spamMessages": { ru: "Спам: сообщений", en: "Spam: messages" },
  "am.spamWindow": { ru: "Спам: окно, сек", en: "Spam: window, sec" },
  "am.mentionLimit": { ru: "Лимит упоминаний", en: "Mention limit" },
  "am.capsPercent": { ru: "Максимум КАПС, %", en: "Max CAPS, %" },

  // giveaways
  "gw.title": { ru: "Новый розыгрыш", en: "New giveaway" },
  "gw.subtitle": { ru: "Тот же вид и кнопки, что у /giveaway start — участники жмут «Участвовать» прямо в Discord", en: "Same look and buttons as /giveaway start — members press «Join» right in Discord" },
  "gw.prize": { ru: "Приз (например: Роль на месяц)", en: "Prize (e.g. a month of a role)" },
  "gw.channel": { ru: "Канал", en: "Channel" },
  "gw.channelHint": { ru: "Выберите текстовый канал для розыгрыша", en: "Pick a text channel for the giveaway" },
  "gw.winners": { ru: "Победителей", en: "Winners" },
  "gw.duration": { ru: "Длительность", en: "Duration" },
  "gw.launch": { ru: "Запустить розыгрыш", en: "Start the giveaway" },
  "gw.publishing": { ru: "Публикую…", en: "Publishing…" },
  "gw.list": { ru: "Розыгрыши сервера", en: "Server giveaways" },
  "gw.empty": { ru: "Пока нет розыгрышей — создайте первый выше.", en: "No giveaways yet — create the first one above." },
  "gw.needPrize": { ru: "Укажите приз", en: "Enter a prize" },
  "gw.needChannel": { ru: "Выберите канал для розыгрыша", en: "Pick a channel for the giveaway" },
  "gw.createFail": { ru: "Не удалось создать — проверьте права бота в выбранном канале", en: "Failed to create — check the bot's permissions in the channel" },
  "gw.deleteConfirm": { ru: "Удалить розыгрыш и всех его участников?", en: "Delete the giveaway and all of its entries?" },
  "gw.min": { ru: "минут", en: "minutes" },
  "gw.hour": { ru: "час", en: "hour" },
  "gw.hours": { ru: "часа/часов", en: "hours" },
  "gw.day": { ru: "день", en: "day" },
  "gw.days": { ru: "дня/дней", en: "days" },
  "gw.logChannels": { ru: "Каналы логов", en: "Log channels" },
  "gw.logSub": { ru: "Выберите канал для каждой категории — бот пишет туда реальные события", en: "Pick a channel per category — the bot posts real events there" },
  "gw.welcomeNow": { ru: "Текущие приветствия", en: "Current greetings" },
  "gw.entry": { ru: "Вход", en: "Entry" },
  "gw.exit": { ru: "Выход", en: "Exit" },
  "gw.andSwitches": { ru: "а переключатели показа — на вкладке «Обзор».", en: "and the show/hide switches are on the «Overview» tab." },
  "gw.noChannel": { ru: "канал не задан", en: "channel not set" },

  // welcome / farewell editor
  "gw.editTitle": { ru: "Приветствия и прощания", en: "Greetings & farewells" },
  "gw.editSub": { ru: "Настраивайте прямо здесь: канал, стиль, текст и картинки — с живым предпросмотром", en: "Tune it right here: channel, style, text and images — with a live preview" },
  "gw.channelOff": { ru: "Канал не выбран — сообщение не отправляется", en: "No channel selected — nothing is sent" },
  "gw.style": { ru: "Стиль сообщения", en: "Message style" },
  "gw.styleSimple": { ru: "Текст", en: "Plain text" },
  "gw.styleContainer": { ru: "Карточка", en: "Card" },
  "gw.messageLabel": { ru: "Текст сообщения", en: "Message text" },
  "gw.messagePlaceholder": { ru: "Рады видеть тебя, {user_nick}! Ты {count}-й участник сервера {server}.", en: "Great to see you, {user_nick}! You are member {count} of {server}." },
  "gw.titleLabel": { ru: "Заголовок карточки", en: "Card title" },
  "gw.titlePlaceholder": { ru: "Добро пожаловать!", en: "Welcome!" },
  "gw.descLabel": { ru: "Текст карточки", en: "Card text" },
  "gw.descPlaceholder": { ru: "Привет, {user}! Загляни в правила сервера, пожалуйста.", en: "Hi {user}! Please take a look at the server rules." },
  "gw.colorLabel": { ru: "Акцент", en: "Accent" },
  "gw.thumbLabel": { ru: "Миниатюра", en: "Thumbnail" },
  "gw.imageLabel": { ru: "Баннер", en: "Banner" },
  "gw.placeholders": { ru: "Переменные", en: "Placeholders" },
  "gw.preview": { ru: "Предпросмотр", en: "Preview" },
  "gw.previewNote": { ru: "Именно так сообщение выглядит в Discord — имя участника, даты и счётчик подставляются автоматически.", en: "Exactly how it looks in Discord — the member's name, dates and counter are filled in automatically." },
  "gw.saved": { ru: "Сохранено — применится в течение минуты", en: "Saved — applies within a minute" },
  "gw.saveFail": { ru: "Не удалось сохранить настройки", en: "Could not save the settings" },
  "gw.unsaved": { ru: "не сохранено", en: "unsaved" },
  "gw.appliesMinute": { ru: "бот читает настройки с кэшем до 60 секунд", en: "the bot reads these settings through a cache of up to 60s" },

  // log channel targets
  "lc.messageLogsChannelId": { ru: "Сообщения", en: "Messages" },
  "lc.messageLogsChannelIdDesc": { ru: "удаления и правки", en: "deletes and edits" },
  "lc.memberLogsChannelId": { ru: "Участники", en: "Members" },
  "lc.memberLogsChannelIdDesc": { ru: "входы и выходы", en: "joins and leaves" },
  "lc.moderationLogsChannelId": { ru: "Модерация", en: "Moderation" },
  "lc.moderationLogsChannelIdDesc": { ru: "баны, муты, варны", en: "bans, mutes, warns" },
  "lc.serverLogsChannelId": { ru: "Сервер", en: "Server" },
  "lc.serverLogsChannelIdDesc": { ru: "каналы, роли, эмодзи", en: "channels, roles, emojis" },
  "lc.voiceLogsChannelId": { ru: "Голос", en: "Voice" },
  "lc.voiceLogsChannelIdDesc": { ru: "входы в войс и муты", en: "voice joins and mutes" },

  // commands page
  "cmd.title": { ru: "Команды", en: "Commands" },
  "cmd.loaded": { ru: "команд загружено в боте", en: "commands loaded in the bot" },
  "cmd.registryDown": { ru: "бот офлайн — реестр недоступен", en: "bot offline — registry unavailable" },
  "cmd.sessionUses": { ru: "использований за сессию", en: "uses this session" },
  "cmd.searchHint": { ru: "Поиск команды...", en: "Search commands..." },
  "cmd.registryOnly": { ru: "Реестр команд доступен только при запущенном боте.", en: "The command registry is only available while the bot is running." },
  "cmd.notFound": { ru: "Ничего не найдено", en: "Nothing found" },
  "cmd.inRegistry": { ru: "команд в реестре", en: "commands in the registry" },
  "cmd.used": { ru: "исп.", en: "uses" },
  "cmd.users": { ru: "польз.", en: "users" },
  "cmd.categories": { ru: "Категории", en: "Categories" },

  // moderation
  "mod.title": { ru: "Модерация", en: "Moderation" },
  "mod.subtitle": { ru: "Журнал действий модераторов на всех серверах с ботом", en: "Moderator actions across all servers with the bot" },
  "mod.recent": { ru: "последних записей", en: "recent entries" },
  "mod.offline": { ru: "бот офлайн — журнал недоступен", en: "bot offline — the log is unavailable" },
  "mod.needAdmin": { ru: "Доступен только администратору бота", en: "Only the bot administrator can view this" },
  "mod.searchHint": { ru: "Поиск по нику или причине...", en: "Search by name or reason..." },
  "mod.logUnavailable": { ru: "Журнал модерации пока недоступен", en: "Moderation log is not available yet" },
  "mod.logUnavailableHint": { ru: "Мод-логи появятся, когда владелец включит расширенный доступ.", en: "Mod logs will appear once the owner enables extended access." },
  "mod.contactSupport": { ru: "Написать в поддержку", en: "Contact support" },
  "mod.logsNeedBot": { ru: "Мод-логи доступны при запущенном боте.", en: "Mod logs require the bot to be running." },
  "mod.by": { ru: "модератор", en: "moderator" },
  "mod.tabAll": { ru: "Все", en: "All" },

  // analytics
  "an2.title": { ru: "Аналитика", en: "Analytics" },
  "an2.subtitleLive": { ru: "живые метрики процесса · аптайм", en: "live process metrics · uptime" },
  "an2.subtitleOff": { ru: "расширенные графики появятся при запущенном боте", en: "advanced charts appear when the bot is running" },
  "an2.full": { ru: "полный доступ", en: "full access" },
  "an2.basic": { ru: "базовый режим", en: "basic mode" },
  "an2.users": { ru: "Пользователи", en: "Users" },
  "an2.uses": { ru: "Использований команд", en: "Command uses" },
  "an2.sinceStart": { ru: "с момента старта", en: "since start" },
  "an2.usersOverTime": { ru: "Пользователи во времени", en: "Users over time" },
  "an2.telemetry": { ru: "Точки телеметрии (каждые 30с)", en: "Telemetry points (every 30s)" },
  "an2.memory": { ru: "Память процесса", en: "Process memory" },
  "an2.rss": { ru: "RSS в MB", en: "RSS in MB" },
  "an2.topCommands": { ru: "Топ команд за сессию", en: "Top commands this session" },
  "an2.liveCounter": { ru: "Живой счётчик из interactionCreate", en: "Live counter from interactionCreate" },
  "an2.collecting": { ru: "Аналитика собирается процессом бота в реальном времени.", en: "Analytics is collected by the bot process in real time." },
  "an2.startBot": { ru: "запустите бота — графики появятся автоматически", en: "start the bot — the charts appear automatically" },

  // support
  "sup.title": { ru: "Поддержка", en: "Support" },
  "sup.subtitle": { ru: "Задайте вопрос — ответ придёт сюда и в уведомления", en: "Ask a question — the answer arrives here and in notifications" },
  "sup.subtitle2": { ru: "Задайте вопрос разработчику — ответ придёт прямо здесь", en: "Ask the developer — the answer arrives right here" },
  "sup.newTicket": { ru: "Новое обращение", en: "New ticket" },
  "sup.subject": { ru: "Тема обращения", en: "Subject" },
  "sup.subjectPlaceholder": { ru: "Тема (например: вопрос по антинуке)", en: "Subject (e.g. a question about antinuke)" },
  "sup.message": { ru: "Сообщение", en: "Message" },
  "sup.messagePlaceholder": { ru: "Опишите проблему подробно…", en: "Describe the problem in detail…" },
  "sup.send": { ru: "Отправить", en: "Send" },
  "sup.empty": { ru: "Обращений пока нет", en: "No tickets yet" },
  "sup.emptyHint": { ru: "Создайте первое — ответ придёт в этот список", en: "Create the first one — the answer arrives in this list" },
  "sup.reply": { ru: "Написать сообщение…", en: "Write a message…" },
  "sup.statusOpen": { ru: "ожидает ответа", en: "awaiting reply" },
  "sup.statusAnswered": { ru: "есть ответ", en: "answered" },
  "sup.statusClosed": { ru: "закрыт", en: "closed" },
  "sup.you": { ru: "Вы", en: "You" },
  "sup.admin": { ru: "Команда Niko", en: "Niko Team" },
  "sup.needAuth": { ru: "Нужен вход через Discord", en: "Discord login required" },
  "sup.needAuthHint": { ru: "Поддержка доступна авторизованным пользователям: так мы знаем, кому отвечать.", en: "Support is available to signed-in users so we know who to answer." },
  "sup.signIn": { ru: "Войти", en: "Sign in" },
  "sup.pickTicket": { ru: "Выберите обращение или создайте новое", en: "Pick a ticket or create a new one" },
  "sup.ticket": { ru: "тикет", en: "ticket" },
  "sup.needSubject": { ru: "Опишите тему обращения", en: "Enter a subject" },
  "sup.sent": { ru: "Обращение отправлено", en: "Ticket sent" },
  "sup.sendFail": { ru: "Ошибка отправки", en: "Sending failed" },
  "sup.replyFail": { ru: "Не удалось отправить", en: "Could not send" },

  // auth pages
  "auth.title": { ru: "Niko Control Center", en: "Niko Control Center" },
  "auth.subtitle": { ru: "Вход через Discord: дашборд видит только серверы, где у вас есть право «Управление сервером».", en: "Sign in with Discord: the dashboard only sees servers where you have «Manage Server»." },
  "auth.connecting": { ru: "подключение к боту…", en: "connecting to the bot…" },
  "auth.botDown": { ru: "бот не запущен — запустите node src/client.js", en: "bot is not running — start node src/client.js" },
  "auth.setup": { ru: "Первичная настройка · Redirect URI", en: "First-time setup · Redirect URI" },
  "auth.setupHint": { ru: "Добавьте эту ссылку в Discord Developer Portal → OAuth2 → Redirects, задайте", en: "Add this link in Discord Developer Portal → OAuth2 → Redirects, set" },
  "auth.andLoginWorks": { ru: "— и вход заработает.", en: "— and sign in will work." },
  "auth.adminTitle": { ru: "Панель управления Niko", en: "Niko control panel" },
  "auth.adminSub": { ru: "Только для владельца бота", en: "Bot owner only" },
  "auth.login": { ru: "Логин", en: "Login" },
  "auth.password": { ru: "Пароль", en: "Password" },
  "auth.signIn": { ru: "Войти", en: "Sign in" },
  "auth.checking": { ru: "Проверка…", en: "Checking…" },
  "auth.loginError": { ru: "Ошибка входа", en: "Sign-in failed" },
  "auth.loginDown": { ru: "Бот недоступен — админ-панель работает только при запущенном боте", en: "The bot is unreachable — the admin panel only works while it runs" },
  "auth.backToDashboard": { ru: "← вернуться на дашборд", en: "← back to the dashboard" },
  "auth.loginUnconfigured": { ru: "Вход администратора не настроен", en: "Administrator sign-in is not configured" },
  "auth.adminUnconfiguredTitle": { ru: "Нужен пароль администратора", en: "Admin password required" },
  "auth.adminUnconfiguredBody": { ru: "На сервере не заданы логин и пароль администратора. Добавьте две переменные окружения и перезапустите бота:", en: "The server has no admin credentials configured. Add these two environment variables and restart the bot:" },
  "auth.adminUnconfiguredHint": { ru: "Владелец входит без пароля через Discord, затем создаёт админ-аккаунты во вкладке «Аккаунты» (или задайте DASHBOARD_ADMIN_LOGIN / DASHBOARD_ADMIN_PASSWORD).", en: "The owner signs in via Discord, then creates admin accounts in the Accounts tab (or set DASHBOARD_ADMIN_LOGIN / DASHBOARD_ADMIN_PASSWORD)." },

  // legal
  "legal.updated": { ru: "последнее обновление: 22 сентября 2026", en: "last updated: September 22, 2026" },
  "legal.termsVersion": { ru: "редакция от 22 сентября 2026", en: "version of September 22, 2026" },
  "legal.backHome": { ru: "← На главную", en: "← Back home" },
  "legal.privacyTitle": { ru: "Политика конфиденциальности", en: "Privacy policy" },
  "legal.termsTitle": { ru: "Договор-оферта и условия использования", en: "Terms of service" },
  "legal.consentTitle": { ru: "Конфиденциальность и условия", en: "Privacy & terms" },
  "legal.consentBody": { ru: "Мы не используем трекеры и рекламу. Продолжая, вы соглашаетесь с условиями и обработкой данных, описанных в документах.", en: "We use no trackers and no ads. By continuing you agree to the terms and the data processing described in our documents." },
  "legal.policy": { ru: "Политика →", en: "Privacy →" },
  "legal.offer": { ru: "Договор-оферта →", en: "Terms →" },
  "legal.accept": { ru: "Принимаю", en: "I accept" },
  "legal.consentAria": { ru: "Уведомление о конфиденциальности", en: "Privacy notice" },

  // admin panel
  "adm.title": { ru: "Админ-панель", en: "Admin panel" },
  "adm.adminBadge": { ru: "admin", en: "admin" },
  "adm.lastSync": { ru: "обновлено", en: "updated" },
  "adm.liveSub": { ru: "живые данные процесса", en: "live process data" },
  "adm.connecting": { ru: "подключение…", en: "connecting…" },
  "adm.reload": { ru: "Перезагрузить команды", en: "Reload commands" },
  "adm.users": { ru: "Пользователи", en: "Users" },
  "adm.usersSub": { ru: "Чёрный список и пользователи без префикса — актуальные данные.", en: "Blacklist and no-prefix users — live data." },
  "adm.system": { ru: "Система", en: "System" },
  "adm.openTickets": { ru: "Открытых тикетов", en: "Open tickets" },
  "adm.searchTabs": { ru: "Поиск раздела…", en: "Search sections…" },
  "adm.loginRequired": { ru: "Требуется вход", en: "Sign-in required" },
  "adm.needAdminAuth": { ru: "Нужна авторизация администратора", en: "Administrator sign-in required" },
  "adm.enterCredentials": { ru: "Введите логин и пароль админа.", en: "Enter the admin login and password." },
  "adm.goToLogin": { ru: "Перейти ко входу", en: "Go to sign-in" },
  "adm.overview": { ru: "Обзор", en: "Overview" },
  "adm.guilds": { ru: "Серверы", en: "Servers" },
  "adm.commands": { ru: "Команды", en: "Commands" },
  "adm.logs": { ru: "Журнал", en: "Live log" },
  "adm.modlogs": { ru: "Мод-логи", en: "Mod logs" },
  "adm.tickets": { ru: "Тикеты", en: "Tickets" },
  "adm.support": { ru: "Поддержка", en: "Support" },
  "adm.giveaways": { ru: "Розыгрыши", en: "Giveaways" },
  "adm.vlogs": { ru: "Влоги", en: "Vlogs" },
  "adm.broadcast": { ru: "Рассылка", en: "Broadcast" },
  "adm.blacklist": { ru: "Чёрный список", en: "Blacklist" },
  "adm.noprefix": { ru: "NoPrefix", en: "NoPrefix" },
  "adm.security": { ru: "Безопасность", en: "Security" },
  "adm.audit": { ru: "Аудит", en: "Audit" },
  "adm.database": { ru: "База данных", en: "Database" },
  "adm.gLive": { ru: "Мониторинг", en: "Monitoring" },
  "adm.gCommunity": { ru: "Сообщество", en: "Community" },
  "adm.gContent": { ru: "Контент", en: "Content" },
  "adm.gSecurity": { ru: "Доступ и защита", en: "Access & security" },
  "adm.gSystem": { ru: "Система", en: "System" },
  "adm.gControl": { ru: "Управление", en: "Control" },
  "adm.controlTitle": { ru: "Управление ботом", en: "Bot control" },
  "adm.cmdTogglesTitle": { ru: "Команды: вкл/выкл (глобально)", en: "Commands: on/off (global)" },
  "adm.cmdTogglesSub": { ru: "Глобальный рубильник команд. Локальные блокировки — в настройках сервера.", en: "Global command switch. Per-server toggles live in server settings." },
  "adm.cmdSearch": { ru: "Поиск команды…", en: "Search command…" },
  "adm.cmdEnabled": { ru: "включена", en: "enabled" },
  "adm.cmdDisabled": { ru: "выключена", en: "disabled" },
  "adm.cmdNoResults": { ru: "ничего не найдено", en: "nothing found" },
  "adm.settingsTitle": { ru: "Настройки (config.js)", en: "Settings (config.js)" },
  "adm.settingsSub": { ru: "Значения применяются сразу и сохраняются в базе", en: "Values apply immediately and persist in the database" },
  "adm.groupTelegram": { ru: "Telegram-уведомления", en: "Telegram notifications" },
  "adm.groupBot": { ru: "Бот", en: "Bot" },
  "adm.groupAdmin": { ru: "Админ-панель", en: "Admin panel" },
  "adm.saveSettings": { ru: "Сохранить", en: "Save" },
  "adm.saved": { ru: "Настройки сохранены", en: "Settings saved" },
  "adm.presenceTitle": { ru: "Статус бота", en: "Bot presence" },
  "adm.presenceStatus": { ru: "Статус", en: "Status" },
  "adm.presenceActivity": { ru: "Активность", en: "Activity" },
  "adm.presenceApply": { ru: "Применить сейчас", en: "Apply now" },
  "adm.presenceApplied": { ru: "Статус применён", en: "Presence applied" },
  "adm.secretSet": { ru: "задан", en: "set" },
  "adm.secretEmpty": { ru: "не задан", en: "not set" },
  "adm.secretReplace": { ru: "Оставьте пустым, чтобы не менять", en: "Leave empty to keep the current value" },
  "adm.lockTitle": { ru: "Блокировка команд", en: "Command locks" },
  "adm.lockSub": { ru: "Команды, заблокированные владельцем для всех", en: "Commands the owner locked for everyone" },
  "adm.lockAdd": { ru: "Заблокировать команду…", en: "Lock a command…" },
  "adm.lockBtn": { ru: "Заблокировать", en: "Lock" },
  "adm.unlockBtn": { ru: "Разблокировать", en: "Unlock" },
  "adm.noLocks": { ru: "Нет заблокированных команд", en: "No locked commands" },

  /* ---- admin module hub (tiles) ---- */
  "adm.hubTitle": { ru: "Модули панели", en: "Panel modules" },
  "adm.hubSub": { ru: "Нажмите на модуль, чтобы открыть — счётчик справа показывает живые данные", en: "Click a module to open it — the counter shows live data" },
  "adm.hubOpen": { ru: "Подробнее", en: "Open" },
  "adm.modGiveaways": { ru: "Розыгрыши", en: "Giveaways" },
  "adm.modGiveawaysSub": { ru: "Активные розыгрыши, завершение, призы", en: "Active giveaways, endings, prizes" },
  "adm.modBlacklist": { ru: "Белый список", en: "Whitelist & bans" },
  "adm.modBlacklistSub": { ru: "Чёрный список, no-prefix, доверенные", en: "Blacklist, no-prefix, trusted users" },
  "adm.modTickets": { ru: "Тикеты и поддержка", en: "Tickets & support" },
  "adm.modTicketsSub": { ru: "Обращения пользователей и ответы", en: "User requests and replies" },
  "adm.modVlogs": { ru: "Влоги", en: "Vlogs" },
  "adm.modVlogsSub": { ru: "Публикации на сайте", en: "Website publications" },
  "adm.modBroadcast": { ru: "Рассылка", en: "Broadcast" },
  "adm.modBroadcastSub": { ru: "Массовое сообщение на все серверы", en: "Mass message to all servers" },
  "adm.modSecurity": { ru: "Безопасность", en: "Security" },
  "adm.modSecuritySub": { ru: "DDoS-монитор, аудит, журнал", en: "DDoS monitor, audit, log" },
  "adm.modCommands": { ru: "Команды", en: "Commands" },
  "adm.modCommandsSub": { ru: "Использование и реестр команд", en: "Command usage and registry" },
  "adm.modGuilds": { ru: "Серверы", en: "Servers" },
  "adm.modGuildsSub": { ru: "Где состоит бот, инспектор серверов", en: "Where the bot lives, server inspector" },
  "adm.modLogs": { ru: "Журнал бота", en: "Bot log" },
  "adm.modLogsSub": { ru: "Живой поток событий процесса", en: "Live stream of process events" },
  "adm.modDatabase": { ru: "База данных", en: "Database" },
  "adm.modDatabaseSub": { ru: "Таблицы и записи", en: "Tables and rows" },
  "adm.modAccounts": { ru: "Аккаунты админов", en: "Admin accounts" },
  "adm.modAccountsSub": { ru: "Создавайте админов и выдавайте права", en: "Create admins and grant permissions" },
  "adm.modControl": { ru: "Управление", en: "Control" },
  "adm.modControlSub": { ru: "Вкл/выкл команд, Telegram, статус бота", en: "Command toggles, Telegram, bot status" },
  "adm.noPerm": { ru: "Нет прав на этот раздел", en: "No permission for this section" },
  "adm.noPermSub": { ru: "Попросите владельца выдать доступ в «Аккаунтах»", en: "Ask the owner to grant access in Accounts" },

  /* ---- admin accounts ---- */
  "adm.accTitle": { ru: "Аккаунты администраторов", en: "Administrator accounts" },
  "adm.accSub": { ru: "Создавайте админов и выдавайте только нужные права", en: "Create admins and grant only the permissions they need" },
  "adm.accCreate": { ru: "Создать аккаунт", en: "Create account" },
  "adm.accLogin": { ru: "Логин", en: "Login" },
  "adm.accLoginPh": { ru: "например, moderator", en: "e.g. moderator" },
  "adm.accPassword": { ru: "Пароль", en: "Password" },
  "adm.accPasswordPh": { ru: "мин. 8 символов, буквы и цифры", en: "min 8 chars, letters and digits" },
  "adm.accPerms": { ru: "Права", en: "Permissions" },
  "adm.accPermsSub": { ru: "Отметьте только то, что нужно этому админу", en: "Tick only what this admin needs" },
  "adm.accOwner": { ru: "Овнер", en: "Owner" },
  "adm.accOwnerSub": { ru: "Владелец бота — все права, удалять нельзя", en: "Bot owner — full rights, cannot be deleted" },
  "adm.accDisabled": { ru: "Отключён", en: "Disabled" },
  "adm.accEnabled": { ru: "Активен", en: "Active" },
  "adm.accLastLogin": { ru: "Последний вход", en: "Last login" },
  "adm.accNever": { ru: "никогда", en: "never" },
  "adm.accDelete": { ru: "Удалить", en: "Delete" },
  "adm.accDeleteConfirm": { ru: "Удалить аккаунт", en: "Delete account" },
  "adm.accToggleOff": { ru: "Отключить", en: "Disable" },
  "adm.accToggleOn": { ru: "Включить", en: "Enable" },
  "adm.accCreated": { ru: "Аккаунт создан", en: "Account created" },
  "adm.accDeleted": { ru: "Аккаунт удалён", en: "Account deleted" },
  "adm.accUpdated": { ru: "Изменения сохранены", en: "Changes saved" },
  "adm.accSetPassword": { ru: "Сменить пароль", en: "Change password" },
  "adm.accNewPassword": { ru: "Новый пароль", en: "New password" },
  "adm.accSetOwnerPassword": { ru: "Задать пароль овнера для входа", en: "Set the owner login-page password" },
  "adm.accOwnerPasswordHint": { ru: "Овнер входит через Discord без пароля. Этот пароль нужен для входа на /admin/login.", en: "The owner signs in through Discord without a password. This one is for /admin/login." },
  "adm.accPermDenied": { ru: "Управлять аккаунтами может только владелец", en: "Only the owner manages accounts" },

  "adm.memory": { ru: "Память", en: "Memory" },
  "adm.heap": { ru: "heap", en: "heap" },
  "adm.commandsUsed": { ru: "Команд использовано", en: "Commands used" },
  "adm.sinceStart": { ru: "с момента старта", en: "since start" },
  "adm.botTickets": { ru: "Тикеты бота", en: "Bot tickets" },
  "adm.openWord": { ru: "открытых", en: "open" },
  "adm.activeGiveaways": { ru: "Активные розыгрыши", en: "Active giveaways" },
  "adm.totalWord": { ru: "всего", en: "total" },
  "adm.profiles": { ru: "Профили", en: "Profiles" },
  "adm.telemetry": { ru: "Телеметрия процесса", en: "Process telemetry" },
  "adm.telemetryWait": { ru: "собираю телеметрию… (точка каждые 30с)", en: "collecting telemetry… (one point every 30s)" },
  "adm.gatewayPing": { ru: "Ping шлюза", en: "Gateway ping" },
  "adm.voiceWord": { ru: "Голосовые", en: "Voice" },
  "adm.guildsOfBot": { ru: "Серверы бота", en: "Bot servers" },
  "adm.guildsHint": { ru: "Нажмите на сервер — откроется живая карточка (каналы, роли, антинуке, переключатели)", en: "Click a server to open its live card (channels, roles, antinuke, switches)" },
  "adm.leave": { ru: "Вывести", en: "Leave" },
  "adm.noGuilds": { ru: "Бот не добавлен ни на один сервер", en: "The bot is not on any server" },
  "adm.commandUsage": { ru: "Использование команд", en: "Command usage" },
  "adm.commandUsageSub": { ru: "Живой счётчик с момента запуска бота (interactionCreate)", en: "Live counter since the bot started (interactionCreate)" },
  "adm.noCommandUses": { ru: "Пока никто не использовал команды с момента старта", en: "Nobody has used a command since the start" },
  "adm.modLogsTitle": { ru: "Мод-логи серверов", en: "Server mod logs" },
  "adm.noRecords": { ru: "Записей пока нет", en: "No records yet" },
  "adm.addToBlacklist": { ru: "Добавить в чёрный список", en: "Add to the blacklist" },
  "adm.userWord": { ru: "Пользователь", en: "User" },
  "adm.guildWord": { ru: "Сервер", en: "Server" },
  "adm.discordId": { ru: "Discord ID", en: "Discord ID" },
  "adm.reasonOptional": { ru: "Причина (необязательно)", en: "Reason (optional)" },
  "adm.blocked": { ru: "Заблокировано", en: "Blocked" },
  "adm.blackEmpty": { ru: "Список пуст", en: "The list is empty" },
  "adm.grantNp": { ru: "Выдать NoPrefix", en: "Grant NoPrefix" },
  "adm.grant": { ru: "Выдать", en: "Grant" },
  "adm.userIdPlaceholder": { ru: "Discord ID пользователя", en: "User Discord ID" },
  "adm.withNp": { ru: "С NoPrefix", en: "With NoPrefix" },
  "adm.noneGranted": { ru: "Никому не выдан", en: "Nobody has it" },
  "adm.broadcastTitle": { ru: "Рассылка по всем серверам", en: "Broadcast to every server" },
  "adm.broadcastSub": { ru: "Отправится в системный канал каждого сервера, где есть бот", en: "Sent to the system channel of every server with the bot" },
  "adm.broadcastPlaceholder": { ru: "Текст объявления…", en: "Announcement text…" },
  "adm.confirmBroadcast": { ru: "Отправить на все сервера?", en: "Send to every server?" },
  "adm.yesSend": { ru: "Да, отправить", en: "Yes, send" },
  "adm.newVlog": { ru: "Новый влог", en: "New vlog" },
  "adm.newVlogSub": { ru: "Опубликованные влоги появляются на главной странице сайта в разделе «Влоги»", en: "Published vlogs show up on the site's landing page in the Vlogs section" },
  "adm.vlogTitlePlaceholder": { ru: "Заголовок (например: Обновление 2.4 — новый антинуке)", en: "Title (e.g. Update 2.4 — new antinuke)" },
  "adm.vlogBodyPlaceholder": { ru: "Текст влога: что нового, что починили, что дальше…", en: "Vlog text: what's new, what got fixed, what's next…" },
  "adm.images": { ru: "Картинки (до 6, https-ссылки)", en: "Images (up to 6, https links)" },
  "adm.attach": { ru: "Прикрепить", en: "Attach" },
  "adm.remove": { ru: "Убрать", en: "Remove" },
  "adm.draft": { ru: "Черновик", en: "Draft" },
  "adm.publish": { ru: "Опубликовать", en: "Publish" },
  "adm.allVlogs": { ru: "Все влоги", en: "All vlogs" },
  "adm.publishedState": { ru: "опубликован", en: "published" },
  "adm.draftState": { ru: "черновик", en: "draft" },
  "adm.hideFromSite": { ru: "Скрыть с сайта", en: "Hide from the site" },
  "adm.noVlogs": { ru: "Влогов пока нет — создайте первый выше", en: "No vlogs yet — create the first one above" },
  "adm.auditTitle": { ru: "Журнал действий админки", en: "Admin action log" },
  "adm.noActions": { ru: "Действий пока не было", en: "No actions yet" },
  "adm.botLogTitle": { ru: "Живой журнал бота", en: "Live bot log" },
  "adm.botLogSub": { ru: "Реальные события Discord-шлюза и действий в админке — последние 150", en: "Real gateway events and admin actions — the last 150" },
  "adm.noEvents": { ru: "Событий пока нет", en: "No events yet" },
  "adm.ticketsCount": { ru: "Обращений", en: "Tickets" },
  "adm.awaitingReply": { ru: "Ждут ответа", en: "Awaiting reply" },
  "adm.pickTicketLeft": { ru: "Выберите обращение слева", en: "Pick a ticket on the left" },
  "adm.hasAnswer": { ru: "Есть ответ", en: "Answered" },
  "adm.closeWord": { ru: "Закрыть", en: "Close" },
  "adm.noMessages": { ru: "Сообщений пока нет", en: "No messages yet" },
  "adm.replyTo": { ru: "Ответ для", en: "Reply to" },
  "adm.ddos": { ru: "Защита от атак", en: "Attack protection" },
  "adm.ddosTelegram": { ru: "подключён", en: "connected" },
  "adm.ddosTelegramOff": { ru: "не настроен", en: "not configured" },
  "adm.ddosLimits": { ru: "Лимиты: всплеск", en: "Limits: burst" },
  "adm.ddosPerMin": { ru: "req/мин на IP · cooldown", en: "req/min per IP · cooldown" },
  "adm.ddosWatched": { ru: "IP под наблюдением", en: "IPs under watch" },
  "adm.ddosBlocked": { ru: "Заблокировано запросов", en: "Requests blocked" },
  "adm.ddosFlagged": { ru: "Подозрительных всплесков", en: "Suspicious bursts" },
  "adm.ddosCooldownNow": { ru: "IP в cooldown (сейчас)", en: "IPs in cooldown (now)" },
  "adm.inCooldown": { ru: "В cooldown", en: "In cooldown" },
  "adm.unblock": { ru: "Разблокировать", en: "Unblock" },
  "adm.topIps": { ru: "Самые активные IP (запросов/мин)", en: "Busiest IPs (requests/min)" },
  "adm.changePassword": { ru: "Смена пароля админа", en: "Change the admin password" },
  "adm.changePasswordSub": { ru: "Действует до перезапуска процесса. Чтобы закрепить навсегда — задайте DASHBOARD_ADMIN_PASSWORD в .env", en: "Applies until the process restarts. To make it permanent, set DASHBOARD_ADMIN_PASSWORD in .env" },
  "adm.currentPassword": { ru: "Текущий пароль", en: "Current password" },
  "adm.newPassword": { ru: "Новый пароль (12–128 символов, буква + цифра)", en: "New password (12–128 chars, letter + number)" },
  "adm.repeatPassword": { ru: "Повторите новый пароль", en: "Repeat the new password" },
  "adm.changePasswordBtn": { ru: "Сменить пароль", en: "Change password" },
  "adm.passwordPolicy": { ru: "Пароль должен содержать 12–128 символов, хотя бы одну букву и одну цифру", en: "Password must be 12–128 characters and include a letter and a number" },
  "adm.passwordMismatch": { ru: "Пароли не совпадают", en: "The passwords do not match" },
  "adm.passwordChanged": { ru: "Пароль изменён (до перезапуска бота)", en: "Password changed (until the bot restarts)" },
  "adm.passwordFail": { ru: "Ошибка смены пароля", en: "Password change failed" },
  "adm.exportTitle": { ru: "Экспорт журнала аудита", en: "Export the audit log" },
  "adm.exportSub": { ru: "Скачает полный JSON: действия в админке + живые события бота. Полезно для бэкапа и разбора инцидентов.", en: "Downloads a full JSON: admin actions plus live bot events. Handy for backups and incident reviews." },
  "adm.exportBtn": { ru: "Скачать niko-audit.json", en: "Download niko-audit.json" },
  "adm.secTimingSafe": { ru: "Сравнение пароля — через SHA-256 + timing-safe", en: "Password comparison — SHA-256 + timing-safe" },
  "adm.secBruteforce": { ru: "Брутфорс-защита: 8 попыток / 15 минут на IP", en: "Brute-force guard: 8 attempts / 15 minutes per IP" },
  "adm.secCsrf": { ru: "CSRF: SameSite=Lax + проверка Origin", en: "CSRF: SameSite=Lax + Origin check" },
  "adm.secHeaders": { ru: "Сессии httpOnly, X-Frame-Options: DENY, nosniff", en: "httpOnly sessions, X-Frame-Options: DENY, nosniff" },
  "adm.secDdos": { ru: "DDoS-фильтр: всплеск + окно запросов в минуту, алерты в Telegram", en: "DDoS filter: burst + per-minute window, Telegram alerts" },
  "adm.totalTickets": { ru: "Всего тикетов", en: "Total tickets" },
  "adm.openTicketsShort": { ru: "Открытых", en: "Open" },
  "adm.inListBelow": { ru: "В списке ниже", en: "Listed below" },
  "adm.last30": { ru: "последние 30", en: "the last 30" },
  "adm.botTicketsTitle": { ru: "Тикеты Discord-бота", en: "Discord bot tickets" },
  "adm.botTicketsSub": { ru: "Живые строки таблицы тикетов (каналы-тикеты на серверах)", en: "Live ticket rows (ticket channels on servers)" },
  "adm.authorWord": { ru: "автор", en: "author" },
  "adm.claimedBy": { ru: "взял", en: "claimed by" },
  "adm.noTickets": { ru: "Тикетов пока нет", en: "No tickets yet" },
  "adm.totalGiveaways": { ru: "Всего розыгрышей", en: "Total giveaways" },
  "adm.activeWord": { ru: "Активных", en: "Active" },
  "adm.finishedWord": { ru: "Завершено", en: "Finished" },
  "adm.giveawaysTitle": { ru: "Розыгрыши", en: "Giveaways" },
  "adm.giveawaysSub": { ru: "Реальные записи из таблиц розыгрышей. Завершение меняет статус в боте сразу.", en: "Real giveaway records. Ending one updates the bot's state immediately." },
  "adm.entriesWord": { ru: "участников", en: "entries" },
  "adm.winnersWord": { ru: "победителей", en: "winners" },
  "adm.leftTime": { ru: "осталось", en: "left" },
  "adm.finish": { ru: "Завершить", en: "Finish" },
  "adm.noGiveaways": { ru: "Розыгрышей пока нет", en: "No giveaways yet" },
  "adm.tablesWord": { ru: "Таблиц", en: "Tables" },
  "adm.totalRows": { ru: "Всего строк", en: "Total rows" },
  "adm.storage": { ru: "Хранилище", en: "Storage" },
  "adm.storageOnline": { ru: "Онлайн", en: "Online" },
  "adm.storageOk": { ru: "работает штатно", en: "running normally" },
  "adm.rowsPerTable": { ru: "Строки по таблицам", en: "Rows per table" },
  "adm.rowsPerTableSub": { ru: "COUNT(*) по каждой модели — данные реальные, кэша нет", en: "COUNT(*) for every model — real data, no cache" },
  "adm.dbUnavailable": { ru: "Данные недоступны", en: "Data unavailable" },
  "adm.guildFetchFail": { ru: "Не удалось получить данные сервера", en: "Could not fetch the server data" },
  "adm.ownerWord": { ru: "владелец", en: "owner" },
  "adm.membersWord": { ru: "участников", en: "members" },
  "adm.rolesWord": { ru: "Роли", en: "Roles" },
  "adm.antinukeOn": { ru: "Antinuke включён", en: "Antinuke enabled" },
  "adm.antinukeOff": { ru: "Antinuke выключен", en: "Antinuke disabled" },
  "adm.loggingOn": { ru: "Логирование вкл", en: "Logging on" },
  "adm.loggingOff": { ru: "Логирование выкл", en: "Logging off" },
  "adm.welcomeOn": { ru: "Приветствия вкл", en: "Welcome on" },
  "adm.welcomeOff": { ru: "Приветствия выкл", en: "Welcome off" },
  "adm.autoreactOn": { ru: "AutoReact вкл", en: "AutoReact on" },
  "adm.autoreactOff": { ru: "AutoReact выкл", en: "AutoReact off" },
  "adm.closeGuildCard": { ru: "Закрыть карточку сервера", en: "Close the server card" },
  "adm.leaveConfirm": { ru: "Вывести бота с", en: "Make the bot leave" },
  "adm.leftGuild": { ru: "Бот покинул", en: "The bot left" },
  "adm.blackAdded": { ru: "Добавлено в чёрный список", en: "Added to the blacklist" },
  "adm.removed": { ru: "Удалено", en: "Removed" },
  "adm.npGranted": { ru: "NoPrefix выдан", en: "NoPrefix granted" },
  "adm.npRemoved": { ru: "NoPrefix снят", en: "NoPrefix revoked" },
  "adm.sent": { ru: "Отправлено в", en: "Sent to" },
  "adm.serversWord": { ru: "серверов", en: "servers" },
  "adm.failedWord": { ru: "ошибок", en: "failures" },
  "adm.reloadFail": { ru: "Ошибка перезагрузки", en: "Reload failed" },
  "adm.vlogPublished": { ru: "Влог опубликован", en: "Vlog published" },
  "adm.vlogDraft": { ru: "Влог сохранён как черновик", en: "Vlog saved as a draft" },
  "adm.checkFields": { ru: "Ошибка: проверьте поля", en: "Error: check the fields" },
  "adm.published": { ru: "Опубликовано", en: "Published" },
  "adm.hidden": { ru: "Скрыто с сайта", en: "Hidden from the site" },
  "adm.vlogDeleteConfirm": { ru: "Удалить влог?", en: "Delete this vlog?" },
  "adm.vlogDeleted": { ru: "Влог удалён", en: "Vlog deleted" },
  "adm.replySent": { ru: "Ответ отправлен", en: "Reply sent" },
  "adm.statusUpdated": { ru: "Статус обновлён", en: "Status updated" },
  "adm.ticketDeleteConfirm": { ru: "Удалить тикет?", en: "Delete this ticket?" },
  "adm.ticketDeleted": { ru: "Тикет удалён", en: "Ticket deleted" },
  "adm.gwEnded": { ru: "Розыгрыш завершён", en: "Giveaway finished" },
  "adm.gwDeleteConfirm": { ru: "Удалить розыгрыш и все его записи?", en: "Delete the giveaway and all of its entries?" },
  "adm.gwDeleted": { ru: "Розыгрыш удалён", en: "Giveaway deleted" },
  "adm.tagNews": { ru: "Новости", en: "News" },
  "adm.tagUpdate": { ru: "Обновление", en: "Update" },
  "adm.tagGuide": { ru: "Гайд", en: "Guide" },
  "adm.tagReport": { ru: "Отчёт", en: "Report" },
  "adm.tagAnnounce": { ru: "Анонс", en: "Announcement" },

  // errors
  "err.title": { ru: "Что-то пошло не так", en: "Something went wrong" },
  "err.body": { ru: "Ошибка интерфейса не должна ломать страницу — перезагрузите или вернитесь на главную.", en: "A UI error should not break the page — reload or head back home." },
  "err.reload": { ru: "Перезагрузить", en: "Reload" },
  "err.home": { ru: "На главную", en: "Home" },
} as const;

export type TKey = keyof typeof DICT;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (k: TKey) => string;
  /** Pick the value matching the current language: `loc(ru, en)`. */
  loc: <T>(ru: T, en: T) => T;
  /** Locale-aware number formatting (1 234 / 1,234). */
  num: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Locale-aware date/time formatting. */
  dt: (ts: number | Date, opts?: Intl.DateTimeFormatOptions) => string;
  locale: string;
};

const I18nCtx = createContext<Ctx>({
  lang: "ru",
  setLang: () => {},
  toggle: () => {},
  t: (k) => String(k),
  loc: (ru) => ru,
  num: (n) => String(n),
  dt: (ts) => new Date(ts).toLocaleString(),
  locale: "ru-RU",
});

const STORAGE_KEY = "niko.lang";

/** Detect the best default language: saved choice → browser → Russian. */
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ru" || saved === "en") return saved;
  } catch { /* storage blocked */ }
  try {
    if (!navigator.language?.toLowerCase().startsWith("ru")) return "en";
  } catch { /* no navigator */ }
  return "ru";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === "ru" ? "en" : "ru")), []);

  const value = useMemo<Ctx>(() => {
    const locale = lang === "ru" ? "ru-RU" : "en-US";
    const t = (k: TKey) => {
      const entry = DICT[k];
      if (!entry) return String(k);
      return entry[lang] ?? entry.ru;
    };
    const loc = <T,>(ru: T, en: T): T => (lang === "ru" ? ru : en);
    const num = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(locale, opts);
    const dt = (ts: number | Date, opts?: Intl.DateTimeFormatOptions) =>
      new Date(ts).toLocaleString(locale, opts);
    return { lang, setLang, toggle, t, loc, num, dt, locale };
  }, [lang, setLang, toggle]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

/**
 * Content-block localisation for long, structured copy (landing, legal docs,
 * admin sections). `const c = useLocalized(RU_BLOCK, EN_BLOCK)` re-resolves on
 * every language switch, so nothing stays stuck in the previous language.
 */
export function useLocalized<T>(ru: T, en: T): T {
  const { loc } = useI18n();
  return loc(ru, en);
}

/* Canonical vlog tags are stored in the bot's data as-is (so existing posts
 * keep matching), but they are DISPLAYED in the active language. */
export const VLOG_TAGS = ["Новости", "Обновление", "Гайд", "Отчёт", "Анонс"] as const;

const VLOG_TAG_LABELS: Record<string, { ru: string; en: string }> = {
  "Новости": { ru: "Новости", en: "News" },
  "Обновление": { ru: "Обновление", en: "Update" },
  "Гайд": { ru: "Гайд", en: "Guide" },
  "Отчёт": { ru: "Отчёт", en: "Report" },
  "Анонс": { ru: "Анонс", en: "Announcement" },
};

/** Localised label for a vlog tag (unknown tags are shown unchanged). */
export function vlogTagLabel(tag: string, lang: Lang): string {
  return VLOG_TAG_LABELS[tag]?.[lang] ?? tag;
}

/* ------------------------------ language switch --------------------------- */

/** Segmented RU/EN switcher used in the sidebar, top bars and the main menu. */
export function LangSwitch({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("ln.language")}
      className={"relative flex items-center gap-1 rounded-xl border border-white/10 bg-ink-800 p-1 " + (className ?? "")}
    >
      {(["ru", "en"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className={
              "relative rounded-lg font-bold uppercase tracking-wider transition-colors " +
              (compact ? "px-2 py-1 text-[10px] " : "px-2.5 py-1 text-[10px] ") +
              (active ? "text-black" : "text-ink-200 hover:text-white")
            }
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${compact ? "c" : "n"}`}
                className="absolute inset-0 rounded-lg bg-white"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10">{l}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Globe-button variant for tight headers: one tap flips RU ⇄ EN. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, toggle, t } = useI18n();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.94 }}
      title={`${t("ln.language")}: ${lang.toUpperCase()}`}
      aria-label={t("ln.language")}
      className={
        "inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-ink-900/70 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-100 transition-colors hover:border-white/40 hover:text-white " +
        (className ?? "")
      }
    >
      <span className="text-[13px] leading-none">🌐</span>
      {lang}
    </motion.button>
  );
}
