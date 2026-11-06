/**
 * Noticias sintéticas para la demo (RF-08).
 *
 * Son funciones puras para poder testearlas sin base de datos. Cubren los
 * casos que la interfaz tiene que resolver:
 * - las cinco categorías de la especificación;
 * - cuerpos en Markdown con títulos, listas, negrita y enlaces;
 * - noticias **sin traducir** a algunos idiomas, para probar el aviso
 *   "Disponible solo en inglés" (RF-08);
 * - un evento con fecha de fin ya pasada (F-16: la web original mostraba
 *   eventos caducados como si siguieran activos);
 * - una noticia corregida después de publicarse (fecha de actualización);
 * - una noticia programada y un borrador, que no deben verse.
 *
 * Los textos son inventados: no describen contenido real del juego.
 */
import { LOCALES, type Locale } from "../../config/locales";
import type { PostCategory } from "../schema/content";

/** Textos de una noticia en un idioma. */
export interface DemoPostText {
  title: string;
  excerpt: string;
  /** Markdown. */
  body: string;
}

export interface DemoPost {
  slug: string;
  category: PostCategory;
  status: "draft" | "scheduled" | "published";
  /** Días respecto a hoy (negativo = pasado). `null` en borradores. */
  publishedInDays: number | null;
  /** Fin del evento en días respecto a hoy, si lo tiene. */
  expiresInDays: number | null;
  /** Última edición, si se corrigió después de publicarla. */
  updatedInDays: number | null;
  /** Siempre incluye inglés, el idioma de respaldo. */
  translations: Partial<Record<Locale, DemoPostText>>;
}

interface Template {
  title: (n: number) => string;
  excerpt: string;
  heading: string;
  points: readonly [string, string, string];
  /** Texto del enlace final; el destino depende de la categoría. */
  link: string;
}

