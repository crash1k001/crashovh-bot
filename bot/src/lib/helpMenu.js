
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('./pagination');

const ITEMS_PER_PAGE = 5;

const registry = {
  general: {
    title: 'Общие команды',
    commands: [
      { name: 'status',           description: 'Посмотреть текущий статус бота' },
      { name: 'avatar [user]',    description: 'Посмотреть аватар пользователя' },
      { name: 'banner [user]',    description: 'Посмотреть баннер пользователя' },
      { name: 'servericon',       description: 'Посмотреть иконку сервера' },
      { name: 'membercount',      description: 'Показать количество участников сервера' },
      { name: 'urban <word>',     description: 'Найти слово в Urban Dictionary' },
      { name: 'hash <text>',      description: 'Сгенерировать хеш из текста' },
      { name: 'snipe',            description: 'Показать последнее удалённое сообщение' },
      { name: 'editsnipe',        description: 'Показать последнее изменённое сообщение' },
      { name: 'purge <amount>',   description: 'Массово удалить сообщения в канале' },
      { name: 'list boosters',    description: 'Список всех бустеров сервера' },
      { name: 'list inrole',      description: 'Список участников с определённой ролью' },
      { name: 'list emojis',      description: 'Список всех эмодзи сервера' },
      { name: 'list bots',        description: 'Список всех ботов на сервере' },
      { name: 'list admins',      description: 'Список всех админов на сервере' },
      { name: 'list invoice',     description: 'Список пользователей без ролей' },
      { name: 'list mods',        description: 'Список всех модераторов сервера' },
      { name: 'list early',       description: 'Список ранних участников сервера' },
      { name: 'list createpos',   description: 'Список участников по дате создания аккаунта' },
      { name: 'list roles',       description: 'Список всех ролей сервера' },
    ]
  },
  info: {
    title: 'Информационные команды',
    commands: [
      { name: 'userinfo [user]',  description: 'Подробная информация о пользователе' },
      { name: 'serverinfo',       description: 'Подробная информация о сервере' },
      { name: 'invite',           description: 'Получить ссылку-приглашение бота' },
      { name: 'users',            description: 'Показать общее количество пользователей' },
      { name: 'botinfo',          description: 'Подробная информация о боте' },
      { name: 'ping',             description: 'Проверить время отклика бота' },
      { name: 'avgping',          description: 'Проверить средний пинг бота' },
      { name: 'uptime',           description: 'Показать, сколько бот в сети' },
      { name: 'help [command]',   description: 'Показать меню помощи или конкретную команду' },
    ]
  },
  stats: {
    title: 'Команды статистики',
    commands: [
      { name: 'permissions [user]',   description: 'Показать права пользователя' },
      { name: 'rolecall <role>',       description: 'Показать количество участников с ролью' },
      { name: 'rolecount',             description: 'Показать все роли и количество участников в них' },
      { name: 'roleinfo <role>',       description: 'Подробная информация о роли' },
      { name: 'roleperms <role>',      description: 'Показать права, выдаваемые ролью' },
      { name: 'topic [channel]',       description: 'Показать текущую тему канала' },
      { name: 'channelinfo [channel]', description: 'Информация о канале' },
      { name: 'emojiinfo <emoji>',     description: 'Информация об эмодзи' },
      { name: 'emojistats',            description: 'Статистика использования эмодзи' },
      { name: 'emptyroles',            description: 'Список ролей без участников' },
      { name: 'firstjoins',            description: 'Показать первых вступивших участников' },
      { name: 'joined [user]',         description: 'Показать, когда пользователь вступил на сервер' },
      { name: 'joinedatpos <pos>',     description: 'Показать, кто вступил под определённым номером' },
      { name: 'joinpos [user]',        description: 'Показать номер вступления пользователя' },
      { name: 'lastjoins',             description: 'Показать последних вступивших' },
      { name: 'listchannels',          description: 'Список всех каналов сервера' },
    ]
  },
  fun: {
    title: 'Развлекательные команды',
    commands: [
      { name: 'howdumb [user]',      description: 'Оценить, насколько кто-то туп' },
      { name: 'howgay [user]',       description: 'Оценить процент гейства' },
      { name: 'dare',                description: 'Получить случайное испытание' },
      { name: 'truth',               description: 'Получить случайный вопрос для правды' },
      { name: 'simprate [user]',     description: 'Оценить, насколько кто-то симп' },
      { name: 'pickup',              description: 'Получить случайную подкат-фразу' },
      { name: 'rickroll [user]',     description: 'Отправить рикролл-ссылку' },
      { name: 'meme',                description: 'Получить случайный мем' },
      { name: 'nitro',               description: 'Сгенерировать фейковую ссылку Nitro' },
      { name: 'token',               description: 'Сгенерировать фейковый токен бота' },
      { name: 'texttoemoji <text>',  description: 'Преобразовать текст в эмодзи-буквы' },
      { name: 'wizz',                description: 'Отправить фейковый эффект "взлома" экрана' },
      { name: 'hack [user]',         description: 'Фейковый "взлом" пользователя' },
      { name: 'ship [u1] [u2]',      description: 'Составить пару из двух пользователей' },
    ]
  },
  social: {
    title: 'Социальные команды',
    commands: [
      { name: 'youtube <query>',    description: 'Найти видео на YouTube' },
      { name: 'github <user>',      description: 'Найти профиль на GitHub' },
      { name: 'wikipedia <query>',  description: 'Найти статью в Wikipedia' },
      { name: 'news <query>',       description: 'Найти последние новости' },
      { name: 'google <query>',     description: 'Поиск в Google' },
      { name: 'ping',               description: 'Проверить время отклика бота' },
    ]
  },
  roleplay: {
    title: 'Ролевые команды',
    commands: [
      { name: 'hug [user]',        description: 'Обнять кого-то' },
      { name: 'kiss [user]',       description: 'Поцеловать кого-то' },
      { name: 'lick [user]',       description: 'Лизнуть кого-то' },
      { name: 'pat [user]',        description: 'Погладить кого-то' },
      { name: 'slap [user]',       description: 'Дать пощёчину кому-то' },
      { name: 'tickle [user]',     description: 'Пощекотать кого-то' },
      { name: 'poke [user]',       description: 'Ткнуть кого-то' },
      { name: 'deathstare [user]', description: 'Испепелить кого-то взглядом' },
      { name: 'dance',             description: 'Немного потанцевать' },
      { name: 'cry',               description: 'Заплакать' },
      { name: 'laugh',             description: 'Громко засмеяться' },
      { name: 'smile',             description: 'Улыбнуться' },
      { name: 'blush',             description: 'Покраснеть' },
      { name: 'wink [user]',       description: 'Подмигнуть кому-то' },
      { name: 'thumbsup',          description: 'Показать палец вверх' },
      { name: 'clap',              description: 'Похлопать' },
      { name: 'bow',               description: 'Поклониться' },
      { name: 'salute',            description: 'Отдать честь' },
      { name: 'facepalm',          description: 'Фейспалм' },
      { name: 'shrug',             description: 'Пожать плечами' },
      { name: 'sleep',             description: 'Уснуть' },
      { name: 'eat',               description: 'Съесть что-то' },
      { name: 'kill [user]',       description: 'Убить кого-то' },
      { name: 'run',               description: 'Убежать' },
    ]
  },
  animals: {
    title: 'Команды с животными',
    commands: [
      { name: 'cat',        description: 'Получить случайное фото кота' },
      { name: 'dog',        description: 'Получить случайное фото собаки' },
      { name: 'fox',        description: 'Получить случайное фото лисы' },
      { name: 'duck',       description: 'Получить случайное фото утки' },
      { name: 'panda',      description: 'Получить случайное фото панды' },
      { name: 'redpanda',   description: 'Получить случайное фото красной панды' },
      { name: 'bird',       description: 'Получить случайное фото птицы' },
      { name: 'bunny',      description: 'Получить случайное фото кролика' },
      { name: 'bear',       description: 'Получить случайное фото медведя' },
      { name: 'pig',        description: 'Получить случайное фото свиньи' },
      { name: 'possum',     description: 'Получить случайное фото опоссума' },
      { name: 'sheep',      description: 'Получить случайное фото овцы' },
      { name: 'snake',      description: 'Получить случайное фото змеи' },
      { name: 'squirrel',   description: 'Получить случайное фото белки' },
      { name: 'animalfact', description: 'Получить случайный факт о животных' },
    ]
  },
  moderation: {
    title: 'Команды модерации',
    commands: [
      { name: 'kick <user> [reason]',           description: 'Кикнуть пользователя с сервера' },
      { name: 'ban <user> [reason]',            description: 'Забанить пользователя на сервере' },
      { name: 'softban <user> [reason]',        description: 'Забанить и разбанить для удаления сообщений' },
      { name: 'unban <user>',                   description: 'Разбанить пользователя на сервере' },
      { name: 'slowmode <seconds> [channel]',   description: 'Установить медленный режим для канала' },
      { name: 'lock [channel]',                 description: 'Заблокировать канал' },
      { name: 'unlock [channel]',               description: 'Разблокировать канал' },
      { name: 'tempban <user> <dur> [reason]',  description: 'Временно забанить пользователя' },
      { name: 'mute <user> [reason]',           description: 'Замьютить пользователя' },
      { name: 'unmute <user>',                  description: 'Снять мьют с пользователя' },
      { name: 'temprole <user> <role> <dur>',   description: 'Временно выдать роль' },
      { name: 'rolegive <user> <role>',         description: 'Выдать роль пользователю' },
      { name: 'roleremove <user> <role>',       description: 'Снять роль с пользователя' },
      { name: 'nick <user> [nickname]',         description: 'Изменить или сбросить никнейм участника' },
    ]
  },
  files: {
    title: 'Команды экспорта файлов сервера',
    commands: [
      { name: 'dumpsettings',      description: 'Экспортировать настройки сервера в файл' },
      { name: 'dumproles',         description: 'Экспортировать все роли в файл' },
      { name: 'dumpchannels',      description: 'Экспортировать все текстовые каналы в файл' },
      { name: 'dumpvoicechannels', description: 'Экспортировать все голосовые каналы в файл' },
      { name: 'dumpcategories',    description: 'Экспортировать все категории в файл' },
      { name: 'dumpemotes',        description: 'Экспортировать все эмодзи сервера в файл' },
      { name: 'dumpmessages',      description: 'Экспортировать сообщения из канала' },
      { name: 'dumphumans',        description: 'Экспортировать всех обычных участников в файл' },
      { name: 'dumpbots',          description: 'Экспортировать всех ботов в файл' },
      { name: 'dumpusers',         description: 'Экспортировать всех пользователей в файл' },
      { name: 'dumpbans',          description: 'Экспортировать всех забаненных пользователей в файл' },
      { name: 'dumpwarns',         description: 'Экспортировать все предупреждения в файл' },
    ]
  },
  giveaway: {
    title: 'Команды розыгрышей',
    commands: [
      { name: 'start',   description: 'Начать новый розыгрыш' },
      { name: 'end',     description: 'Досрочно завершить розыгрыш' },
      { name: 'reroll',  description: 'Перевыбрать победителя розыгрыша' },
    ]
  },
  vanity: {
    title: 'Команды vanity-ролей',
    commands: [
      { name: 'setup',   description: 'Настроить vanity-роли для сервера' },
      { name: 'config',  description: 'Показать текущие настройки vanity-ролей' },
      { name: 'reset',   description: 'Сбросить все настройки vanity-ролей' },
    ]
  },
  j2c: {
    title: 'Команды Join2Create',
    commands: [
      { name: 'setup',   description: 'Настроить каналы Join2Create для сервера' },
      { name: 'config',  description: 'Показать текущие настройки Join2Create' },
      { name: 'reset',   description: 'Сбросить все настройки Join2Create' },
    ]
  },
  automod: {
    title: 'Команды автомодерации',
    commands: [
      { name: 'setup',     description: 'Настроить автомодерацию через пошаговый мастер' },
      { name: 'settings',  description: 'Просмотреть и изменить настройки автомодерации' },
      { name: 'enable',    description: 'Включить автомодерацию на сервере' },
      { name: 'disable',   description: 'Отключить автомодерацию на сервере' },
      { name: 'whitelist', description: 'Управление исключениями из правил автомодерации' },
      { name: 'reset',     description: 'Сбросить настройки и отключить автомодерацию' },
    ]
  },
  antinuke: {
    title: 'Команды антинюка',
    commands: [
      { name: 'setup',     description: 'Настроить антинюк через пошаговый мастер' },
      { name: 'settings',  description: 'Просмотреть и изменить настройки антинюка' },
      { name: 'enable',    description: 'Включить антинюк на сервере' },
      { name: 'disable',   description: 'Отключить антинюк на сервере' },
      { name: 'whitelist', description: 'Управление доверенными пользователями, исключёнными из антинюка' },
      { name: 'reset',     description: 'Сбросить настройки и отключить антинюк' },
    ]
  },
  logging: {
    title: 'Команды логирования',
    commands: [
      { name: 'setup',  description: 'Настроить каналы логирования для сервера' },
      { name: 'config', description: 'Показать текущие настройки логирования' },
      { name: 'reset',  description: 'Сбросить все настройки логирования' },
    ]
  },
  crypto: {
    title: 'Крипто-команды',
    commands: [
      { name: 'balance',     description: 'Проверить баланс кошелька по монете и адресу' },
      { name: 'price',       description: 'Узнать текущую цену криптовалюты' },
      { name: 'convert',     description: 'Конвертировать сумму между двумя криптовалютами' },
      { name: 'transaction', description: 'Посмотреть последние транзакции адреса' },
      { name: 'news',        description: 'Последние крипто-новости' },
      { name: 'gainers',     description: 'Топ растущих монет за 24 часа' },
      { name: 'losers',      description: 'Топ падающих монет за 24 часа' },
    ]
  },
  feedback: {
    title: 'Команды отзывов',
    commands: [
      { name: 'setup',  description: 'Настроить систему отзывов через выбор каналов' },
      { name: 'panel',  description: 'Отправить панель отзывов в канал' },
      { name: 'config', description: 'Показать текущие настройки отзывов' },
      { name: 'reset',  description: 'Сбросить настройки отзывов для сервера' },
    ]
  },
  blacklist: {
    title: 'Команды чёрного списка',
    commands: [
      { name: 'guild add',    description: 'Добавить сервер в чёрный список по ID' },
      { name: 'guild remove', description: 'Убрать сервер из чёрного списка' },
      { name: 'guild list',   description: 'Показать все серверы в чёрном списке' },
      { name: 'user add',     description: 'Добавить пользователя в чёрный список по ID' },
      { name: 'user remove',  description: 'Убрать пользователя из чёрного списка' },
      { name: 'user list',    description: 'Показать всех пользователей в чёрном списке' },
    ]
  },
  ignore: {
    title: 'Команды игнорирования',
    commands: [
      { name: 'command add',    description: 'Добавить команду в список игнорируемых' },
      { name: 'command remove', description: 'Убрать команду из списка игнорируемых' },
      { name: 'command show',   description: 'Показать все игнорируемые команды' },
      { name: 'channel add',    description: 'Добавить канал в список игнорируемых' },
      { name: 'channel remove', description: 'Убрать канал из списка игнорируемых' },
      { name: 'channel show',   description: 'Показать все игнорируемые каналы' },
      { name: 'user add',       description: 'Добавить пользователя в список игнорируемых' },
      { name: 'user remove',    description: 'Убрать пользователя из списка игнорируемых' },
      { name: 'user show',      description: 'Показать всех игнорируемых пользователей' },
      { name: 'bypass add',     description: 'Добавить пользователя в список исключений' },
      { name: 'bypass remove',  description: 'Убрать пользователя из списка исключений' },
      { name: 'bypass show',    description: 'Показать всех пользователей в списке исключений' },
    ]
  },
  media: {
    title: 'Команды медиа-канала',
    commands: [
      { name: 'setup',         description: 'Настроить канал только для медиа' },
      { name: 'remove',        description: 'Снять ограничение медиа-канала' },
      { name: 'config',        description: 'Показать текущие настройки медиа-канала' },
      { name: 'bypass add',    description: 'Добавить пользователя в исключения медиа-канала' },
      { name: 'bypass remove', description: 'Убрать пользователя из исключений медиа-канала' },
      { name: 'bypass show',   description: 'Показать всех пользователей в списке исключений' },
    ]
  },
  todo: {
    title: 'Команды списка задач',
    commands: [
      { name: 'add <task>',  description: 'Добавить новую задачу в список' },
      { name: 'list',        description: 'Показать все текущие задачи' },
      { name: 'remove <id>', description: 'Удалить задачу по её ID' },
      { name: 'clear',       description: 'Очистить весь список задач' },
    ]
  },
  voice: {
    title: 'Голосовые команды',
    commands: [
      { name: 'kick <user>',           description: 'Кикнуть пользователя из голосового канала' },
      { name: 'kickall [channel]',     description: 'Кикнуть всех из голосового канала' },
      { name: 'mute <user>',           description: 'Замьютить пользователя на сервере' },
      { name: 'muteall [channel]',     description: 'Замьютить всех в голосовом канале' },
      { name: 'unmute <user>',         description: 'Снять серверный мьют с пользователя' },
      { name: 'unmuteall [channel]',   description: 'Снять мьют со всех в голосовом канале' },
      { name: 'deafen <user>',         description: 'Заглушить пользователя на сервере' },
      { name: 'deafenall [channel]',   description: 'Заглушить всех в голосовом канале' },
      { name: 'undeafen <user>',       description: 'Снять глушение с пользователя' },
      { name: 'undeafenall [channel]', description: 'Снять глушение со всех в голосовом канале' },
      { name: 'move <user> <ch>',      description: 'Переместить пользователя в канал' },
      { name: 'moveall <from> <to>',   description: 'Переместить всех между каналами' },
      { name: 'pull <user>',           description: 'Перетянуть пользователя в свой канал' },
      { name: 'pullall <channel>',     description: 'Перетянуть всех в свой канал' },
      { name: 'lock [channel]',        description: 'Заблокировать голосовой канал' },
      { name: 'unlock [channel]',      description: 'Разблокировать голосовой канал' },
      { name: 'private [channel]',     description: 'Сделать канал приватным' },
      { name: 'unprivate [channel]',   description: 'Сделать канал снова публичным' },
    ]
  },
  ai: {
    title: 'AI-команды',
    commands: [
      { name: 'ask <prompt>',     description: 'Задать AI любой вопрос' },
      { name: 'analyse <image>',  description: 'Проанализировать изображение через AI' },
      { name: 'enable',           description: 'Включить авто-ответы AI на сервере' },
      { name: 'disable',          description: 'Отключить авто-ответы AI на сервере' },
    ]
  },
  autoreact: {
    title: 'Команды автореакций',
    commands: [
      { name: 'add <word> <emoji>', description: 'Добавить слово-триггер с реакцией-эмодзи' },
      { name: 'remove <word>',      description: 'Удалить слово-триггер и его реакции' },
      { name: 'list',               description: 'Список всех триггеров и их эмодзи' },
      { name: 'reset',              description: 'Сбросить все триггеры и реакции' },
    ]
  },
  welcome: {
    title: 'Команды приветствия',
    commands: [
      { name: 'setup',  description: 'Настроить приветственное сообщение сервера' },
      { name: 'config', description: 'Показать текущие настройки приветствия' },
      { name: 'test',   description: 'Предпросмотр приветственного сообщения' },
      { name: 'reset',  description: 'Сбросить все настройки приветствия' },
    ]
  },
  farewell: {
    title: 'Команды прощания',
    commands: [
      { name: 'setup',  description: 'Настроить прощальное сообщение сервера' },
      { name: 'config', description: 'Показать текущие настройки прощания' },
      { name: 'test',   description: 'Предпросмотр прощального сообщения' },
      { name: 'reset',  description: 'Сбросить все настройки прощания' },
    ]
  },
  leaderboard: {
    title: 'Команды таблицы лидеров',
    commands: [
      { name: 'messages', description: 'Таблица лидеров по сообщениям за всё время' },
      { name: 'invites',  description: 'Таблица лидеров по приглашениям' },
    ]
  },
  userprofile: {
    title: 'Команды профиля пользователя',
    commands: [
      { name: 'view [user]',         description: 'Посмотреть профиль пользователя' },
      { name: 'description <text>',  description: 'Установить описание профиля' },
      { name: 'social <platform>',   description: 'Добавить соцсеть в профиль' },
      { name: 'background <url>',    description: 'Установить фон профиля' },
      { name: 'reset',               description: 'Сбросить профиль к настройкам по умолчанию' },
      { name: 'card',                description: 'Посмотреть полную карточку профиля' },
    ]
  },
  botprofile: {
    title: 'Команды профиля бота',
    commands: [
      { name: 'serveravatar',      description: 'Посмотреть серверный аватар бота' },
      { name: 'serverbanner',      description: 'Посмотреть серверный баннер бота' },
      { name: 'serverbio',         description: 'Посмотреть серверное био бота' },
      { name: 'servername',        description: 'Посмотреть серверное имя бота' },
      { name: 'serverresetprofile',description: 'Сбросить серверный профиль бота' },
    ]
  },
  pfps: {
    title: 'Команды аватарок',
    commands: [
      { name: 'anime',    description: 'Получить случайную аниме-аватарку' },
      { name: 'male',     description: 'Получить случайную мужскую аватарку' },
      { name: 'female',   description: 'Получить случайную женскую аватарку' },
    ]
  },
  misc: {
    title: 'Разные команды',
    commands: [
      { name: 'calc <expression>', description: 'Вычислить математическое выражение' },
      { name: 'define <word>',     description: 'Получить определение слова' },
      { name: 'matrix',            description: 'Показать анимацию в стиле Матрицы' },
      { name: 'size [user]',       description: 'Получить оценку размера' },
      { name: 'afk [reason]',      description: 'Установить статус AFK' },
    ]
  },
  conversion: {
    title: 'Команды конвертации',
    commands: [
      { name: 'kg <value>',      description: 'Перевести килограммы в фунты' },
      { name: 'ft <value>',      description: 'Перевести футы в сантиметры' },
      { name: 'cm <value>',      description: 'Перевести сантиметры в футы' },
      { name: 'hexdec <value>',  description: 'Перевести из шестнадцатеричной в десятичную' },
      { name: 'dechex <value>',  description: 'Перевести из десятичной в шестнадцатеричную' },
      { name: 'strbin <text>',   description: 'Перевести текст в двоичный код' },
      { name: 'binstr <binary>', description: 'Перевести двоичный код в текст' },
      { name: 'binint <binary>', description: 'Перевести двоичное число в целое' },
      { name: 'intbin <int>',    description: 'Перевести целое число в двоичное' },
      { name: 'encode <text>',   description: 'Закодировать текст в base64' },
      { name: 'ascii85 <text>',  description: 'Закодировать текст в ASCII85' },
      { name: 'rot13 <text>',    description: 'Применить кодировку ROT13 к тексту' },
      { name: 'base32 <text>',   description: 'Закодировать текст в base32' },
      { name: 'hex <text>',      description: 'Перевести текст в шестнадцатеричный код' },
    ]
  },
  tracking: {
    title: 'Команды отслеживания',
    commands: [
      { name: 'leaderboard messages', description: 'Таблица лидеров по сообщениям за всё время' },
      { name: 'leaderboard invites',  description: 'Таблица лидеров по приглашениям' },
      { name: 'messages [user]',      description: 'Проверить количество сообщений пользователя' },
      { name: 'invites [user]',       description: 'Проверить количество приглашений пользователя' },
    ]
  },
  reactionroles: {
    title: 'Команды ролей по реакции',
    commands: [
      { name: 'setup',  description: 'Настроить сообщение с ролями по реакции' },
      { name: 'remove', description: 'Удалить настройку ролей по реакции' },
    ]
  },
  autopost: {
    title: 'Команды автопостинга',
    commands: [
      { name: 'add <female/male/anime/random> <#channel>', description: 'Начать автопостинг картинок каждую минуту в канал' },
      { name: 'remove <female/male/anime/random>',         description: 'Остановить автопостинг категории' },
      { name: 'reset',                                     description: 'Убрать все каналы автопостинга сервера' },
    ]
  },
  tickets: {
    title: 'Команды тикетов',
    commands: [
      { name: 'ticket setup',                description: 'Настроить систему тикетов сервера' },
      { name: 'ticket panel',                description: 'Отправить новую панель тикетов в настроенный канал' },
      { name: 'ticket addcategory',          description: 'Добавить новую категорию тикетов' },
      { name: 'ticket removecategory',       description: 'Удалить категорию тикетов' },
      { name: 'ticket addrole <role>',       description: 'Добавить дополнительную роль поддержки' },
      { name: 'ticket removerole <role>',    description: 'Удалить роль поддержки' },
      { name: 'ticket close [reason]',       description: 'Закрыть текущий тикет' },
      { name: 'ticket open',                 description: 'Переоткрыть закрытый тикет' },
      { name: 'ticket delete [channel]',     description: 'Удалить канал тикета' },
      { name: 'ticket add <user>',           description: 'Добавить пользователя в текущий тикет' },
      { name: 'ticket remove <user>',        description: 'Удалить пользователя из текущего тикета' },
      { name: 'ticket rename <name>',        description: 'Переименовать текущий канал тикета' },
      { name: 'ticket claim',                description: 'Взять текущий тикет в работу' },
      { name: 'ticket transfer <user>',      description: 'Передать тикет другому сотруднику' },
      { name: 'ticket transcript',           description: 'Отправить транскрипт тикета создателю и в лог-канал' },
      { name: 'ticket reset',                description: 'Полностью сбросить настройки системы тикетов' },
    ]
  },
};

function buildPage(title, cmds, pageIndex, totalPages) {
  const header = totalPages > 1
    ? `### ${title}\n-# Страница ${pageIndex + 1}/${totalPages}`
    : `### ${title}`;
  const content = cmds.map(c => `- **${c.name}** : ${c.description}`).join('\n');

  return new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

async function sendHelp(key, interactionOrMessage) {
  const data = registry[key];
  if (!data) return;

  const { title, commands } = data;
  const totalPages = Math.ceil(commands.length / ITEMS_PER_PAGE);
  const userId = interactionOrMessage.user?.id ?? interactionOrMessage.author?.id;

  if (totalPages <= 1) {
    const container = buildPage(title, commands, 0, 1);
    return interactionOrMessage.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  return createPaginationSession({
    interactionOrMessage,
    totalPages,
    pages: async (pageIndex) =>
      commands.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE),
    renderPage: async (pageIndex, pageCommands) =>
      buildPage(title, pageCommands, pageIndex, totalPages),
    userId,
    timeout: 120000,
  }).renderInitial();
}

module.exports = { sendHelp, registry, buildPage };
