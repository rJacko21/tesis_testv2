/**
 * Comprueba los catálogos de traducción (`pnpm i18n:check`).
 * Termina con código 1 si hay algún problema, para que falle el CI.
 */
import { LOCALES } from "../src/config/locales";
import { catalogLoaders } from "../src/i18n/catalog";
import { checkCatalogs } from "../src/i18n/tools/check-catalogs";

async function main(): Promise<void> {
  const [source, ...others] = await Promise.all(LOCALES.map((locale) => catalogLoaders[locale]()));
  if (!source) throw new Error("No se encontró el catálogo de origen");

  const catalogs = Object.fromEntries(
    LOCALES.slice(1).map((locale, index) => [locale, others[index]!]),
  );
  const issues = checkCatalogs(source, catalogs);

  if (issues.length === 0) {
    console.log(`Traducciones correctas en ${LOCALES.length} idiomas.`);
    return;
  }
  for (const issue of issues) console.error(`[${issue.locale}] ${issue.key}: ${issue.problem}`);
  console.error(`${issues.length} problema(s) de traducción.`);
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