const TEMPLATES: Record<PostCategory, Record<Locale, Template>> = {
  announcement: {
    en: {
      title: (n) => `Patch notes ${n}`,
      excerpt: "New quests, balance changes and fixes arrive with this update.",
      heading: "What changes",
      points: ["Two new island quests.", "Saint healing rebalanced.", "Fixed ship collisions."],
      link: "Join the discussion on Discord",
    },
    "pt-BR": {
      title: (n) => `Notas da atualização ${n}`,
      excerpt: "Novas missões, ajustes de equilíbrio e correções chegam com esta atualização.",
      heading: "O que muda",
      points: [
        "Duas novas missões na ilha.",
        "Cura do Saint rebalanceada.",
        "Colisões de navios corrigidas.",
      ],
      link: "Participe da conversa no Discord",
    },
    tr: {
      title: (n) => `Güncelleme notları ${n}`,
      excerpt: "Bu güncellemeyle yeni görevler, denge değişiklikleri ve düzeltmeler geliyor.",
      heading: "Neler değişiyor",
      points: [
        "İki yeni ada görevi.",
        "Saint iyileştirmesi dengelendi.",
        "Gemi çarpışmaları düzeltildi.",
      ],
      link: "Discord'daki tartışmaya katıl",
    },
    it: {
      title: (n) => `Note di aggiornamento ${n}`,
      excerpt:
        "Nuove missioni, modifiche al bilanciamento e correzioni arrivano con questo aggiornamento.",
      heading: "Cosa cambia",
      points: [
        "Due nuove missioni sull'isola.",
        "Cure del Saint ribilanciate.",
        "Corrette le collisioni delle navi.",
      ],
      link: "Partecipa alla discussione su Discord",
    },
    de: {
      title: (n) => `Patchnotes ${n}`,
      excerpt: "Neue Quests, Balance-Änderungen und Fehlerbehebungen kommen mit diesem Update.",
      heading: "Was sich ändert",
      points: [
        "Zwei neue Insel-Quests.",
        "Heilung des Saint angepasst.",
        "Schiffskollisionen behoben.",
      ],
      link: "Diskutiere mit auf Discord",
    },
    fr: {
      title: (n) => `Notes de mise à jour ${n}`,
      excerpt:
        "De nouvelles quêtes, des ajustements d’équilibrage et des correctifs arrivent avec cette mise à jour.",
      heading: "Ce qui change",
      points: [
        "Deux nouvelles quêtes sur l’île.",
        "Soins du Saint rééquilibrés.",
        "Collisions des navires corrigées.",
      ],
      link: "Rejoignez la discussion sur Discord",
    },
    es: {
      title: (n) => `Notas del parche ${n}`,
      excerpt:
        "Nuevas misiones, cambios de equilibrio y correcciones llegan con esta actualización.",
      heading: "Qué cambia",
      points: [
        "Dos misiones nuevas en la isla.",
        "Curación del Saint reequilibrada.",
        "Corregidas las colisiones de barcos.",
      ],
      link: "Únete a la conversación en Discord",
    },
  },
  event: {
    en: {
      title: (n) => `Sea festival ${n}`,
      excerpt: "Sail, fish and win rewards during the sea festival.",
      heading: "How to take part",
      points: ["Talk to the harbour master.", "Catch rare fish at sea.", "Swap them for rewards."],
      link: "See the rankings",
    },
    "pt-BR": {
      title: (n) => `Festival do mar ${n}`,
      excerpt: "Navegue, pesque e ganhe recompensas durante o festival do mar.",
      heading: "Como participar",
      points: [
        "Fale com o capitão do porto.",
        "Pesque peixes raros no mar.",
        "Troque-os por recompensas.",
      ],
      link: "Veja os rankings",
    },
    tr: {
      title: (n) => `Deniz festivali ${n}`,
      excerpt: "Deniz festivali boyunca yelken aç, balık tut ve ödüller kazan.",
      heading: "Nasıl katılırım",
      points: [
        "Liman başkanıyla konuş.",
        "Denizde nadir balıklar yakala.",
        "Onları ödüllerle değiştir.",
      ],
      link: "Sıralamaları gör",
    },
    it: {
      title: (n) => `Festa del mare ${n}`,
      excerpt: "Naviga, pesca e vinci premi durante la festa del mare.",
      heading: "Come partecipare",
      points: [
        "Parla con il capitano del porto.",
        "Pesca pesci rari in mare.",
        "Scambiali con i premi.",
      ],
      link: "Guarda le classifiche",
    },
    de: {
      title: (n) => `Meeresfest ${n}`,
      excerpt: "Segle, angle und gewinne Belohnungen während des Meeresfests.",
      heading: "So machst du mit",
      points: [
        "Sprich mit dem Hafenmeister.",
        "Fange seltene Fische auf See.",
        "Tausche sie gegen Belohnungen.",
      ],
      link: "Zu den Ranglisten",
    },
    fr: {
      title: (n) => `Fête de la mer ${n}`,
      excerpt: "Naviguez, pêchez et gagnez des récompenses pendant la fête de la mer.",
      heading: "Comment participer",
      points: [
        "Parlez au capitaine du port.",
        "Pêchez des poissons rares en mer.",
        "Échangez-les contre des récompenses.",
      ],
      link: "Voir les classements",
    },
    es: {
      title: (n) => `Fiesta del mar ${n}`,
      excerpt: "Navega, pesca y gana recompensas durante la fiesta del mar.",
      heading: "Cómo participar",
      points: [
        "Habla con el capitán del puerto.",
        "Pesca peces raros en alta mar.",
        "Cámbialos por recompensas.",
      ],
      link: "Ver los rankings",
    },
  },
  shop: {
    en: {
      title: (n) => `Shop update ${n}`,
      excerpt: "New costumes and a limited-time discount arrive in the item shop.",
      heading: "New in the shop",
      points: [
        "Three new costumes.",
        "**20 % off** ship boosts.",
        "Offer ends on the date shown in the shop.",
      ],
      link: "Go to the shop",
    },
    "pt-BR": {
      title: (n) => `Novidades da loja ${n}`,
      excerpt: "Novos trajes e um desconto por tempo limitado chegam à loja.",
      heading: "Novidades na loja",
      points: [
        "Três novos trajes.",
        "**20 % de desconto** em melhorias de navio.",
        "A oferta termina na data indicada na loja.",
      ],
      link: "Ir para a loja",
    },
    tr: {
      title: (n) => `Mağaza güncellemesi ${n}`,
      excerpt: "Mağazaya yeni kostümler ve sınırlı süreli bir indirim geliyor.",
      heading: "Mağazada yeni",
      points: [
        "Üç yeni kostüm.",
        "Gemi güçlendirmelerinde **%20 indirim**.",
        "Teklif mağazada gösterilen tarihte biter.",
      ],
      link: "Mağazaya git",
    },
    it: {
      title: (n) => `Novità del negozio ${n}`,
      excerpt: "Nuovi costumi e uno sconto a tempo limitato arrivano nel negozio.",
      heading: "Novità nel negozio",
      points: [
        "Tre nuovi costumi.",
        "**20 % di sconto** sui potenziamenti delle navi.",
        "L'offerta termina alla data indicata nel negozio.",
      ],
      link: "Vai al negozio",
    },
    de: {
      title: (n) => `Shop-Update ${n}`,
      excerpt: "Neue Kostüme und ein zeitlich begrenzter Rabatt im Item-Shop.",
      heading: "Neu im Shop",
      points: [
        "Drei neue Kostüme.",
        "**20 % Rabatt** auf Schiffs-Boosts.",
        "Das Angebot endet am im Shop angegebenen Datum.",
      ],
      link: "Zum Shop",
    },
    fr: {
      title: (n) => `Nouveautés de la boutique ${n}`,
      excerpt: "De nouveaux costumes et une réduction limitée arrivent dans la boutique.",
      heading: "Nouveau dans la boutique",
      points: [
        "Trois nouveaux costumes.",
        "**20 % de réduction** sur les bonus de navire.",
        "L’offre se termine à la date indiquée dans la boutique.",
      ],
      link: "Aller à la boutique",
    },
    es: {
      title: (n) => `Novedades de la tienda ${n}`,
      excerpt: "Nuevos trajes y un descuento por tiempo limitado llegan a la tienda.",
      heading: "Nuevo en la tienda",
      points: [
        "Tres trajes nuevos.",
        "**20 % de descuento** en mejoras de barco.",
        "La oferta termina en la fecha indicada en la tienda.",
      ],
      link: "Ir a la tienda",
    },
  },
  redeem: {
    en: {
      title: (n) => `Free code ${n}`,
      excerpt: "Redeem this code for a small gift before it expires.",
      heading: "How to redeem it",
      points: ["Sign in to your account.", "Open *Redeem code*.", "Enter **WELCOME2026**."],
      link: "Read the rules",
    },
    "pt-BR": {
      title: (n) => `Código grátis ${n}`,
      excerpt: "Resgate este código para ganhar um presente antes que expire.",
      heading: "Como resgatar",
      points: ["Entre na sua conta.", "Abra *Resgatar código*.", "Digite **WELCOME2026**."],
      link: "Leia as regras",
    },
    tr: {
      title: (n) => `Ücretsiz kod ${n}`,
      excerpt: "Süresi dolmadan bu kodu kullanarak küçük bir hediye kazan.",
      heading: "Nasıl kullanılır",
      points: ["Hesabına giriş yap.", "*Kod kullan* bölümünü aç.", "**WELCOME2026** yaz."],
      link: "Kuralları oku",
    },
    it: {
      title: (n) => `Codice gratuito ${n}`,
      excerpt: "Riscatta questo codice per un piccolo regalo prima che scada.",
      heading: "Come riscattarlo",
      points: ["Accedi al tuo account.", "Apri *Riscatta codice*.", "Inserisci **WELCOME2026**."],
      link: "Leggi le regole",
    },
    de: {
      title: (n) => `Gratis-Code ${n}`,
      excerpt: "Löse diesen Code für ein kleines Geschenk ein, bevor er abläuft.",
      heading: "So löst du ihn ein",
      points: ["Melde dich an.", "Öffne *Code einlösen*.", "Gib **WELCOME2026** ein."],
      link: "Regeln lesen",
    },
    fr: {
      title: (n) => `Code gratuit ${n}`,
      excerpt: "Utilisez ce code pour recevoir un petit cadeau avant son expiration.",
      heading: "Comment l’utiliser",
      points: [
        "Connectez-vous à votre compte.",
        "Ouvrez *Utiliser un code*.",
        "Saisissez **WELCOME2026**.",
      ],
      link: "Lire les règles",
    },
    es: {
      title: (n) => `Código gratis ${n}`,
      excerpt: "Canjea este código por un pequeño regalo antes de que caduque.",
      heading: "Cómo canjearlo",
      points: ["Inicia sesión en tu cuenta.", "Abre *Canjear código*.", "Escribe **WELCOME2026**."],
      link: "Leer las reglas",
    },
  },
  maintenance: {
    en: {
      title: (n) => `Scheduled maintenance ${n}`,
      excerpt: "The servers will be offline for about two hours.",
      heading: "Details",
      points: [
        "Both servers are affected.",
        "The launcher will show the progress.",
        "Ongoing events are extended.",
      ],
      link: "Contact support",
    },
    "pt-BR": {
      title: (n) => `Manutenção programada ${n}`,
      excerpt: "Os servidores ficarão fora do ar por cerca de duas horas.",
      heading: "Detalhes",
      points: [
        "Os dois servidores são afetados.",
        "O launcher mostrará o progresso.",
        "Os eventos em andamento serão estendidos.",
      ],
      link: "Fale com o suporte",
    },
    tr: {
      title: (n) => `Planlı bakım ${n}`,
      excerpt: "Sunucular yaklaşık iki saat kapalı olacak.",
      heading: "Ayrıntılar",
      points: [
        "İki sunucu da etkileniyor.",
        "Başlatıcı ilerlemeyi gösterecek.",
        "Devam eden etkinlikler uzatılacak.",
      ],
      link: "Destekle iletişime geç",
    },
    it: {
      title: (n) => `Manutenzione programmata ${n}`,
      excerpt: "I server resteranno offline per circa due ore.",
      heading: "Dettagli",
      points: [
        "Sono coinvolti entrambi i server.",
        "Il launcher mostrerà l'avanzamento.",
        "Gli eventi in corso verranno prolungati.",
      ],
      link: "Contatta l'assistenza",
    },
    de: {
      title: (n) => `Geplante Wartung ${n}`,
      excerpt: "Die Server sind etwa zwei Stunden offline.",
      heading: "Details",
      points: [
        "Beide Server sind betroffen.",
        "Der Launcher zeigt den Fortschritt.",
        "Laufende Events werden verlängert.",
      ],
      link: "Support kontaktieren",
    },
    fr: {
      title: (n) => `Maintenance programmée ${n}`,
      excerpt: "Les serveurs seront hors ligne pendant environ deux heures.",
      heading: "Détails",
      points: [
        "Les deux serveurs sont concernés.",
        "Le launcher affichera la progression.",
        "Les événements en cours seront prolongés.",
      ],
      link: "Contacter le support",
    },
    es: {
      title: (n) => `Mantenimiento programado ${n}`,
      excerpt: "Los servidores estarán desconectados unas dos horas.",
      heading: "Detalles",
      points: [
        "Afecta a los dos servidores.",
        "El launcher mostrará el progreso.",
        "Los eventos en curso se alargan.",
      ],
      link: "Contactar con soporte",
    },
  },
};

