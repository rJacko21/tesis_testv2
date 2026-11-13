/**
 * Artículos reales de la tienda para la demo (M-45).
 *
 * Son 28 objetos que existen a la vez en la tienda oficial
 * (florensia-online.com) y en la base de datos de la comunidad
 * (flandria.wiki), cruzados por su **código de objeto**, que es el mismo en
 * las dos (`ahacash12` es «Pirate Hat» en ambas). De cada uno se guarda:
 *
 * - código, nombre y categoría, como en la tienda oficial;
 * - precio en AP y precio rebajado de la tienda oficial (consultada el
 *   2026-11-12);
 * - duración y efectos, que coinciden en las dos webs;
 * - una frase de la descripción oficial, solo en inglés (los nombres y
 *   efectos del juego no se traducen).
 *
 * El icono de cada objeto (`shop-icons/<código>.png`, 32 × 32 px) sale de
 * las hojas de iconos del cliente del juego (`Data/UI/Icon`), en la casilla
 * que indica Flandria (`aha_120` = casilla 120 de `aha.png`). El arte es de
 * Giiku Games, que lo cede para la tesis.
 *
 * Sustituyen a los 64 artículos inventados («Ghost Steel Sword»…), que no
 * existían en el juego.
 *
 * @see RF-05 Tienda · M-45
 */
import type { Locale } from "../../config/locales";

type Localized = Record<Locale, string>;

/** Categorías de dos niveles, con los nombres de la tienda oficial. */
export const SHOP_CATEGORIES: Record<string, Localized> = {
  outfits: {
    en: "Individual Outfits",
    "pt-BR": "Trajes individuais",
    tr: "Kıyafetler",
    it: "Abbigliamento",
    de: "Outfits",
    fr: "Tenues",
    es: "Atuendos",
  },
  "outfits-headgear": {
    en: "Headgears",
    "pt-BR": "Chapéus",
    tr: "Başlıklar",
    it: "Copricapi",
    de: "Kopfbedeckungen",
    fr: "Couvre-chefs",
    es: "Gorros y cascos",
  },
  "outfits-dresses": {
    en: "Dresses",
    "pt-BR": "Trajes",
    tr: "Kostümler",
    it: "Costumi",
    de: "Kostüme",
    fr: "Costumes",
    es: "Trajes",
  },
  "outfits-accessories": {
    en: "Accessories",
    "pt-BR": "Acessórios",
    tr: "Aksesuarlar",
    it: "Accessori",
    de: "Accessoires",
    fr: "Accessoires",
    es: "Accesorios",
  },
  consumables: {
    en: "Consumables",
    "pt-BR": "Consumíveis",
    tr: "Sarf malzemeleri",
    it: "Consumabili",
    de: "Verbrauchsgüter",
    fr: "Consommables",
    es: "Consumibles",
  },
  "consumables-potions": {
    en: "Potions",
    "pt-BR": "Poções",
    tr: "İksirler",
    it: "Pozioni",
    de: "Tränke",
    fr: "Potions",
    es: "Pociones",
  },
};

/** Campañas de rebajas de la tienda oficial en la fecha de la consulta. */
export const SHOP_CAMPAIGNS = {
  "headgear-havoc": "Headgear Havoc",
  "angels-and-devils": "Angels & Devils",
  "potion-commotion": "Potion Commotion",
} as const;

export type CampaignCode = keyof typeof SHOP_CAMPAIGNS;

/** Tipo de objeto, para la primera frase de la descripción. */
type Kind = "headgear" | "dress" | "sword" | "rapier" | "potion";

const KIND: Record<Kind, Localized> = {
  headgear: {
    en: "Headgear",
    "pt-BR": "Acessório de cabeça",
    tr: "Başlık",
    it: "Copricapo",
    de: "Kopfbedeckung",
    fr: "Couvre-chef",
    es: "Accesorio de cabeza",
  },
  dress: {
    en: "Costume",
    "pt-BR": "Traje",
    tr: "Kostüm",
    it: "Costume",
    de: "Kostüm",
    fr: "Costume",
    es: "Traje",
  },
  sword: {
    en: "One-handed sword",
    "pt-BR": "Espada de uma mão",
    tr: "Tek elli kılıç",
    it: "Spada a una mano",
    de: "Einhandschwert",
    fr: "Épée à une main",
    es: "Espada de una mano",
  },
  rapier: {
    en: "Rapier",
    "pt-BR": "Florete",
    tr: "Meç",
    it: "Stocco",
    de: "Rapier",
    fr: "Rapière",
    es: "Estoque",
  },
  potion: {
    en: "Recovery potion",
    "pt-BR": "Poção de recuperação",
    tr: "İyileştirme iksiri",
    it: "Pozione di recupero",
    de: "Heiltrank",
    fr: "Potion de récupération",
    es: "Poción de recuperación",
  },
};

