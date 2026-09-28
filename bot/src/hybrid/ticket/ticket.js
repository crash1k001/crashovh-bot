
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Управление системой тикетов')
        .addSubcommand(sub => sub.setName('setup').setDescription('Настроить систему тикетов сервера'))
        .addSubcommand(sub => sub.setName('panel').setDescription('Отправить новую панель тикетов в настроенный канал'))
        .addSubcommand(sub => sub.setName('close').setDescription('Закрыть текущий тикет').addStringOption(o => o.setName('reason').setDescription('Причина закрытия')))
        .addSubcommand(sub => sub.setName('open').setDescription('Переоткрыть закрытый тикет'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Удалить канал тикета').addChannelOption(o => o.setName('channel').setDescription('Канал тикета для удаления')))
        .addSubcommand(sub => sub.setName('add').setDescription('Добавить пользователя в текущий тикет').addUserOption(o => o.setName('user').setDescription('Пользователь для добавления').setRequired(true)))
        .addSubcommand(sub => sub.setName('rename').setDescription('Переименовать текущий канал тикета').addStringOption(o => o.setName('name').setDescription('Новое название').setRequired(true)))
        .addSubcommand(sub => sub.setName('claim').setDescription('Взять текущий тикет в работу'))
        .addSubcommand(sub => sub.setName('addcategory').setDescription('Добавить новую категорию тикетов'))
        .addSubcommand(sub => sub.setName('addrole').setDescription('Добавить дополнительную роль поддержки').addRoleOption(o => o.setName('role').setDescription('Роль для добавления в поддержку').setRequired(true)))
        .addSubcommand(sub => sub.setName('removerole').setDescription('Удалить роль поддержки').addRoleOption(o => o.setName('role').setDescription('Роль для удаления').setRequired(true)))
        .addSubcommand(sub => sub.setName('reset').setDescription('Полностью сбросить настройки системы тикетов'))
        .addSubcommand(sub => sub.setName('transcript').setDescription('Отправить транскрипт тикета создателю и в лог-канал'))
        .addSubcommand(sub => sub.setName('removecategory').setDescription('Удалить категорию тикетов'))
        .addSubcommand(sub => sub.setName('remove').setDescription('Удалить пользователя из текущего тикета').addUserOption(o => o.setName('user').setDescription('Пользователь для удаления').setRequired(true)))
        .addSubcommand(sub => sub.setName('transfer').setDescription('Передать тикет другому сотруднику').addUserOption(o => o.setName('user').setDescription('Сотрудник для передачи').setRequired(true))),

    name: 'ticket',
    aliases: ['tickets'],
    category: 'utility',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        const validSubs = ['setup', 'panel', 'close', 'open', 'delete', 'add', 'remove', 'rename', 'claim', 'transfer', 'addcategory', 'removecategory', 'addrole', 'removerole', 'reset', 'transcript', 'sendpanel', 'del', 'reopen', 'shut', 'end', 'mv', 'name', 'delcat', 'rmcat', 'kick'];

        if (!subcommand || !validSubs.includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('tickets', interactionOrMessage);
        }

        const aliasMap = { sendpanel: 'panel', del: 'delete', reopen: 'open', shut: 'close', end: 'close', mv: 'rename', name: 'rename', delcat: 'removecategory', rmcat: 'removecategory', kick: 'remove' };
        const resolved = aliasMap[subcommand] || subcommand;

        const subcommandFile = require(`./subcommands/${resolved}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