/** Destino del enlace final de cada categoría (ruta sin idioma o URL externa). */
const LINK_TARGET: Record<PostCategory, string> = {
  announcement: "https://discord.gg/Florensia",
  event: "/rankings",
  shop: "/shop",
  redeem: "/rules",
  maintenance: "/support",
};

/** Orden de categorías a lo largo de las noticias de demo. */
const CATEGORY_CYCLE: readonly PostCategory[] = [
  "announcement",
  "event",
  "shop",
  "maintenance",
  "redeem",
];

/**
 * Idiomas a los que está traducida cada noticia, por número. Las que no
 * aparecen están en los siete.
 */
const PARTIAL_LOCALES: Readonly<Record<number, readonly Locale[]>> = {
  // Solo en inglés: en cualquier otro idioma se ve con el aviso.
  5: ["en"],
  // Traducida a la mitad de los idiomas.
  9: ["en", "de", "fr", "pt-BR"],
};

/** Número de noticias de demo. */
export const DEMO_POST_COUNT = 14;

/** Construye el texto Markdown y los campos de una noticia en un idioma. */
export function buildPostText(category: PostCategory, locale: Locale, n: number): DemoPostText {
  const tpl = TEMPLATES[category][locale];
  const target = LINK_TARGET[category];
  const href = target.startsWith("/") ? `/${locale}${target}` : target;
  const body = [
    tpl.excerpt,
    `## ${tpl.heading}`,
    tpl.points.map((p) => `- ${p}`).join("\n"),
    `[${tpl.link}](${href})`,
  ].join("\n\n");
  return { title: tpl.title(n), excerpt: tpl.excerpt, body };
}

