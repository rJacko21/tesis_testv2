/**
 * Genera el diagrama entidad-relación (Mermaid) a partir del esquema Drizzle.
 *
 * Así el diagrama de la tesis nunca se queda desfasado: sale del mismo
 * código que crea las tablas. GitHub muestra Mermaid directamente.
 * Uso: `pnpm db:er` → `docs/db/modelo-er.md`.
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { getTableColumns, is } from "drizzle-orm";
import { MySqlTable, getTableConfig } from "drizzle-orm/mysql-core";

import * as schema from "../src/db/schema";

/** Dominios en el orden del documento de arquitectura. */
const DOMAINS: Record<string, readonly string[]> = {
  Identidad: [
    "users",
    "accounts",
    "sessions",
    "verifications",
    "login_attempts",
    "rate_limits",
    "roles",
    "user_roles",
  ],
  Contenido: [
    "locales",
    "media",
    "media_translations",
    "posts",
    "post_translations",
    "promotions",
    "promotion_translations",
    "pages",
    "page_translations",
  ],
  Juego: [
    "character_classes",
    "character_class_translations",
    "servers",
    "guilds",
    "characters",
    "ranking_snapshots",
  ],
  "Tienda y AP": [
    "shop_categories",
    "shop_category_translations",
    "campaigns",
    "campaign_translations",
    "shop_items",
    "shop_item_translations",
    "item_prices",
    "carts",
    "cart_items",
    "orders",
    "order_items",
    "ap_ledger",
    "topup_packages",
    "payments",
  ],
  "Soporte y administración": [
    "redeem_codes",
    "redeem_uses",
    "support_tickets",
    "ticket_messages",
    "consents",
    "audit_log",
  ],
};

const tables = (Object.values(schema) as unknown[]).filter((value): value is MySqlTable =>
  is(value, MySqlTable),
);
const configs = new Map(
  tables.map((table) => [getTableConfig(table).name, { table, config: getTableConfig(table) }]),
);

function entity(name: string): string {
  const entry = configs.get(name);
  if (!entry) throw new Error(`Tabla desconocida en DOMAINS: ${name}`);
  const pkColumns = new Set(
    entry.config.primaryKeys.flatMap((pk) => pk.columns.map((c) => c.name)),
  );
  const fkColumns = new Set(
    entry.config.foreignKeys.flatMap((fk) => fk.reference().columns.map((c) => c.name)),
  );
  const lines = Object.values(getTableColumns(entry.table)).map((column) => {
    const keys = [
      column.primary || pkColumns.has(column.name) ? "PK" : "",
      fkColumns.has(column.name) ? "FK" : "",
    ]
      .filter(Boolean)
      .join(",");
    // Mermaid solo admite letras en el tipo: `varchar(32)` → `varchar`, `enum(...)` → `enum`.
    const type = column.getSQLType().split(/[ (]/)[0];
    return `    ${type} ${column.name}${keys ? ` ${keys}` : ""}`;
  });
  return `  ${name} {\n${lines.join("\n")}\n  }`;
}

/**
 * Relaciones en notación «pata de gallo»: a la izquierda la tabla
 * referenciada (`||` obligatoria, `|o` si la clave ajena admite nulo) y a la
 * derecha la que tiene la clave ajena (`o{`, cero o muchas filas).
 */
function relations(names: readonly string[]): string[] {
  return names.flatMap((name) =>
    configs.get(name)!.config.foreignKeys.map((fk) => {
      const ref = fk.reference();
      const target = getTableConfig(ref.foreignTable).name;
      const optional = ref.columns.some((c) => !c.notNull);
      const label = ref.columns.map((c) => c.name).join(",");
      return `  ${target} ${optional ? "|o" : "||"}--o{ ${name} : "${label}"`;
    }),
  );
}

const listed = new Set(Object.values(DOMAINS).flat());
const missing = [...configs.keys()].filter((name) => !listed.has(name));
if (missing.length > 0)
  throw new Error(`Tablas sin dominio en generate-er.ts: ${missing.join(", ")}`);

const sections = Object.entries(DOMAINS).map(
  ([domain, names]) =>
    `## ${domain}\n\n\`\`\`mermaid\nerDiagram\n${names.map(entity).join("\n")}\n${relations(names).join("\n")}\n\`\`\``,
);

const markdown = `# Modelo entidad-relación

> Generado por \`pnpm db:er\` a partir de \`src/db/schema\`. No se edita a mano.

${configs.size} tablas en 5 dominios. Cada diagrama muestra las tablas de su dominio y sus claves ajenas, también las que apuntan a tablas de otros dominios (por ejemplo, \`users\`). Convenciones: ver [04-arquitectura §4](../plan/04-arquitectura.md).

${sections.join("\n\n")}
`;

mkdirSync(new URL("../docs/db/", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/db/modelo-er.md", import.meta.url), markdown);
console.log(`Diagrama generado: ${configs.size} tablas.`);
