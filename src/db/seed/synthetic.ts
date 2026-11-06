/**
 * Generador de datos sintéticos para desarrollo, pruebas de carga y demo.
 *
 * Giiku Games no comparte datos reales (Q4). Este módulo inventa usuarios,
 * personajes, gremios, tienda, noticias y movimientos de AP con un volumen
 * parecido al de la web original: unas 905 páginas de ranking de 50 filas,
 * unos 45 000 personajes.
 *
 * Todo es determinista (semilla fija) y puro: devuelve filas, no escribe en
 * la BD. `scripts/seed-demo.ts` las inserta. Así se puede probar sin MySQL.
 */
import { applyDelta, type LedgerEntry } from "./ledger";
import { createRandom, type Random } from "./random";

export interface SyntheticOptions {
  seed: number;
  users: number;
  characters: number;
  guildsPerServer: number;
  servers: number;
  /** Ids de clase en BD: base → sus especializaciones. */
  classTree: ReadonlyMap<number, readonly number[]>;
}

export const DEFAULT_OPTIONS = {
  seed: 20261106,
  users: 2000,
  characters: 45_000,
  guildsPerServer: 150,
} as const;

const SYLLABLES = [
  "ka",
  "ri",
  "lo",
  "mel",
  "dra",
  "sa",
  "vin",
  "tor",
  "el",
  "na",
  "zu",
  "fi",
  "ra",
  "gon",
  "lia",
  "mor",
  "ae",
  "th",
  "is",
  "ven",
  "kai",
  "ro",
  "sha",
  "len",
  "dor",
  "mi",
  "ul",
  "fa",
  "ny",
  "x",
] as const;
const GUILD_WORDS = [
  "Storm",
  "Tide",
  "Anchor",
  "Lily",
  "Blade",
  "Crown",
  "Wind",
  "Coral",
  "Iron",
  "Star",
  "Wolf",
  "Rose",
  "Raven",
  "Pearl",
  "Flame",
  "Moon",
  "Harbor",
  "Sail",
  "Gale",
  "Dawn",
] as const;
const GUILD_SUFFIX = [
  "Knights",
  "Order",
  "Crew",
  "Legion",
  "Fleet",
  "Guard",
  "Circle",
  "Clan",
] as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Nombre único dentro de `taken`, de 4 a 16 caracteres. */
function uniqueName(
  random: Random,
  taken: Set<string>,
  make: () => string,
  maxLength: number,
): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const name = make().slice(0, maxLength);
    if (name.length >= 4 && !taken.has(name.toLowerCase())) {
      taken.add(name.toLowerCase());
      return name;
    }
  }
  // Muy improbable; un sufijo numérico garantiza que termina.
  let n = taken.size;
  let name: string;
  do name = `${make().slice(0, maxLength - 5)}${n++}`;
  while (taken.has(name.toLowerCase()));
  taken.add(name.toLowerCase());
  return name;
}

export interface SyntheticUser {
  id: number;
  username: string;
  email: string;
  locale: string;
}

export interface SyntheticGuild {
  id: number;
  serverId: number;
  name: string;
}

export interface SyntheticCharacter {
  id: number;
  userId: number | null;
  serverId: number;
  guildId: number | null;
  classId: number;
  baseClassId: number;
  name: string;
  landLevel: number;
  seaLevel: number;
  experience: number;
}

/**
 * Nivel con distribución realista: muchos personajes bajos y pocos en el
 * tope (la mayoría de jugadores abandona pronto). Se usa la potencia de un
 * uniforme, que concentra los valores cerca de `min`.
 */
function skewedLevel(random: Random, min: number, max: number): number {
  return min + Math.floor(random.next() ** 2.2 * (max - min + 1));
}

export function generateUsers(
  random: Random,
  count: number,
  locales: readonly string[],
): SyntheticUser[] {
  const taken = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    const username = uniqueName(
      random,
      taken,
      () =>
        capitalize(random.pick(SYLLABLES) + random.pick(SYLLABLES) + random.pick(SYLLABLES)) +
        random.int(1, 99),
      24,
    );
    // Dominio reservado para ejemplos (RFC 2606): ningún correo llega a nadie.
    return {
      id: index + 1,
      username,
      email: `${username.toLowerCase()}@example.com`,
      locale: random.pick(locales),
    };
  });
}

