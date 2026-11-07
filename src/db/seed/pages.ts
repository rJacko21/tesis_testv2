/**
 * Páginas fijas (reglas y legales) de RF-10 y RF-11.
 *
 * - **Aviso legal y código de conducta:** textos oficiales de Giiku Games GmbH
 *   tal como están en florensia-online.com (los facilitó Armando el
 *   2026-11-07), solo en inglés, como en la web original. Solo se les han
 *   puesto encabezados `##`/`###` y listas para que tengan índice; la
 *   redacción no se ha tocado.
 * - **Términos y privacidad:** aún son textos de ejemplo, y lo dicen en su
 *   primera línea para que la demo no se confunda con la web oficial.
 * - **Política de cookies:** describe este sitio tal como es. Los nombres de
 *   las cookies se toman del código (`lib/consent.ts`, `i18n/negotiate.ts` y
 *   `lib/auth/constants.ts`), y una prueba e2e comprueba que toda cookie que
 *   pone el sitio aparece en la política.
 *
 * En los idiomas sin texto se muestra la versión inglesa con el aviso
 * "Disponible solo en inglés", el mismo mecanismo que las noticias (RF-08).
 *
 * `db:seed` las inserta solo si no existen: nunca pisa un texto ya editado.
 * La excepción son los textos de ejemplo (`SAMPLE_MARKERS`), que se cambian
 * por el real en cuanto este existe.
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

/** Comienzo de los textos de ejemplo: `db:seed` los sustituye cuando llega el real. */
export const SAMPLE_MARKERS = ["> Sample text", "> Texto de ejemplo"] as const;

