import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useI18n, useLocalized } from "@/lib/i18n";

type Doc = {
  title: string;
  updated: string;
  sections: { h: string; p?: string[]; ul?: string[] }[];
};

const RU: Doc = {
  title: "Политика конфиденциальности",
  updated: "Niko Control Center · последнее обновление: 22 сентября 2026",
  sections: [
    {
      h: "1. Кто обрабатывает данные",
      p: [
        "Владелец сервиса Niko (Discord-бот и веб-дашборд «Niko Control Center»): Богданов Артем Владимирович. Связь — через страницу «Поддержка» в дашборде или сервер поддержки бота.",
      ],
    },
    {
      h: "2. Какие данные обрабатываются",
      ul: [
        "При входе через Discord: ваш ID, имя пользователя и аватар (области OAuth: identify, guilds).",
        "Список серверов, где у вас есть право «Управление сервером» — только для отображения в дашборде.",
        "Содержимое обращений в поддержку, которое вы отправляете сами.",
        "Служебные данные бота: мод-логи, розыгрыши, тикеты и настройки серверов, где добавлен Niko.",
      ],
      p: ["Дашборд не читает содержимое ваших личных сообщений."],
    },
    {
      h: "3. Зачем эти данные",
      p: [
        "Только для работы дашборда: показать ваши серверы, дать управлять функциями бота там, где у вас есть права, и отвечать на обращения в поддержку. Данные не продаются и не передаются третьим лицам.",
      ],
    },
    {
      h: "4. Хранение",
      p: [
        "Данные хранятся на хосте владельца. Сессия входа — подписанная cookie, удаляется при выходе или по истечении срока.",
      ],
    },
    {
      h: "5. Ваши права",
      p: [
        "Напишите в поддержку — удалим ваши обращения и связанные записи по запросу. Чтобы отозвать доступ дашборда, достаточно выйти и сменить авторизацию приложения в настройках Discord.",
      ],
    },
  ],
};

const EN: Doc = {
  title: "Privacy policy",
  updated: "Niko Control Center · last updated: September 22, 2026",
  sections: [
    {
      h: "1. Who processes the data",
      p: [
        "The owner of the Niko service (Discord bot and the «Niko Control Center» web dashboard): Bogdanov Artem Vladimirovich. Contact us through the Support page in the dashboard or the bot's support server.",
      ],
    },
    {
      h: "2. What data is processed",
      ul: [
        "When you sign in with Discord: your ID, username and avatar (OAuth scopes: identify, guilds).",
        "The list of servers where you hold the «Manage Server» permission — only to render the dashboard.",
        "The content of support tickets that you send yourself.",
        "The bot's operational data: mod logs, giveaways, tickets and settings of servers where Niko is present.",
      ],
      p: ["The dashboard never reads the content of your direct messages."],
    },
    {
      h: "3. Why we need it",
      p: [
        "Only to run the dashboard: show your servers, let you manage bot features where you have permission, and answer support requests. Data is never sold or shared with third parties.",
      ],
    },
    {
      h: "4. Storage",
      p: [
        "Data is stored on the owner's host. Your sign-in session is a signed cookie that is deleted on logout or when it expires.",
      ],
    },
    {
      h: "5. Your rights",
      p: [
        "Write to support and we will delete your tickets and related records on request. To revoke dashboard access, simply log out and deauthorise the application in your Discord settings.",
      ],
    },
  ],
};

export default function Privacy() {
  const { t } = useI18n();
  const doc = useLocalized(RU, EN);

  return (
    <div className="min-h-screen bg-ink-950 px-6 py-16 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-40" />
      </div>
      <div className="relative mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("ln.privacyShort")}
            </div>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight md:text-4xl">{doc.title}</h1>
            <p className="mt-2 text-sm text-ink-300">{doc.updated}</p>
          </div>
        </div>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-200">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-lg font-bold text-white">{s.h}</h2>
              {s.ul && (
                <ul className="mt-2 list-disc space-y-1.5 pl-5">
                  {s.ul.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
              {s.p?.map((p) => (
                <p key={p} className="mt-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <Link
          to="/"
          className="mt-12 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-white/50 hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.backHome")}
        </Link>
      </div>
    </div>
  );
}
