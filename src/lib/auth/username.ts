/**
 * Reglas del nombre de cuenta (RF-03). Sin `server-only`: el formulario
 * usa los mismos límites en sus atributos (`minLength`, `pattern`), así el
 * navegador avisa antes de enviar y el servidor vuelve a comprobarlo.
 */

export const USERNAME_MIN = 4;
export const USERNAME_MAX = 16;

/** Letras latinas sin acento, números y guion bajo: lo que admite el juego en el nombre de cuenta. */
export const USERNAME_PATTERN = "[A-Za-z0-9_]+";

/** Indica si un nombre de cuenta tiene un formato válido (la longitud se comprueba aparte). */
export function isValidUsername(username: string): boolean {
  return new RegExp(`^${USERNAME_PATTERN}$`).test(username);
}
