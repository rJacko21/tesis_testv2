/**
 * Resultado de una Server Action de cuenta, ya traducido.
 *
 * El servidor devuelve los textos en el idioma de la página: el navegador
 * no descarga catálogos (RNF-01) y los mensajes de error los decide el
 * servidor, que es quien sabe qué se puede revelar (RF-03: no decir si
 * una cuenta existe).
 */
export type FormState =
  | { status: "idle" }
  | {
      status: "error";
      /** Mensaje general (arriba del formulario). */
      message: string;
      /** Error de cada campo, por su `name`. */
      fields?: Record<string, string>;
      /** Valores a conservar al volver a pintar el formulario (nunca contraseñas). */
      values?: Record<string, string>;
    }
  | { status: "success"; message: string };

export const IDLE: FormState = { status: "idle" };
