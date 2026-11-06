/**
 * Menú móvil (por debajo de 1024 px).
 *
 * Usa `<dialog>` con `showModal()`, que el navegador ya hace accesible:
 * - **el foco queda atrapado** dentro y el resto de la página es inerte;
 * - **Escape lo cierra** (evento `close`), y el foco vuelve al botón;
 * - el botón anuncia su estado con `aria-expanded`.
 *
 * Es lo que pide RF-02 sin una librería de diálogos. Es un Server
 * Component: el botón abre el diálogo con `commandfor`/`command`, que el
 * navegador ejecuta sin JavaScript propio, y `HeaderBehavior` añade lo que
 * falta (`aria-expanded`, cerrar al pulsar fuera y al cambiar de página).
 * El scroll de fondo se bloquea con CSS (`globals.css`).
 *
 * @see RF-02
 */
import { MOBILE_MENU_ID, type ResolvedLink } from "./nav-types";
import { NavLinkItem } from "./NavLinkItem";

export interface MobileMenuProps {
  openLabel: string;
  closeLabel: string;
  /** Nombre accesible de la navegación. */
  navLabel: string;
  primary: readonly ResolvedLink[];
  communityLabel: string;
  community: readonly ResolvedLink[];
  playNow: ResolvedLink;
  signIn: ResolvedLink;
  externalLabel: string;
  /** Clases de los botones Jugar ahora e Iniciar sesión. */
  buttonClasses: { primary: string; secondary: string };
}

/**
 * Atributos de Invoker Commands. React 19 los pasa tal cual al HTML, pero
 * los tipos de JSX aún no los conocen.
 */
const command = (name: "show-modal" | "close") => ({ commandfor: MOBILE_MENU_ID, command: name });

export function MobileMenu(props: MobileMenuProps) {
  const linkClass =
    "aria-[current]:bg-navy-700 flex min-h-12 items-center rounded-lg px-4 text-lg font-semibold hover:bg-navy-700";

  return (
    <>
      <button
        type="button"
        {...command("show-modal")}
        aria-expanded="false"
        aria-controls={MOBILE_MENU_ID}
        className="hover:bg-navy-700 grid size-11 place-items-center rounded lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
          <path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />
        </svg>
        <span className="sr-only">{props.openLabel}</span>
      </button>

      <dialog
        id={MOBILE_MENU_ID}
        aria-label={props.navLabel}
        // Pulsar fuera del panel cierra (donde aún no hay `closedby`, lo hace `HeaderBehavior`).
        {...{ closedby: "any" }}
        className="bg-navy-950 m-0 ml-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none text-white backdrop:bg-black/60 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-display text-gold-300 text-2xl font-bold">Florensia</span>
          <button
            type="button"
            {...command("close")}
            className="hover:bg-navy-700 grid size-11 place-items-center rounded"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
              <path
                fill="currentColor"
                d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z"
              />
            </svg>
            <span className="sr-only">{props.closeLabel}</span>
          </button>
        </div>

        <nav
          aria-label={props.navLabel}
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-2 pb-6"
        >
          <ul>
            {props.primary.map((link) => (
              <li key={link.href}>
                <NavLinkItem
                  link={link}
                  externalLabel={props.externalLabel}
                  className={linkClass}
                />
              </li>
            ))}
          </ul>
          <div>
            <h2 className="px-4 pb-1 text-sm font-bold tracking-wide text-sky-300 uppercase">
              {props.communityLabel}
            </h2>
            <ul>
              {props.community.map((link) => (
                <li key={link.href}>
                  <NavLinkItem
                    link={link}
                    externalLabel={props.externalLabel}
                    className={linkClass}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex flex-col gap-3 px-2">
            <NavLinkItem
              link={props.playNow}
              externalLabel={props.externalLabel}
              className={props.buttonClasses.primary}
            />
            <NavLinkItem
              link={props.signIn}
              externalLabel={props.externalLabel}
              className={props.buttonClasses.secondary}
            />
          </div>
        </nav>
      </dialog>
    </>
  );
}