export const PAGE_TEXTS: Record<PageSlug, Partial<Record<Locale, PageText>> & { en: PageText }> = {
  imprint: {
    en: {
      title: "Imprint",
      body: `## Giiku Games GmbH

Giiku Games GmbH is a company incorporated under German law.

## Address

Mailing Address:

- Giiku Games GmbH
- Rehleitenweg 32b
- 83026 Rosenheim
- Germany

## Corporate Information

- Managing Director: Achim Kaspers
- Court of registry: district court of Traunstein
- Trade register number: HRB 27763
- VAT-ID: DE323063583
- Phone: +49 (0) 8031 / 22273 20
- E-Mail: info@giikugames.com

## Commissioner for Youth Protection

Maximilian Gramstat

E-Mail: datenschutz@giikugames.com

**kein Game- oder Payment-Support! / no game or payment support!**

## Disclaimer

Although every effort is made to present current and accurate information, we cannot assume responsibility for information from external links. The author of each web page is solely responsible for the content of that page.

### Content

The author reserves the right not to be responsible for the topicality, correctness, completeness or quality of the information provided. Liability claims regarding damage caused by the use of any information provided, including any kind of information which is incomplete or incorrect, will therefore be rejected. All offers are not-binding and without obligation. Parts of the pages or the complete publication including all offers and information might be extended, changed or partly or completely deleted by the author without separate announcement.

### Referrals and links

The author is not responsible for any contents linked or referred to from his pages unless he has full knowledge of illegal contents and would be able to prevent the visitors of his site from viewing those pages. If any damage occurs by the use of information presented there, only the author of the respective pages might be liable, not the one who has linked to these pages. Furthermore the author is not liable for any postings or messages published by users of discussion boards, guestbooks or mailinglists provided on his page.

### Copyright

The author intended not to use any copyrighted material for the publication or, if not possible, to indicate the copyright of the respective object. The copyright for any material created by the author is reserved. Any duplication or use of objects such as diagrams, sounds or texts in other electronic or printed publications is not permitted without the author's agreement.

### Privacy policy

If the opportunity for the input of personal or business data (email addresses, name, addresses) is given, the input of these data takes place voluntarily. The use and payment of all offered services are permitted if and so far technically possible and reasonable without specification of any personal data or under specification of anonymous data or an alias.

### Legal validity of this disclaimer

This disclaimer is to be regarded as part of the internet publication which you were referred from. If sections or individual terms of this statement are not legal or correct, the content or validity of the other parts remain uninfluenced by this fact.

© 2019-2023 Giiku Games GmbH. All rights reserved.`,
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
      title: "Code of Conduct",
      body: `We are dedicated to providing and supporting an inclusive, friendly, safe, and welcoming culture for everyone. This Code of Conduct outlines the expectations for behavior within the Florensia community, ensuring a positive experience for all gamers and staff, regardless of gender, sexual orientation, disability, ethnicity, or religion.

## General policies

### Lawful conduct

Posting, sharing, or promoting illegal content is strictly prohibited. The same laws that apply offline also apply in our online world. We have a zero-tolerance policy for any illegal activity, including but not limited to stalking, threats of violence, child exploitation, and doxing.

### Language

Players are welcome to use any of the supported languages in game chats, including English, German, French, Italian, Turkish, Spanish, and Portuguese. However, we encourage the use of English whenever possible to promote clearer communication and mutual understanding across the community.

### Respectful behavior

Treat other players with respect and kindness. Prohibited actions include, but are not limited:

- Insults, bullying, hate speech flaming, and toxic behavior
- Harassment, discrimination, spreading rumour and impersonations.
- Witch-hunting of players or staff members.

Avoid spamming, using sexualized language, discussions on political or religious topics. Private disputes or drama between players should remain outside public chats.

Do not assume that the presence of a chat filter gives you free rein to say anything inappropriate.

Dishonest behavior is not tolerated. This includes deceiving, manipulating, scamming, or intentionally misleading other players in any form.

### Fairness

All players are expected to play fairly and respect the rules of the game. Exploiting bugs, using cheats or hacks, or engaging in any other unfair behavior to gain an advantage - or to assist others in doing so - is strictly prohibited.

### Privacy

Always respect the privacy of others. Do not post, share, or distribute any content that reveals personal or private information about another player without their explicit consent.

### No cheating

Cheating of any kind - whether against other players or the game itself - is strictly prohibited. This includes using fraudulent methods to obtain items, currency, or other in-game benefits.

The use of automation tools such as macros, scripts, bots, or any third-party software or hardware that enables automatic actions (e.g., skill use or attacks) is not allowed. Assisting others who engage in these activities, or storing or transferring items on their behalf, is also forbidden.

**Exceptions:** Pets purchased from the Cash Shop that automatically loot or attack are permitted, as long as they are used according to their intended functionality.

### Responsible communication

Use all chat and communication tools responsibly. Do not post or share content that encourages, solicits, or supports illegal, obscene, disruptive, or harmful behavior. Prohibited content includes, but is not limited to:

- Terrorist or extremist propaganda.
- Misinformation, fraud, or deceptive schemes
- Scams or content intended to exploit or harm others
- Sexually explicit material.
- Commercial advertisements, solicitations, or promotions

Attempts to bypass these rules-such as using misspellings, phonetic spellings, homonyms, word combinations, or alternate spellings to mask inappropriate content - are also strictly prohibited.

### Account and item security

- Keep your account secure. Never share your account credentials or personal information with others. You are solely responsible for the safety and security of your account.
- Account transfers are prohibited. Selling, trading, or gifting accounts is strictly forbidden.
- No real-money trading. The buying or selling of in-game items or currency for real money is not allowed under any circumstances. This includes advertising or expressing intent to engage in such transactions.
- Item lending is at your own risk. Lending items to other characters is done at your own risk. If an item you lend is not returned as agreed, you may report the incident, and the offender may face disciplinary action. However, Florensia Support may not be able to retrieve or return the lent item to you.

## Naming policy

This policy applies to all player-created names within the game, including but not limited to character names, guild names, shop names, and pet names. By creating and using a name in the game, players agree to abide by the following guidelines.

Player-made names must not:

- Impersonate any individual, entity, or group, including employees or representatives of Giiku Games.
- Promote illegal substances, actions, or behaviors that violate the law.
- Advertise or solicit for businesses or services.
- Violate intellectual property rights, such as trademarked names or other proprietary rights.
- Use misspellings, alternate spellings, or combinations of words, symbols, and letters to create names that would otherwise violate this policy.
- Intentionally cause or contribute to disruptive behavior. This includes using names that could be offensive, inappropriate, or hateful toward individuals or groups. Names that reference or glorify discriminatory ideologies, terrorist organizations, violent extremists, criminal groups, or their figureheads are strictly prohibited

Names of public figures may be allowed, provided they are not highly controversial, offensive, or disruptive. The final decision on whether a name is acceptable rests with the Florensia support team.

This is not an exhaustive list of restrictions when creating names. If you are uncertain whether your chosen name violates this policy, it is likely that it does.

Our moderators, through their experience, understand which topics contribute positively to the chat atmosphere and which may be detrimental. If a moderator requests that you avoid discussing a certain topic, we kindly ask for your cooperation. Please know that this is not intended to restrict your freedom of expression but to maintain a welcoming and enjoyable environment for everyone.

## Gameplay rules

### General

Griefing - deliberate actions that disrupt gameplay or violate server rules to hinder the progress of others - is strictly prohibited. All players are expected to support a fair and enjoyable gaming experience for everyone.

Any behavior intentionally designed to interfere with or ruin another player's gameplay will not be tolerated. The game team reserves the right to determine what qualifies as griefing and to take appropriate disciplinary action when necessary.

### Environment

- Boss monsters must be fought near their spawn or pathing area. You may move within a limited radius, but only up to the distance where you would still see the boss if it was standing at its initial spawn or path. Additionally, from your fighting position, the boss's spawn point or path must remain clearly visible.
- Do not drag or pull monsters, especially bosses, in a way that could endanger or cause the death of other players. Be especially careful when pulling monsters into safe zones. If you choose to do so, you are fully responsible for any harm caused to nearby players.
- The player or party that deals the most damage will always get the loot and experience points from monsters.
- Exploiting game features (such as the 100th Floor tower, or PvP mechanics) to gain an unfair advantage is prohibited.
- Using walls, edges, or other architectural elements to prevent monsters from attacking or reaching you is not allowed.

### Boss quests

As boss monsters exist only once on each on server, completing boss quests can be challenging. To promote fairness, players are encouraged to share boss monsters with others who have accepted the corresponding quest from the NPC.

- Companions (combat pets) are also subject to this rule. Pet owners are responsible for their companions' actions and will be held accountable for any violations.
- Falsely claiming to have a boss quest in order to gain an unfair advantage will be considered griefing.
- Please note, this rule applies only to boss monsters and does not extend to regular monsters

## Enforcement and reporting

Any violation of the Code of Conduct will result in penalties, as specified in Sections III.6 and XIII of the General Terms and Conditions.

You are accountable for everything that happens under your account. If you violate the rules, take responsibility - acknowledge your actions, and use the experience as an opportunity to improve.

Do not attempt to evade disciplinary measures by creating new accounts or asking others to act on your behalf. Any effort to circumvent a penalty will result in further enforcement actions, up to and including a permanent ban.

### Reporting

If you notice any rule violations, please report them with proper proof (screenshots from the game or videos) to the support team at support@florensia-online.com.

Each case will be reviewed individually. Staff reserve the right to decline requests under specific circumstances.

**Although we encourage you to report players who engage in a disrespectful or disruptive behavior, submitting false reports with the intent to unfairly restrict another player's gameplay is a serious offense and may result in penalties to your account.**

While this document is representative, it is not exhaustive. To maintain the integrity of our community, we reserve the right to penalize any conduct that violates the spirit of the Code of Conduct or is otherwise deemed harmful. If you are uncertain whether your behavior complies with the Code of Conduct, it is best to act with caution.

This Code of Conduct may be updated as our game and community evolve. Stay informed of updates and adhere to the latest guidelines.

Thank you for being part of our community and helping us maintain a fun, inclusive, and safe environment for all.

The Florensia Team

Revision: June 13th, 2025`,
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
