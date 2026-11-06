import { describe, expect, it } from "vitest";

import { InsufficientApError, applyDelta, isConsistent } from "./ledger";
import { createRandom } from "./random";
import { buildRankings, type RankableCharacter } from "./rankings";
import { classSeeds } from "./reference";
import { generateCharacters, generateGuilds, generateLedgers, generateUsers } from "./synthetic";

const classTree = new Map([
  [1, [2, 3]],
  [4, [5, 6]],
]);

describe("createRandom", () => {
  it("es determinista con la misma semilla (mediciones repetibles, ADR-14)", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it("int() respeta los límites", () => {
    const random = createRandom(1);
    for (let i = 0; i < 1000; i++) {
      const value = random.int(3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
    }
  });
});

describe("libro mayor de AP (RF-05)", () => {
  it("suma y resta guardando el saldo resultante", () => {
    expect(applyDelta(1000, -400)).toEqual({ delta: -400, balanceAfter: 600 });
  });

  it("rechaza una compra sin saldo suficiente", () => {
    expect(() => applyDelta(1000, -1200)).toThrow(InsufficientApError);
  });

  it("rechaza movimientos vacíos o con decimales", () => {
    expect(() => applyDelta(10, 0)).toThrow(RangeError);
    expect(() => applyDelta(10, 1.5)).toThrow(RangeError);
  });

  it("detecta una cadena de movimientos incoherente", () => {
    expect(
      isConsistent([
        { delta: 500, balanceAfter: 500 },
        { delta: -200, balanceAfter: 300 },
      ]),
    ).toBe(true);
    expect(isConsistent([{ delta: 500, balanceAfter: 400 }])).toBe(false);
  });
});

describe("buildRankings (RF-07)", () => {
  const base = { classId: 1, baseClassId: 1, experience: 0 };
  const characters: RankableCharacter[] = [
    { ...base, id: 1, landLevel: 50, seaLevel: 10 },
    { ...base, id: 2, landLevel: 60, seaLevel: 5 },
    { ...base, id: 3, landLevel: 50, seaLevel: 10, experience: 99 },
    { id: 4, classId: 5, baseClassId: 4, landLevel: 90, seaLevel: 40, experience: 0 },
  ];
  const rows = buildRankings(characters);
  const order = (area: string, scope: number) =>
    rows.filter((r) => r.area === area && r.classScope === scope).map((r) => r.characterId);

  it("ordena por nivel y desempata por experiencia y antigüedad", () => {
    expect(order("land", 0)).toEqual([4, 2, 3, 1]);
    expect(order("all", 0)).toEqual([4, 2, 3, 1]);
    expect(order("sea", 0)).toEqual([4, 3, 1, 2]);
  });

  it("el ranking de una clase base incluye sus especializaciones", () => {
    expect(order("land", 4)).toEqual([4]);
    expect(order("land", 1)).toEqual([2, 3, 1]);
  });

  it("cada especialización tiene su propio ranking", () => {
    expect(order("sea", 5)).toEqual([4]);
    // Una especialización sin personajes no genera filas.
    expect(rows.some((r) => r.classScope === 2)).toBe(false);
  });

  it("los puestos empiezan en 1 y no tienen huecos", () => {
    expect(rows.filter((r) => r.area === "land" && r.classScope === 0).map((r) => r.rank)).toEqual([
      1, 2, 3, 4,
    ]);
  });
});

describe("datos sintéticos", () => {
  const random = createRandom(7);
  const users = generateUsers(random, 200, ["en", "es"]);
  const guilds = generateGuilds(random, [1, 2], 20);
  const characters = generateCharacters(
    random,
    { characters: 3000, classTree },
    users,
    guilds,
    [1, 2],
  );

  it("los nombres de usuario y de personaje por servidor son únicos", () => {
    expect(new Set(users.map((u) => u.username.toLowerCase())).size).toBe(users.length);
    for (const server of [1, 2]) {
      const names = characters
        .filter((c) => c.serverId === server)
        .map((c) => c.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("los correos usan el dominio reservado example.com", () => {
    expect(users.every((u) => u.email.endsWith("@example.com"))).toBe(true);
  });

  it("solo se tiene especialización desde el nivel 40, y el gremio es del mismo servidor", () => {
    const guildServer = new Map(guilds.map((g) => [g.id, g.serverId]));
    for (const c of characters) {
      if (c.classId !== c.baseClassId) expect(c.landLevel).toBeGreaterThanOrEqual(40);
      if (c.guildId !== null) expect(guildServer.get(c.guildId)).toBe(c.serverId);
      expect(c.name.length).toBeLessThanOrEqual(16);
    }
  });

  it("el historial de AP de cada usuario nunca deja el saldo en negativo", () => {
    const ledgers = generateLedgers(random, users, [2500, 5500], [500, 1200, 4900]);
    expect(ledgers.every((l) => isConsistent(l.entries))).toBe(true);
  });
});

describe("classSeeds", () => {
  it("genera 4 clases base y 8 especializaciones de nivel 40", () => {
    const seeds = classSeeds();
    expect(seeds.filter((s) => s.parentCode === null)).toHaveLength(4);
    expect(seeds.filter((s) => s.parentCode !== null && s.requiredLevel === 40)).toHaveLength(8);
    expect(new Set(seeds.map((s) => s.code)).size).toBe(12);
  });
});
