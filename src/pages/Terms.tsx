import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useI18n, useLocalized } from "@/lib/i18n";

type Doc = {
  title: string;
  updated: string;
  sections: { h: string; p?: string[]; ul?: string[]; privacyLink?: boolean }[];
};

const RU: Doc = {
  title: "Договор-оферта и условия использования",
  updated: "Niko Control Center · редакция от 22 сентября 2026",
  sections: [
    {
      h: "1. Общие положения",
      p: [
        "Настоящий документ является публичной офертой (предложением) владельца сервиса Niko — Богданова Артёма Владимировича (далее — «Владелец») заключить договор об условиях использования Discord-бота Niko и веб-панели «Niko Control Center» (далее — «Сервис») с любым дееспособным пользователем (далее — «Пользователь»).",
        "Начало использования Сервиса — добавление бота на сервер, вход в дашборд через Discord или отправка обращения в поддержку — означает полное и безоговорочное принятие настоящих условий (акцепт оферты).",
      ],
    },
    {
      h: "2. Статус Сервиса",
      p: [
        "Сервис предоставляется «как есть» (as is). Владелец не гарантирует непрерывную работу, но стремится оперативно устранять сбои. Отдельные функции Сервиса могут изменяться, дополняться или прекращаться без предварительного уведомления. Сервис не связан с Discord Inc.",
      ],
    },
    {
      h: "3. Права и обязанности Пользователя",
      ul: [
        "Использовать Сервис только законными способами и в соответствии с правилами Discord (Terms of Service, Community Guidelines).",
        "Не пытаться получить несанкционированный доступ к панели, базе данных, токенам или инфраструктуре Сервиса.",
        "Не использовать бота для спама, рейдов, массовых рассылок, обхода блокировок и иной деятельности, нарушающей правила Discord или законодательство.",
        "Уважать право «Управление сервером»: функции дашборда доступны только тем, у кого оно есть на соответствующем сервере.",
      ],
    },
    {
      h: "4. Ограничение ответственности",
      p: [
        "Владелец не несёт ответственности за любой прямой или косвенный ущерб, возникший в результате использования или невозможности использования Сервиса, включая, но не ограничиваясь: утерю данных серверов Discord, модераторские действия бота, выполненные на основании настроек, заданных Пользователем, перерывы в работе и действия третьих лиц.",
        "Ответственность за действия, совершённые через дашборд на сервере, несёт Пользователь, обладающий правом «Управление сервером» на этом сервере.",
      ],
    },
    {
      h: "5. Интеллектуальная собственность",
      p: [
        "Код, дизайн и элементы бренда Niko Control Center принадлежат Владельцу. Копирование, распространение и использование в сторонних проектах без письменного согласия Владельца не допускается.",
      ],
    },
    {
      h: "6. Персональные данные и согласие на обработку",
      p: [
        "Используя Сервис, Пользователь даёт согласие на обработку следующих данных: идентификатор Discord, имя пользователя, аватар, список серверов с правом управления, содержимое обращений в поддержку. Цели обработки — работа дашборда, техническая поддержка и безопасность Сервиса.",
        "Обработка осуществляется на хосте Владельца без передачи третьим лицам. Отзыв согласия: обращение в поддержку — данные будут удалены, а использование дашборда прекращено. Полные детали — в Политике конфиденциальности.",
      ],
      privacyLink: true,
    },
    {
      h: "7. Блокировка доступа",
      p: [
        "Владелец вправе ограничить доступ к Сервису (чёрный список пользователя или сервера) без объяснения причин при нарушении настоящих условий, правил Discord или при попытках дестабилизировать работу Сервиса.",
      ],
    },
    {
      h: "8. Изменения условий",
      p: [
        "Владелец может изменять условия оферты. Новая редакция вступает в силу с момента публикации на этой странице, если не указано иное. Продолжение использования Сервиса после публикации означает согласие с новой редакцией.",
      ],
    },
    {
      h: "9. Реквизиты и контакты",
      p: [
        "Владелец: Богданов Артём Владимирович. Обратная связь — страница «Поддержка» в дашборде или сервер поддержки бота.",
      ],
    },
  ],
};

