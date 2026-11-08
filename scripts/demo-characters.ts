/**
 * Da personajes de la demo a una cuenta, para probar en local las compras
 * con AP (RF-05) y «Mis personajes» (RF-04).
 *
 * En producción los personajes los crea el servidor del juego; aquí se toman
 * personajes sintéticos sin dueño de `db:seed:demo`, uno por servidor hasta
 * llegar al número pedido. Cambia datos, así que solo se permite contra una
 * base local, como `db:seed:demo`.
 *
 * Uso: `pnpm demo:characters <cuenta> [cuántos=2]`.
 */
import "dotenv/config";

import mysql from "mysql2/promise";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);

async function main() {
  const [username, howMany = "2"] = process.argv.slice(2);
  const count = Number(howMany);
  if (!username || !Number.isInteger(count) || count < 1 || count > 10) {
    console.error("Uso: pnpm demo:characters <cuenta> [cuántos, de 1 a 10]");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL!;
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host) || process.env.NODE_ENV === "production") {
    throw new Error(`Solo se permite contra una base local (host actual: ${host}).`);
  }

  const db = await mysql.createConnection({ uri: url });
  try {
    const [[user]] = (await db.query("SELECT id FROM users WHERE username = ?", [
      username.toLowerCase(),
    ])) as [{ id: number }[], unknown];
    if (!user) throw new Error(`No existe la cuenta «${username}».`);

    // El primero sin dueño de cada servidor, por turnos, hasta `count`.
    const [rows] = (await db.query(
      `SELECT id, name, server FROM (
         SELECT c.id, c.name, s.name AS server,
                ROW_NUMBER() OVER (PARTITION BY c.server_id ORDER BY c.id) AS n
           FROM characters c JOIN servers s ON s.id = c.server_id
          WHERE c.user_id IS NULL) t
        ORDER BY n, id LIMIT ?`,
      [count],
    )) as [{ id: number; name: string; server: string }[], unknown];
    if (rows.length === 0)
      throw new Error("No hay personajes libres: ejecuta antes `pnpm db:seed:demo`.");

    await db.query("UPDATE characters SET user_id = ? WHERE id IN (?)", [
      user.id,
      rows.map((row) => row.id),
    ]);
    for (const row of rows) console.log(`${row.name} (${row.server}) ahora es de ${username}.`);
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
