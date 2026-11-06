/** Enlace ya traducido y con idioma, listo para pintar en un Client Component. */
export interface ResolvedLink {
  label: string;
  href: string;
  external?: boolean;
}

/** Id del `<dialog>` del menú móvil: lo usan el botón, `HeaderBehavior` y `globals.css`. */
export const MOBILE_MENU_ID = "mobile-menu";
