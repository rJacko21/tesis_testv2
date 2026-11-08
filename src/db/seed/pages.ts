/**
 * Páginas fijas (reglas y legales) de RF-10 y RF-11.
 *
 * - **Aviso legal, código de conducta y privacidad:** textos oficiales de Giiku Games GmbH
 *   tal como están en florensia-online.com (los facilitó Armando el
 *   2026-11-07), solo en inglés, como en la web original. Solo se les han
 *   puesto encabezados `##`/`###` y listas para que tengan índice; la
 *   redacción no se ha tocado.
 * - **Términos:** aún es un texto de ejemplo, y lo dicen en su
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
      title: "Privacy Policy",
      body: `## I. General information

### 1. Responsible body & data protection officer

Below we explain to you which personal data is collected and processed by us when using our services and offers. We are:

- GIIKU GAMES GmbH
- Rehleitenweg 32b
- 83026 Rosenheim
- Germany
- Tel: +49 8031 210 205 70
- E-Mail: datenschutz (at) giikugames.com

### 2. Legal basis

As far as a legal basis is mentioned in this Privacy Policy, they relate to the General Data Protection Regulation. This comes into effect from May 25, 2018.

Prior to this, the corresponding provisions of the Federal Data Protection Act apply without us naming them. We collect and process personal data based on the following statutory regulations:

Consent according to Article 6 paragraph I (a) General Data Protection Regulation (GDPR). Consent is any voluntary expression of intent, in an informed and unequivocal manner, in the form of a statement or other unambiguous confirmatory act, which indicates that the data subject consents to the processing of his personal data.

Necessity to fulfill the contract or carry out preparatory actions in accordance with Article 6 para. I (b) GDPR,this means that the data is required so that we can fulfill the contractual obligations to you or we need the data to prepare a contract closure with you.

Processing to fulfill legal obligations under Article 6 para. I (c) GDPR, this means that a processing of the data is required by law or other regulations.

Processing for the protection of legitimate interests in accordance with Article 6 para. I (f) GDPR, this means that processing is necessary to safeguard legitimate interests on our part or by third parties, unless the interests or fundamental rights and freedoms on your part that require the protection of personal data prevail.

### 3. Right of affected

You are entitled to the following rights with regard to the processing of data by us in accordance with the respectively listed articles of the General Data Protection Regulation:

- Right of access by the data subject to Art. 15 GDPR
- Right to rectification according to Art. 16 GDPR
- Right to erasure ("right to be forgotten") in accordance with Art. 17 GDPR
- Right to restriction of processing according to Art. 18 GDPR
- Right to data portability according to Art. 20 GDPR
- Right to object according to Art. 21 GDPR without prejudice to any other administrative or judicial remedy, you shall have the right to complain to a supervisory authority, in particular in the Member State of your place of residence, employment or the place of the alleged infringement, if you believe that the processing of the personal data is violating the GDPR.

### 4. Data erasure and storage duration

The personal data of the data subject will be deleted or blocked as soon as the purpose of the storage is deleted. In addition, storage may take place if provided for by the European or national legislator in EU regulations, laws or other regulations to which the processor is subject. Blocking or deletion of the data also takes place if a storage period prescribed by the standards mentioned expires unless there is a need for further storage of the data for the conclusion of a contract or fulfilment of the contract.

## II. Concrete data processing

### 1. Data collection when visiting the website

**a) Scope of data processing**

When visiting our website, the following data is collected and stored by our web server:

- Information about the browser type and version used
- The operating system of the user
- The Internet service provider of the user
- The IP address of the user
- Date and time of access
- Websites from which the user's system accesses our website
- Websites accessed by the user's system through our website

The data is stored in the log files of our system. A storage of this data together with other personal data of the user does not take place. The is stored with our hosting provider OVH who processes the data exclusively inside the EU.

**b) Legal Basis**

The legal basis for processing the data is Art. 6 para. I (f) GDPR.

The legitimate interest within the meaning of Art. 6 para. I (f) GDPR therefore lies in the functionality of our website and its availability.

Legal basis for the transfer of data to the hosting provider is Art. 28 GDPR.

**c) Purpose of data processing**

Address by the system is necessary to allow delivery of the website to the computer of the user. To do this, the user's IP address must be kept for the duration of the session.

The data is stored in order to ensure the functionality of the website. In addition, the data is used to optimize the website and to ensure the security of our information technology systems.

An evaluation of the data for marketing purposes does not take place in this context.

**d) Duration of storage**

The log files will be deleted after 30 days at the latest unless there is a need to keep the data for the aforementioned purpose due to specific events ..

Storage beyond that is possible. In this case, the IP addresses of the users are deleted or anonymised, so that an assignment to a specific user is no longer possible.

**e) Objection and removal possibility**

The collection and the storage of the data in log files is essential for the operation of the website. There is consequently no possibility of objection by the user.

### 2. E-mail contact / registration

**a) Scope of data processing**

If you register on our website and deposit your e-mail address, we may subsequently use this information to send you product information by e-mail regarding the booked product or similar products of the processor. In such a case, only direct advertising for our own similar goods or services will be sent by e-mail. We will also send you emails related to your transactions, such as order confirmations, etc.

It is possible to subscribe to a free newsletter on our website or in our app, which contains direct advertising for our products or products of our cooperation partners. When you sign up for the newsletter, the data from the input mask will be transmitted to us or the e-mail address already stored will be used. In this case, the date and time of registration for the newsletter and the IP address used are also stored. As part of the confirmation of the newsletter registration, the date and time at which you click on the confirmation link for the newsletter registration as well as the IP address used will also be saved.

**b) Legal basis**

The legal basis for the processing of the data when sending out the newsletter due to the prior acquisition of goods or services is Article 6 para. I sentence I (f) GDPR in conjunction with § 7 para. 3 UWG.

The legitimate interest within the meaning of Art. 6 para. I (f) GDPR is therefore in direct advertising and the increase in sales to existing customers.

The legal basis for processing the data when registering directly for the newsletter is Art. 6 para. I (a) GDPR.

The legal basis for contacting in connection with current bookings is Article 6 para. I (b) GDPR.

The legal basis for the transfer of the data to the shipping service provider is Article 28 para. 3, 6, and 7, Article 46 para. 2 (c) GDPR. The standard data protection clauses of the EU Commission are used in contractual relations with the provider.

**c) Purpose of data processing**

The purpose of storing the e-mail address is the possibility of electronic contact for advertising purposes. The date and IP address of the registration as well as the confirmation of the registration will be recorded in order to document the consent to the newsletter shipment and to prevent misuse. Furthermore, for information regarding ongoing bookings, the proper execution of the contract is the purpose of the contract.

The transfer to the service provider is done for the purpose of sending the newsletter as a mass mailing.

**d) Duration of storage**

If we have received your e-mail address as part of the purchase of goods or services, it will be used for the delivery of advertising until you object to further use.

As far as you have expressly consented to the receipt of the newsletter, we will only delete or block the e-mail address for the advertising mailing, if you revoke your consent. The data confirming the order of the newsletter will be stored for the same amount of time.

The e-mails sent, as far as business letters are concerned, are stored for the duration of retention periods of the Tax Code or the Commercial Code. The further e-mails are deleted as soon as no further response by the user has to be expected.

**e) Objection and removal possibility**

You may object or revoke your consent to the use of the e-mail address for advertising purposes at any time, without incurring any costs beyond the charges of your communications tariff. You can object to the use of any advertising mail by clicking on a link provided there with effect for the future. You may also opt out of advertising for future use by emailing datenschutz@giikugames.com. In the case of opposition by e-mail, the implementation of the cancellation or blocking can take up to 5 working days; In this period, you may still receive advertising emails. You can not contradict the use of the e-mail address for addressing in the context of the performance of the contract. If you no longer wish this, you would have to delete the account or have it deleted. Otherwise, we would not be able to properly fulfil the contract.

### 3. Google Analytics

**a) Scope of data processing**

The website uses Google Analytics, a web analytics service provided by Google Inc. ("Google"). This software collects information about how you use the website and compiles various statistics. The increased usage data include in particular the concrete selection of links, the length of stay on individual pages and the order of use of the website, the frequency of the page request. This data is collected together with your IP address. The IP address provided by Google Analytics as part of Google Analytics will not be merged with other Google data.

Google Analytics uses so-called "cookies", text files that are stored on your computer and that allow an analysis of the use of the website by you.

The information generated by the cookie about your use of this website is usually transmitted to a Google server in the USA and stored there.

We have activated a so-called IP anonymization on the website, this means that the IP address will be shortened beforehand by Google within member states of the European Union or in other contracting states of the Agreement on the European Economic Area prior to retransmission to the USA.

Only in exceptional cases will the full IP address be sent to a Google server in the US and shortened there. Google itself describes its data processing activity here https://policies.google.com/privacy.

**b) Legal basis**

The legal basis for the processing of data when using the website is Article 6 para. I (f) GDPR.

The legitimate interest within the meaning of Art. 6 para. I (f) GDPR is a customer-oriented design of the website, which meets the requirements of the users and takes their user preferences into account.

The legal basis for the transfer of data to Google are Article 28 para. 3, and Article 45 para. 3 GDPR. The service provider is certified under the Privacy Shield Framework and is therefore subject to the EU Commission's decision on adequacy (Implementing Decision 2016/1250), this means that the data protection level of the service provider is recognized as being equivalent to the GDPR, although it is based in the USA.

**c) Purpose of data processing**

The purpose of the processing is to analyse this website and the usage behaviour of its visitors.

**d) Duration of storage**

The data is already anonymized directly after the survey. Personal data is therefore collected only in the context of the transfer and not permanently stored.

**e) Objection and removal possibility**

You can prevent the storage of cookies, including the generation and transmission of data to Google, by restricting or prohibiting the use of cookies in your browser software.

This may result in the deactivation of non-Google-related cookies as well as the inability to use all functions of this website to the full extent.

You can prevent the collection of the data generated by the cookie and your use (including your IP address) and their transmission to Google as well as the processing of this data by Google by downloading the browser plugin available under the following link and to install: https://tools.google.com/dlpage/gaoptout.

### 4. bunny.net

**a) Scope of data processing**

bunny.net provides, CDN, Storage, Stream and other related services

Giiku Games GmbH ("client") will act as the data controller and bunny.net as the processor of client data. bunny.net will process client data only as a data processor acting at the Client's direction.

Giiku Games GmbH is the one determining the purposes and means of processing. The latter are described in this Data Processing Agreement. The basis for data processing derives from the Client's entitlements. bunny.net shall carry out the following processes: Processing of user information necessary for the provision, improved security, optimization, control and troubleshooting of the service.

The type of data that will be processed includes but is not limited to: network connection data, IP addresses, user agent, URL referrer information.

Processing the data consists of the following: collecting, saving, modifying, using, transferring, distributing or any other form of provision, replication, restricting, deleting, collating or destroying data

**b) Legal basis**

The legal basis for the processing of the data when downloading the file(s) is Article 6 para. I sentence I (f) GDPR

The legitimate interest within the meaning of Art. 6 para. I (f) GDPR is a safe and functioning operation of the technical systems. Data is transmitted: to the data processor Bunny CDN, Cesta Komandanta, Staneta 4a, 1215 Medvode, Slovenia.

**c) Purpose of data processing**

The purpose of the processing is the safe and functioning transfer of the downloadable file(s)

**d) Duration of storage**

Storing all personally identifiable information only for up to 20-30 seconds, so no personal data is kept past that time!

**e) Objection and removal possibility**

You can not contradict the use of necessary data in the context of the contract. If you no longer wish this, you will have to delete the account or have it deleted. Otherwise, we would not be able to properly fulfil the contract.

### 5. Easy-Anti-Cheat

**a) Scope of data processing**

In order to serve its purpose of preventing and detecting the use of cheat software with the goal of ensuring a fair game environment Easy-Anti-Cheat is processing information to allow the game publisher to pursue and protect its legitimate interests of keeping its game free from malicious misuse, abuse or cheating.

When you register or use Florensia Online, the following data about you may be collected and processed:

- Username and account identifier;
- In-game movements and other gaming behaviour;
- Technical information about the hardware used to play the game, such as the manufacturer of the motherboard, the CPU identifier, the GPU identifier and general performance indicators;
- Technical information about the methods, techniques, technologies or similar used by you in the Game that indicate the use of methods that Giiku Games GmbH considers unacceptable; and/or Other equivalent information.
- In addition, the Service may automatically collect stored data, such as the server's technical log (e.g. your IP address, your session history) during your use of the Game.

**b) Legal basis**

The legal basis for the processing of the data when downloading the file(s) is Article 6 para. I sentence 1 (f) GDPR

The legitimate interest within the meaning of Art. 6 para. I (f) GDPR is a safe and functioning operation of the game.

**c) Purpose of data processing**

Easy-Anti-Cheat is processing information in order to provide its services of preventing and detecting the use of cheat software with the goal of ensuring a fair game environment as intended by the game publisher.

**d) Duration of storage**

Easy-Anti-Cheat may store the information for the entire duration of the provision of its services for a game.

**e) Objection and removal possibility**

You can not contradict the use of necessary data in the context of the contract. If you no longer wish this, you will have to delete the account or have it deleted. Otherwise, we would not be able to properly fulfil the contract.

Munich, June 7th, 2025`,
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