const ALL_CLASSES: Localized = {
  en: "Can be used by all classes.",
  "pt-BR": "Pode ser usado por todas as classes.",
  tr: "Tüm sınıflar kullanabilir.",
  it: "Utilizzabile da tutte le classi.",
  de: "Für alle Klassen.",
  fr: "Utilisable par toutes les classes.",
  es: "Lo pueden usar todas las clases.",
};

const CLASSES: Localized = {
  en: "Classes:",
  "pt-BR": "Classes:",
  tr: "Sınıflar:",
  it: "Classi:",
  de: "Klassen:",
  fr: "Classes :",
  es: "Clases:",
};

const GENDER: Record<"male" | "female", Localized> = {
  male: {
    en: "Male characters only.",
    "pt-BR": "Apenas para personagens masculinos.",
    tr: "Yalnızca erkek karakterler.",
    it: "Solo per personaggi maschili.",
    de: "Nur für männliche Charaktere.",
    fr: "Personnages masculins uniquement.",
    es: "Solo para personajes masculinos.",
  },
  female: {
    en: "Female characters only.",
    "pt-BR": "Apenas para personagens femininos.",
    tr: "Yalnızca kadın karakterler.",
    it: "Solo per personaggi femminili.",
    de: "Nur für weibliche Charaktere.",
    fr: "Personnages féminins uniquement.",
    es: "Solo para personajes femeninos.",
  },
};

const EFFECTS: Localized = {
  en: "Effects:",
  "pt-BR": "Efeitos:",
  tr: "Etkiler:",
  it: "Effetti:",
  de: "Effekte:",
  fr: "Effets :",
  es: "Efectos:",
};

export interface ShopSeedItem {
  /** Código del objeto en el juego: SKU del artículo y nombre de su icono. */
  code: string;
  /** Nombre oficial (no se traduce). */
  name: string;
  /** Clave de `SHOP_CATEGORIES` (`outfits-headgear`…). */
  category: string;
  kind: Kind;
  /** Precio normal en AP. */
  priceAp: number;
  /** Precio rebajado y campaña, si está de oferta en la tienda oficial. */
  sale?: { priceAp: number; campaign: CampaignCode };
  /** Días de validez; sin valor = permanente. */
  validityDays?: number;
  /** Clases que pueden usarlo; sin valor = todas. */
  classes?: string;
  gender?: "male" | "female";
  /** Efectos, con los términos del juego (en inglés). */
  effects: string[];
  /** Una frase de la descripción oficial (solo se muestra en inglés). */
  flavor?: string;
  limited?: boolean;
}

const headgear = "outfits-headgear";
const dresses = "outfits-dresses";
const accessories = "outfits-accessories";
const potions = "consumables-potions";
const havoc = (priceAp: number) => ({ priceAp, campaign: "headgear-havoc" as const });
const angels = (priceAp: number) => ({ priceAp, campaign: "angels-and-devils" as const });
const commotion = (priceAp: number) => ({ priceAp, campaign: "potion-commotion" as const });

