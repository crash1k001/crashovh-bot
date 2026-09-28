# Niko Control Center — Discord-бот + Дашборд на одном хосте

Один процесс = бот + веб-дашборд. Запускаешь бота — дашборд поднимается
автоматически на том же хосте. Все данные в дашборде **реальные**:
серверы, пользователи, ping, аптайм, мод-логи идут из живого Discord-клиента
и PostgreSQL.

```
┌─────────────────── ОДИН ХОСТ / ОДИН ПРОЦЕСС ───────────────────┐
│                                                                 │
│   node bot/src/client.js                                        │
│      ├─ discord.js клиент (шарады, команды, события)            │
│      ├─ PostgreSQL (Sequelize, 28 моделей)                      │
│      └─ Express:                                                │
│           • /api/status        — реальные статы бота            │
│           • /api/me/guilds     — твои серверы (где ты менеджер) │
│           • /api/admin/*       — админка (только owner/admin)   │
│           • /auth/login        — Discord OAuth2                 │
│           • /                  — статика дашборда (SPA)         │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Сборка дашборда

```bash
bun install
bun run build          # соберёт фронт в dist/
```

## 2. Настройка Discord-приложения

1. Открой https://discord.com/developers/applications → твоё приложение ( Niko ).
2. **OAuth2 → Redirects** — добавь:
   ```
   http://localhost:3000/auth/callback
   https://ТВОЙ-ДОМЕН/auth/callback
   ```
3. Скопируй **Client ID** и **Client Secret**.

> 💡 Точную ссылку для вставки показывает сам дашборд: открой `/auth` — карточка
> «Redirect URI для Discord Developer Portal» с кнопкой «Скопировать». Эндпоинт
> `GET /api/oauth-info` отдаёт её же в JSON. Если за ботом стоит nginx/Cloudflare —
> сервер сам учитывает `X-Forwarded-*` заголовки.

## 3. Переменные окружения (для бота)

| Переменная | Обязательна | Зачем |
|---|---|---|
| `DISCORD_CLIENT_ID` | да | Client ID приложения |
| `DISCORD_CLIENT_SECRET` | да | Client Secret из OAuth2 |
| `DASHBOARD_REDIRECT_URI` | нет | Явный callback-URL. Если не задан — берётся из заголовков запроса |
| `DASHBOARD_SESSION_SECRET` | нет | Секрет cookie-сессий (иначе генерируется при старте) |
| `DASHBOARD_ADMIN_IDS` | нет | Discord ID через запятую — полный доступ к админке |
| `BOT_OWNER_ID` | нет | Главный владелец (неограниченные права) |
| `DASHBOARD_PORT` | нет | Порт дашборда (по умолчанию 3000) |
| `TELEGRAM_BOT_TOKEN` | нет | Токен от @BotFather — для уведомлений в Telegram |
| `TELEGRAM_CHAT_ID` | нет | ID чата/канала/лички, куда слать уведомления |
| `TELEGRAM_NOTIFY_ERRORS` | нет | `false` отключает уведомления об ошибках |
| `DATABASE_URL` | да | PostgreSQL connection URL из переменной окружения (в коде секрета нет) |
| `BOT_TOKEN` | да | Токен бота из переменной окружения |

## 4. Запуск одной командой

```bash
cd bot && npm install        # зависимости бота (discord.js, sequelize, pg)
node src/client.js           # бот + дашборд в одном процессе
```

В консоли увидишь:

```
✓ Dashboard online → http://0.0.0.0:3000
```

Открываешь `http://localhost:3000` — лендинг → «Войти в дашборд» → Discord OAuth → дашборд.

## 4.1 Telegram-уведомления

Бот присылает в Telegram:

- 🟢 запуск бота (тег, число серверов)
- ➕➖ добавление/удаление бота с сервера
- 🔐 вход в админ-панель (и ⚠️ неудачные попытки)
- 📝 публикация влога
- 📢 итог рассылки
- ♻️ перезагрузка команд
- 🔴 ошибки процесса

Как подключить:

