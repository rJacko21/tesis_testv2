/**
 * Tema claro u oscuro (M-44).
 *
 * - Por defecto se sigue el ajuste del sistema del usuario
 *   (`prefers-color-scheme`).
 * - El botón de la cabecera lo cambia y la elección se guarda en
 *   `localStorage`: es una preferencia de interfaz, no un dato personal ni
 *   una cookie, así que no necesita consentimiento.
 *
 * El tema se aplica con `data-theme` en `<html>`; los colores de cada tema
 * están en `globals.css`.
 */

/** Clave de `localStorage` con la elección del usuario. */
export const THEME_STORAGE_KEY = "florensia-theme";

/**
 * Script en línea del `<head>`: pone `data-theme` antes del primer pintado
 * para que la página no parpadee en claro antes de pasar a oscuro. Son
 * ~200 bytes y no depende de React. El `try` cubre los navegadores que
 * bloquean `localStorage` (modo privado estricto): ahí manda el sistema.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}document.documentElement.dataset.theme=t==="light"||t==="dark"?t:matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"`;