export const SHOP_ITEMS: readonly ShopSeedItem[] = [
  // Gorros y cascos
  {
    code: "ahamhel01",
    name: "Mythrill Helm",
    category: headgear,
    kind: "headgear",
    priceAp: 6895,
    sale: havoc(5515),
    effects: ["Max HP +200", "Melee max attack +15"],
    flavor:
      "This impressive helm with its decorative feathers should be worn with your head held high.",
  },
  {
    code: "aha025300",
    name: "Happy Adventurer's Face",
    category: headgear,
    kind: "headgear",
    priceAp: 2995,
    sale: havoc(2395),
    effects: [],
    flavor:
      "Show off the one and only happy emoji face and all your friends will know you just did something great!",
  },
  {
    code: "ahacash25",
    name: "Four-leaved Clover",
    category: headgear,
    kind: "headgear",
    priceAp: 1995,
    effects: [],
    flavor:
      "Wow, that's a rare four-leaved clover! If you wear it, you will surely become a lucky devil.",
  },
  {
    code: "aharan012",
    name: "Reindeer Antlers",
    category: headgear,
    kind: "headgear",
    priceAp: 6895,
    sale: havoc(5515),
    effects: ["HP Recovery +10%"],
    flavor: "You'll look cute yet cool with these Reindeer Antlers!",
  },
  {
    code: "ahaice022",
    name: "Ice Crown",
    category: headgear,
    kind: "headgear",
    priceAp: 7245,
    sale: havoc(5795),
    effects: ["Max MP +400", "Max HP +200", "All stats +5"],
    flavor: "This fragile looking hair decoration is much steadier than it seems.",
  },
  {
    code: "ahaknit30",
    name: "Ghost Warrior",
    category: headgear,
    kind: "headgear",
    priceAp: 2045,
    sale: havoc(1635),
    validityDays: 30,
    effects: ["All attack +2%", "HP +20%"],
    flavor:
      "That fierce and spooky looking warrior used to fight for the Lord of the Samurai thousands of years ago.",
  },
  {
    code: "ahacash12",
    name: "Pirate Hat",
    category: headgear,
    kind: "headgear",
    priceAp: 6895,
    sale: havoc(5515),
    effects: ["Max HP +3%", "Ranged max attack +15"],
    flavor:
      "Are you a worthy representative of the Pirate Union? Express your dedication by wearing this exclusive Hat.",
  },
  {
    code: "ahasaint0",
    name: "St. Patrick's Hat",
    category: headgear,
    kind: "headgear",
    priceAp: 7897,
    sale: havoc(6315),
    effects: ["Max HP +300", "All Status Values +5", "Physical Avoidance Rate +30"],
    flavor: "A beautiful green hat in Leprechaun-style, perfect for celebrating St. Patrick's Day!",
  },
  {
    code: "ahagypsy1",
    name: "Nomad Hat",
    category: headgear,
    kind: "headgear",
    priceAp: 3995,
    sale: havoc(3195),
    effects: [],
  },
  {
    code: "ahahwpd02",
    name: "Pizza Man Face",
    category: headgear,
    kind: "headgear",
    priceAp: 3800,
    sale: havoc(3040),
    effects: ["Max HP +5%", "HP Recovery +5%"],
    flavor:
      "And what has happened here? This must have been some acid-accident, it just looks horrible!",
  },
  // Trajes
  {
    code: "ara028002",
    name: "Recovery Robe with Hood",
    category: dresses,
    kind: "dress",
    priceAp: 8995,
    effects: ["Required Land Level: 30", "Heal Strength +10%", "Max MP +200"],
    flavor:
      "With this classy robe, everyone will savor your blessings. This one even has a stylish Hood to protect your head.",
  },
  {
    code: "ara028003",
    name: "Ambulance Robe",
    category: dresses,
    kind: "dress",
    priceAp: 17995,
    sale: angels(14395),
    effects: ["Heal Strength 40%", "Movement Speed 10%", "Max HP +1000", "Max MP 10%"],
    flavor: "Wear the robes of the ancient priests with pride and use their power.",
  },
  {
    code: "ara044201",
    name: "Sakura Kimono [f]",
    category: dresses,
    kind: "dress",
    priceAp: 24495,
    validityDays: 30,
    gender: "female",
    limited: true,
    effects: ["HP recovery +15%", "Land EXP +30%"],
    flavor: "This beautiful and mysterious Kimono will make you gain EXP a lot faster.",
  },
  {
    code: "ara044211",
    name: "Hakama [m]",
    category: dresses,
    kind: "dress",
    priceAp: 24495,
    validityDays: 30,
    gender: "male",
    limited: true,
    effects: ["HP recovery +15%", "Land EXP +30%"],
    flavor: "This elegant and mysterious Hakama will make you gain EXP a lot faster.",
  },
  {
    code: "ara045100",
    name: "Celestial Armor [m]",
    category: dresses,
    kind: "dress",
    priceAp: 8895,
    gender: "male",
    effects: ["Melee max attack +7%", "Range max attack +7%", "Magic max attack +7%"],
    flavor: "This celestial armor will make you feel like a battle-scarred son of Odin.",
  },
  {
    code: "ara011000",
    name: "Swimsuit [m]",
    category: dresses,
    kind: "dress",
    priceAp: 4500,
    gender: "male",
    effects: ["Max HP +80", "Max MP +100"],
    flavor: "With this swimsuit, you will be the most trendy adventurer at the whole beach.",
  },
  {
    code: "ara003000",
    name: "Toy Cat Costume",
    category: dresses,
    kind: "dress",
    priceAp: 4595,
    effects: ["Max HP +80", "Max MP +120"],
    flavor: "Use this costume to show your catty playful side. Comes with the headpiece!",
  },
  {
    code: "ara047500",
    name: "Male Bright Angel Costume",
    category: dresses,
    kind: "dress",
    priceAp: 15950,
    sale: angels(12760),
    gender: "male",
    effects: ["Max HP +10%", "Max MP +7%", "Attack Speed +10%", "Melee Hitting +45"],
    flavor:
      "Finally, a truly angelic costume in a brightly shining color to complete your angel outfit!",
  },
  // Accesorios: armas de apariencia
  {
    code: "wksfish02",
    name: "Tuna Sword",
    category: accessories,
    kind: "sword",
    priceAp: 4945,
    sale: angels(3955),
    classes: "Explorer, Mercenary, Saint",
    effects: ["Physical PH: 132~141", "Spell PH: 66~71", "Attack speed: 1.40 s"],
    flavor: "The artisan who crafted this tuna weapon surely has a special preference for fish...",
  },
  {
    code: "wkssatan1",
    name: "Candy Sword",
    category: accessories,
    kind: "sword",
    priceAp: 6895,
    sale: angels(5515),
    classes: "Explorer, Mercenary, Saint",
    effects: ["Physical PH: 87~94", "Spell PH: 43~47", "Attack speed: 1.40 s"],
    flavor:
      "What happens when a talented pastry cook and a weaponsmith work together? It's a candy weapon!",
  },
  {
    code: "wkaghost2",
    name: "Ghost Steel Stick",
    category: accessories,
    kind: "rapier",
    priceAp: 5895,
    classes: "Mercenary, Noble",
    effects: ["Physical PH: 68~77", "Spell PH: 107~118", "Attack speed: 1.20 s"],
    flavor: "This blood-curdling mace looks worse than it is.",
  },
  {
    code: "wkagarik2",
    name: "Index Finger Pointer",
    category: accessories,
    kind: "rapier",
    priceAp: 5895,
    sale: angels(4715),
    classes: "Mercenary, Noble",
    effects: ["Physical PH: 4~7", "Spell PH: 5~8", "Attack speed: 1.20 s"],
    flavor: "Did someone ever tell you not to point at dressed people with a naked finger?",
  },
  // Pociones
  {
    code: "cihgcd800",
    name: "HP 25% Potion",
    category: potions,
    kind: "potion",
    priceAp: 95,
    sale: commotion(75),
    effects: ["Instantly recovers 25% of maximum HP", "Cool-down: 69 s"],
    flavor: "Instantly recovers 25% of your character's maximum HP.",
  },
  {
    code: "cihgcd801",
    name: "HP 50% Potion",
    category: potions,
    kind: "potion",
    priceAp: 125,
    sale: commotion(100),
    effects: ["Instantly recovers 50% of maximum HP", "Cool-down: 180 s"],
    flavor: "Instantly recovers 50% of your character's maximum HP.",
  },
  {
    code: "cihgcd802",
    name: "HP 75% Potion",
    category: potions,
    kind: "potion",
    priceAp: 155,
    sale: commotion(120),
    effects: ["Instantly recovers 75% of maximum HP"],
    flavor: "Instantly recovers 75% of your character's maximum HP.",
  },
  {
    code: "cihgcd810",
    name: "MP 25% Potion",
    category: potions,
    kind: "potion",
    priceAp: 95,
    sale: commotion(75),
    effects: ["Instantly recovers 25% of maximum MP"],
    flavor: "Instantly recovers 25% of your character's maximum MP.",
  },
  {
    code: "cihgcd811",
    name: "MP 50% Potion",
    category: potions,
    kind: "potion",
    priceAp: 125,
    sale: commotion(100),
    effects: ["Instantly recovers 50% of maximum MP"],
    flavor: "Instantly recovers 50% of your character's maximum MP.",
  },
  {
    code: "cihgcd812",
    name: "MP 75% Potion",
    category: potions,
    kind: "potion",
    priceAp: 155,
    sale: commotion(120),
    effects: ["Instantly recovers 75% of maximum MP"],
    flavor: "Instantly recovers 75% of your character's maximum MP.",
  },
];

/**
 * Descripción de un artículo en un idioma: tipo, quién puede usarlo y
 * efectos. En inglés se añade la frase de la descripción oficial.
 */
export function itemDescription(item: ShopSeedItem, locale: Locale): string {
  const who = item.classes ? `${CLASSES[locale]} ${item.classes}.` : ALL_CLASSES[locale];
  const lines = [
    [`${KIND[item.kind][locale]}.`, who, item.gender ? GENDER[item.gender][locale] : ""]
      .filter(Boolean)
      .join(" "),
  ];
  if (item.effects.length > 0) lines.push(`${EFFECTS[locale]} ${item.effects.join(" · ")}.`);
  if (locale === "en" && item.flavor) lines.push(item.flavor);
  return lines.join("\n");
}