export function generateGuilds(
  random: Random,
  serverIds: readonly number[],
  perServer: number,
): SyntheticGuild[] {
  const guilds: SyntheticGuild[] = [];
  for (const serverId of serverIds) {
    const taken = new Set<string>();
    for (let i = 0; i < perServer; i++) {
      const name = uniqueName(
        random,
        taken,
        () => `${random.pick(GUILD_WORDS)} ${random.pick(GUILD_SUFFIX)}`,
        32,
      );
      guilds.push({ id: guilds.length + 1, serverId, name });
    }
  }
  return guilds;
}

export function generateCharacters(
  random: Random,
  options: Pick<SyntheticOptions, "characters" | "classTree">,
  users: readonly SyntheticUser[],
  guilds: readonly SyntheticGuild[],
  serverIds: readonly number[],
): SyntheticCharacter[] {
  const takenByServer = new Map(serverIds.map((id) => [id, new Set<string>()]));
  const guildsByServer = new Map(
    serverIds.map((id) => [id, guilds.filter((g) => g.serverId === id)]),
  );
  const baseClasses = [...options.classTree.keys()];

  return Array.from({ length: options.characters }, (_, index) => {
    const serverId = random.pick(serverIds);
    const baseClassId = random.pick(baseClasses);
    const landLevel = skewedLevel(random, 1, 105);
    // A partir del nivel 40 casi todos han cambiado a una especialización.
    const specs = options.classTree.get(baseClassId) ?? [];
    const classId =
      landLevel >= 40 && specs.length > 0 && random.next() < 0.9 ? random.pick(specs) : baseClassId;
    const serverGuilds = guildsByServer.get(serverId) ?? [];
    const name = uniqueName(
      random,
      takenByServer.get(serverId)!,
      () =>
        capitalize(
          random.pick(SYLLABLES) +
            random.pick(SYLLABLES) +
            random.pick(SYLLABLES) +
            random.pick(SYLLABLES),
        ),
      16,
    );
    return {
      id: index + 1,
      // Una cuarta parte tiene cuenta web; el resto son jugadores sin cuenta en la web.
      userId: users.length > 0 && random.next() < 0.25 ? random.pick(users).id : null,
      serverId,
      guildId: serverGuilds.length > 0 && random.next() < 0.6 ? random.pick(serverGuilds).id : null,
      classId,
      baseClassId,
      name,
      landLevel,
      seaLevel: Math.min(80, skewedLevel(random, 1, Math.max(1, Math.round(landLevel * 0.8)))),
      experience: random.int(0, 999_999),
    };
  });
}

export interface SyntheticLedger {
  userId: number;
  entries: (LedgerEntry & { reason: "topup" | "purchase" })[];
}

/**
 * Historial de AP de cada usuario: algunas recargas y compras, siempre con
 * saldo no negativo (lo comprueba `applyDelta`).
 */
export function generateLedgers(
  random: Random,
  users: readonly SyntheticUser[],
  topupAmounts: readonly number[],
  itemPrices: readonly number[],
): SyntheticLedger[] {
  return users.map((user) => {
    const entries: SyntheticLedger["entries"] = [];
    let balance = 0;
    const movements = random.int(0, 6);
    for (let i = 0; i < movements; i++) {
      const price = random.pick(itemPrices);
      if (balance >= price && random.next() < 0.6) {
        const entry = applyDelta(balance, -price);
        entries.push({ ...entry, reason: "purchase" });
        balance = entry.balanceAfter;
      } else {
        const entry = applyDelta(balance, random.pick(topupAmounts));
        entries.push({ ...entry, reason: "topup" });
        balance = entry.balanceAfter;
      }
    }
    return { userId: user.id, entries };
  });
}

export { createRandom };