const EN: Doc = {
  title: "Terms of service",
  updated: "Niko Control Center · version of September 22, 2026",
  sections: [
    {
      h: "1. General provisions",
      p: [
        "This document is a public offer by the owner of the Niko service — Bogdanov Artem Vladimirovich (the «Owner») — to conclude an agreement on the terms of use of the Niko Discord bot and the «Niko Control Center» web panel (the «Service») with any capable user (the «User»).",
        "Starting to use the Service — adding the bot to a server, signing in to the dashboard with Discord or sending a support ticket — means full and unconditional acceptance of these terms.",
      ],
    },
    {
      h: "2. Status of the Service",
      p: [
        "The Service is provided «as is». The Owner does not guarantee uninterrupted operation but aims to fix failures promptly. Individual features may change, be extended or discontinued without prior notice. The Service is not affiliated with Discord Inc.",
      ],
    },
    {
      h: "3. Rights and obligations of the User",
      ul: [
        "Use the Service only lawfully and in accordance with Discord's rules (Terms of Service, Community Guidelines).",
        "Do not attempt to gain unauthorised access to the panel, database, tokens or infrastructure of the Service.",
        "Do not use the bot for spam, raids, mass messaging, circumventing blocks or any other activity that violates Discord's rules or the law.",
        "Respect the «Manage Server» permission: dashboard features are only available to those who hold it on the relevant server.",
      ],
    },
    {
      h: "4. Limitation of liability",
      p: [
        "The Owner is not liable for any direct or indirect damage arising from the use of, or inability to use, the Service, including but not limited to: loss of Discord server data, moderation actions performed by the bot based on settings configured by the User, downtime and the actions of third parties.",
        "Responsibility for actions taken through the dashboard on a server lies with the User who holds the «Manage Server» permission on that server.",
      ],
    },
    {
      h: "5. Intellectual property",
      p: [
        "The code, design and brand elements of Niko Control Center belong to the Owner. Copying, distribution and use in third-party projects without the Owner's written consent is not permitted.",
      ],
    },
    {
      h: "6. Personal data and consent to processing",
      p: [
        "By using the Service the User consents to the processing of the following data: Discord identifier, username, avatar, the list of servers where they can manage, and the content of support tickets. The purposes are running the dashboard, technical support and the security of the Service.",
        "Processing happens on the Owner's host without transfer to third parties. To withdraw consent, contact support — the data will be deleted and dashboard access terminated. Full details are in the Privacy Policy.",
      ],
      privacyLink: true,
    },
    {
      h: "7. Blocking access",
      p: [
        "The Owner may restrict access to the Service (user or server blacklist) without explanation in case of a breach of these terms, Discord's rules, or attempts to destabilise the Service.",
      ],
    },
    {
      h: "8. Changes to the terms",
      p: [
        "The Owner may change the terms of the offer. A new version takes effect the moment it is published on this page unless stated otherwise. Continued use of the Service after publication means acceptance of the new version.",
      ],
    },
    {
      h: "9. Details and contacts",
      p: [
        "Owner: Bogdanov Artem Vladimirovich. Contact us through the Support page in the dashboard or the bot's support server.",
      ],
    },
  ],
};

export default function Terms() {
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
              <FileText className="h-3.5 w-3.5" /> {t("ln.termsShort")}
            </div>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight md:text-4xl">{doc.title}</h1>
            <p className="mt-2 text-sm text-ink-300">{doc.updated}</p>
          </div>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-ink-200">
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
              {s.p?.map((p, i) => (
                <p key={p} className="mt-2">
                  {p}
                  {s.privacyLink && i === s.p!.length - 1 && (
                    <>
                      {" "}
                      <Link
                        to="/privacy"
                        className="font-semibold text-white underline-offset-4 hover:underline"
                      >
                        {t("legal.privacyTitle")}
                      </Link>
                      .
                    </>
                  )}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-white/50 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.backHome")}
          </Link>
          <Link
            to="/privacy"
            className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-white/50 hover:bg-white/5"
          >
            {t("legal.privacyTitle")}
          </Link>
        </div>
      </div>
    </div>
  );
}
