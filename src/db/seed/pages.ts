/**
 * Páginas fijas (reglas y legales) de RF-10 y RF-11.
 *
 * **Son textos de ejemplo**, salvo la política de cookies: los textos legales
 * reales los redacta Giiku Games GmbH y se cargarán desde el panel (T-23).
 * Cada texto de ejemplo lo dice en su primera línea, para que la demo no se
 * confunda con la web oficial. La política de cookies sí describe este sitio
 * tal como es: los nombres de las cookies se toman del código (`lib/consent.ts`,
 * `i18n/negotiate.ts` y `lib/auth/constants.ts`), y una prueba e2e comprueba que toda cookie que pone
 * el sitio aparece en la política.
 *
 * Están en inglés, el idioma de respaldo, y en español. En los otros cinco
 * idiomas se muestra la versión inglesa con el aviso "Disponible solo en
 * inglés", el mismo mecanismo que las noticias (RF-08).
 *
 * `db:seed` las inserta solo si no existen: nunca pisa un texto ya editado.
 */
import type { Locale } from "../../config/locales";
import { LOCALE_COOKIE } from "../../i18n/negotiate";
import { SESSION_COOKIE } from "../../lib/auth/constants";
import { CONSENT_COOKIE } from "../../lib/consent";

// Nombre de la cookie anónima de `/api/consent`.
const CONSENT_ID_COOKIE = "consent_id";

/** Páginas fijas y su ruta pública (`/{idioma}/{slug}`). */
export const PAGE_SLUGS = ["imprint", "terms", "rules", "privacy", "cookies"] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

export interface PageText {
  title: string;
  /** Markdown; los `##` forman el índice. */
  body: string;
}

const SAMPLE_EN =
  "> Sample text for the thesis demo. This is not the legal text of Giiku Games GmbH.";
const SAMPLE_ES =
  "> Texto de ejemplo para la demo de la tesis. No es el texto legal de Giiku Games GmbH.";