1. Создайте бота у [@BotFather](https://t.me/BotFather) → получите токен.
2. Напишите своему боту `/start`, затем узнайте свой ID у [@userinfobot](https://t.me/userinfobot).
3. Добавьте в `.env` на хосте бота:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_CHAT_ID=123456789
   ```
4. Перезапустите бота — придёт сообщение «Niko запущен».
5. Проверить вручную: `/admin` → «Система» → «Telegram уведомления» → «Отправить тест».

## 5. Как войти в админку

`/admin` — скрытая админ-панель: в меню её нет, ссылку нужно знать.

Вход по логину и паролю:
- `DASHBOARD_ADMIN_LOGIN` — обязательный логин администратора
- `DASHBOARD_ADMIN_PASSWORD` — обязательный пароль (не короче 12 символов, с буквами и цифрами)
- Вместо пароля можно задать SHA-256 хэш: `DASHBOARD_ADMIN_PASSWORD_HASH`
- Если переменные не заданы, вход администратора отключён — безопасный режим по умолчанию

В админке (вкладки): обзор с реальными счётчиками из PostgreSQL, серверы бота
(клик по серверу — живая карточка: каналы, роли, антинуке, переключатели),
использование команд, живой журнал событий шлюза, мод-логи, **тикеты бота**,
**розыгрыши** (завершение в один клик / удаление), **база данных** (реальные
`COUNT(*)` по каждой таблице), чёрный список, NoPrefix, рассылка, влоги,
поддержка, аудит + экспорт JSON и смена пароля (вкладка «Безопасность»).

Отдельные страницы: `/admin/users` (чёрный список и NoPrefix) и
`/admin/system` (шарды, окружение, Telegram, состояние БД) — ссылки есть в шапке админки.

## 6. Что где лежит

```
bot/
  src/client.js            # входная точка бота (+ автозапуск дашборда)
  src/dashboard-server.js  # Express API + OAuth + статика
  src/data/models/         # 28 Sequelize-моделей (ModLog, GuildConfig, ...)
dashboard-dist/            # сюда клади собранный фронт (см. ниже)
src/                       # исходники дашборда (React + Vite)
```

После сборки фронтенда перенеси `dist/` в `dashboard-dist/`:

```bash
bun run build && rm -rf dashboard-dist && cp -r dist dashboard-dist
```

(Или поменяй путь `distDir` в `bot/src/dashboard-server.js`.)

## 7. Реальные данные — что именно

| Раздел | Источник |
|---|---|
| Серверы / пользователи | `client.guilds.cache` (живой Discord) |
| Ping / аптайм | `client.ws.ping`, время старта процесса |
| Память процесса | `process.memoryUsage()` |
| Ваши серверы | Discord API `users/@me/guilds` + проверка прав |
| Мод-логи | PostgreSQL, таблица `mod_logs` |
| Настройки сервера | PostgreSQL, таблица `guild_config` |
| Шарды | `client.ws.shards` |
| Розыгрыши / тикеты | PostgreSQL, `giveaways`, `tickets` |
| Лента событий | реальные события шлюза (`/api/activity`, `/api/admin/logs`) |
| Счётчики БД | `COUNT(*)` по всем Sequelize-моделям (`/api/admin/database`) |
| Категории команд | реестр `client.commands` (`/api/commands/stats`) |

Когда данных нет, дашборд показывает «—» и пустые состояния, а не выдуманные числа:
фейковых метрик и заглушек-кнопок в интерфейсе нет.

## 8. Безопасность

- Вход юзеров — Discord OAuth2 (state против CSRF), вход админа — логин+пароль.
- Cookie-сессии `httpOnly` + `sameSite=lax`, подписаны секретом.
- Пароль админа сравнивается timing-safe (SHA-256), брутфорс-лимит: 8 попыток / 15 мин на IP.
- CSRF defense-in-depth: SameSite cookie + проверка Origin на мутациях.
- Security-заголовки: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, Permissions-Policy.
- `/api/admin/*` требует admin-сессию; `/api/guilds/:id` проверяет права менеджера сервера.
- Журнал аудита всех действий + экспорт JSON из админки.
- Секреты читаются из env: `BOT_TOKEN`, `DISCORD_CLIENT_SECRET`, `DATABASE_URL` — в коде их нет.

## 9. Разработка фронтенда отдельно

```bash
bun run dev        # Vite на :3000 c proxy /api и /auth → 127.0.0.1:3001
```

Запусти бота с `DASHBOARD_PORT=3001`, чтобы API отвечал на 3001.