/**
 * Lista de noticias de demo, de la más antigua a la más reciente.
 *
 * - La 13 está programada (se publica dentro de 3 días) y la 14 es un
 *   borrador: ninguna debe aparecer en el listado público.
 * - Las de evento terminan 5 días después de publicarse; la más antigua ya
 *   terminó y la interfaz debe marcarla como tal.
 * - La publicación más reciente es de hace 1 día; luego una por semana.
 */
export function buildDemoPosts(): DemoPost[] {
  return Array.from({ length: DEMO_POST_COUNT }, (_, i): DemoPost => {
    const n = i + 1;
    const category = CATEGORY_CYCLE[i % CATEGORY_CYCLE.length]!;
    const status =
      n === DEMO_POST_COUNT ? "draft" : n === DEMO_POST_COUNT - 1 ? "scheduled" : "published";
    const publishedInDays =
      status === "draft" ? null : status === "scheduled" ? 3 : -1 - (DEMO_POST_COUNT - 2 - n) * 7;
    const locales = PARTIAL_LOCALES[n] ?? LOCALES;
    return {
      slug: `${category}-${n}`,
      category,
      status,
      publishedInDays,
      expiresInDays: category === "event" && publishedInDays !== null ? publishedInDays + 5 : null,
      // Una noticia corregida dos días después de publicarse.
      updatedInDays: n === 11 && publishedInDays !== null ? publishedInDays + 2 : null,
      translations: Object.fromEntries(
        locales.map((locale) => [locale, buildPostText(category, locale, n)]),
      ),
    };
  });
}
