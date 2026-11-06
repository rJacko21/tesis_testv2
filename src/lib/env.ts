/**
 * Variables de entorno validadas.
 *
 * Se validan con Zod al arrancar para que un error de configuración falle
 * pronto y con un mensaje claro, en lugar de aparecer como un error raro en
 * mitad de una petición. Nunca se exponen al navegador.
 *
 * @see RNF-06 Seguridad (secretos fuera del repositorio)
 */
import "server-only";

import { z } from "zod";

const envSchema = z.object({
  /** Cadena de conexión MySQL, p. ej. `mysql://user:pass@localhost:3306/florensia`. */
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/** Configuración validada del servidor. */
export const env = envSchema.parse(process.env);