export const PAGE_TEXTS: Record<PageSlug, Partial<Record<Locale, PageText>> & { en: PageText }> = {
  imprint: {
    en: {
      title: "Imprint",
      body: `${SAMPLE_EN}

## Service provider

Giiku Games GmbH. The full company details (address, register number, VAT ID and managing directors) will be published here by the company.

## Contact

Use the [support page](/en/support) for questions about the game.

## Responsible for content

The person responsible for the content under applicable law will be named here.`,
    },
    es: {
      title: "Aviso legal",
      body: `${SAMPLE_ES}

## Prestador del servicio

Giiku Games GmbH. La empresa publicará aquí sus datos completos (dirección, número de registro, NIF intracomunitario y administradores).

## Contacto

Para dudas sobre el juego, usa la [página de soporte](/es/support).

## Responsable del contenido

Aquí figurará la persona responsable del contenido según la ley aplicable.`,
    },
  },
  terms: {
    en: {
      title: "Terms of service",
      body: `${SAMPLE_EN}

## Scope

These terms apply to the website and to the game Florensia.

## Your account

You are responsible for keeping your password secret. One person may hold several accounts, but sharing an account is not allowed.

## AP and virtual items

AP is a virtual currency for the item shop. It has no cash value and cannot be exchanged back for money. Every purchase shows the price in AP before you confirm it.

## Conduct

Playing Florensia means accepting the [rules](/en/rules).

## Changes to these terms

When these terms change, the date and version at the top of this page change too.`,
    },
    es: {
      title: "Términos del servicio",
      body: `${SAMPLE_ES}

## Ámbito

Estos términos se aplican a la web y al juego Florensia.

## Tu cuenta

Eres responsable de mantener tu contraseña en secreto. Una persona puede tener varias cuentas, pero no se permite compartirlas.

## AP y objetos virtuales

Los AP son una moneda virtual para la tienda de objetos. No tienen valor en dinero y no se pueden volver a cambiar por dinero. Cada compra muestra el precio en AP antes de confirmarla.

## Conducta

Jugar a Florensia supone aceptar las [reglas](/es/rules).

## Cambios en estos términos

Cuando cambien estos términos, también cambiarán la fecha y la versión indicadas al principio de esta página.`,
    },
  },
  rules: {
    en: {
      title: "Rules and code of conduct",
      body: `${SAMPLE_EN}

## Respect other players

No insults, harassment, discrimination or threats, in chat or in character names.

## Fair play

Bots, cheats, exploits and modified clients are forbidden. Report bugs instead of using them.

## Trading

Selling items, gold or accounts for real money is forbidden.

## Names

Character and guild names must not be offensive or impersonate staff.

## Reporting

Note the character name, the server and the time, take a screenshot and send it through the [support page](/en/support).

## Sanctions

Depending on the severity: warning, temporary ban or permanent ban.`,
    },
    es: {
      title: "Reglas y código de conducta",
      body: `${SAMPLE_ES}

## Respeta a los demás jugadores

Nada de insultos, acoso, discriminación ni amenazas, ni en el chat ni en los nombres de personaje.

## Juego limpio

Están prohibidos los bots, los trucos, el abuso de fallos y los clientes modificados. Si encuentras un fallo, avísalo en lugar de usarlo.

## Comercio

Está prohibido vender objetos, oro o cuentas por dinero real.

## Nombres

Los nombres de personajes y gremios no pueden ser ofensivos ni hacerse pasar por el equipo.

## Denuncias

Apunta el nombre del personaje, el servidor y la hora, haz una captura y envíala desde la [página de soporte](/es/support).

## Sanciones

Según la gravedad: aviso, suspensión temporal o expulsión permanente.`,
    },
  },
  privacy: {
    en: {
      title: "Privacy policy",
      body: `${SAMPLE_EN}

## What we store

For your account: user name, email address, language and a password hash (never the password itself). For purchases: what you bought and when.

## Proof of your cookie choice

When you accept or reject cookies we store your choice, the date and a random identifier. We do not store your IP address.

## Cookies

See the [cookie policy](/en/cookies).

## Your rights

Under the GDPR you can ask for access to your data, correct it, delete it or receive a copy.`,
    },
    es: {
      title: "Política de privacidad",
      body: `${SAMPLE_ES}

## Qué guardamos

De tu cuenta: nombre de usuario, correo, idioma y un hash de la contraseña (nunca la contraseña). De tus compras: qué compraste y cuándo.

## Prueba de tu elección de cookies

Cuando aceptas o rechazas las cookies guardamos tu elección, la fecha y un identificador aleatorio. No guardamos tu dirección IP.

## Cookies

Consulta la [política de cookies](/es/cookies).

## Tus derechos

Según el RGPD puedes pedir acceso a tus datos, corregirlos, borrarlos o recibir una copia.`,
    },
  },
  cookies: {
    en: {
      title: "Cookie policy",
      body: `## Necessary cookies

They are needed for the site to work and are always active.

- \`${LOCALE_COOKIE}\`: remembers your language for one year.
- \`${CONSENT_COOKIE}\`: remembers your cookie choice for six months.
- \`${CONSENT_ID_COOKIE}\`: random identifier that links your choice to its proof, for six months.
- \`${SESSION_COOKIE}\`: keeps you signed in, for seven days. Only if you sign in.

## Optional cookies

- **Analytics:** off by default. The site does not load any analytics script until you allow it.

## Change your choice

Use **Cookie settings** at the bottom of every page.`,
    },
    es: {
      title: "Política de cookies",
      body: `## Cookies necesarias

Hacen falta para que la web funcione y siempre están activas.

- \`${LOCALE_COOKIE}\`: recuerda tu idioma durante un año.
- \`${CONSENT_COOKIE}\`: recuerda tu elección de cookies durante seis meses.
- \`${CONSENT_ID_COOKIE}\`: identificador aleatorio que une tu elección con su prueba, durante seis meses.
- \`${SESSION_COOKIE}\`: mantiene tu sesión iniciada durante siete días. Solo si inicias sesión.

## Cookies opcionales

- **Analítica:** desactivada por defecto. La web no carga ningún script de analítica hasta que lo permitas.

## Cambiar tu elección

Usa **Configurar cookies**, al pie de cada página.`,
    },
  },
};
