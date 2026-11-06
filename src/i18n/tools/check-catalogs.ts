/**
 * Validación de los catálogos de traducción.
 *
 * Comprueba, para cada idioma frente al inglés (idioma de origen):
 * - que tiene exactamente las mismas claves (ni faltan ni sobran);
 * - que cada mensaje es ICU válido;
 * - que usa los mismos marcadores (`{year}`…), para que una traducción no
 *   pierda ni invente un dato;
 * - que no está vacío.
 *
 * Es la red de seguridad de ADR-13 (no hay revisores humanos): detecta en
 * CI los errores que en la web original llegaron a producción, como el
 * banner de cookies turco con el texto "Cookies Text Ok" (F-03).
 */
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

/** Un catálogo como objeto anidado de secciones y mensajes, a cualquier profundidad. */
export interface Catalog {
  [key: string]: string | Catalog;
}

/** Un problema encontrado en un idioma. */
export interface CatalogIssue {
  locale: string;
  key: string;
  problem: string;
}

/** Aplana `{ nav: { shop: "…" } }` a `{ "nav.shop": "…" }`, a cualquier profundidad. */
function flatten(
  catalog: Catalog,
  prefix = "",
  flat = new Map<string, string>(),
): Map<string, string> {
  for (const [name, value] of Object.entries(catalog)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === "string") flat.set(key, value);
    else flatten(value, key, flat);
  }
  return flat;
}

/** Recoge los nombres de los argumentos de un mensaje ICU ya analizado. */
function collectArguments(elements: MessageFormatElement[], into = new Set<string>()): Set<string> {
  for (const element of elements) {
    if (element.type === TYPE.literal || element.type === TYPE.pound) continue;
    if (element.type === TYPE.tag) {
      collectArguments(element.children, into);
      continue;
    }
    into.add(element.value);
    if (element.type === TYPE.plural || element.type === TYPE.select) {
      for (const option of Object.values(element.options)) collectArguments(option.value, into);
    }
  }
  return into;
}

/**
 * Analiza un mensaje ICU.
 *
 * @returns Sus argumentos, o un texto de error si la sintaxis es inválida.
 */
function analyse(message: string): Set<string> | string {
  try {
    return collectArguments(parse(message));
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Compara cada catálogo con el de origen.
 *
 * @param source - Catálogo de referencia (inglés).
 * @param catalogs - Catálogos a revisar, indexados por idioma.
 * @returns La lista de problemas; vacía si todo está bien.
 */
export function checkCatalogs(source: Catalog, catalogs: Record<string, Catalog>): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const sourceFlat = flatten(source);

  for (const [locale, catalog] of Object.entries(catalogs)) {
    const flat = flatten(catalog);

    for (const [key, sourceMessage] of sourceFlat) {
      const message = flat.get(key);
      if (message === undefined) {
        issues.push({ locale, key, problem: "falta la clave" });
        continue;
      }
      if (message.trim() === "") {
        issues.push({ locale, key, problem: "mensaje vacío" });
        continue;
      }

      const expected = analyse(sourceMessage);
      const actual = analyse(message);
      if (typeof actual === "string") {
        issues.push({ locale, key, problem: `ICU inválido: ${actual}` });
        continue;
      }
      if (typeof expected === "string") continue; // El error ya se informa en el origen.

      const missing = [...expected].filter((arg) => !actual.has(arg));
      const extra = [...actual].filter((arg) => !expected.has(arg));
      if (missing.length > 0) {
        issues.push({ locale, key, problem: `faltan marcadores: ${missing.join(", ")}` });
      }
      if (extra.length > 0) {
        issues.push({ locale, key, problem: `marcadores de más: ${extra.join(", ")}` });
      }
    }

    for (const key of flat.keys()) {
      if (!sourceFlat.has(key))
        issues.push({ locale, key, problem: "clave que no existe en inglés" });
    }
  }

  return issues;
}
