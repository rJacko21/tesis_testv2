import type { MessageKey } from "@/i18n/catalog";
import type { Translate } from "@/i18n/translator";
import type { BadgeTone } from "@/components/ui";
import type { UserStatus } from "@/lib/admin/users";

/** Color de la insignia de cada estado de cuenta. */
export const STATUS_TONE: Record<UserStatus, BadgeTone> = {
  active: "success",
  suspended: "sale",
  deleted: "neutral",
};

/**
 * Nombre de una acción de la auditoría en el idioma de la página. Si una
 * acción aún no tiene traducción, se muestra su código (`user.suspend`) en
 * vez de romper la página: el registro es más antiguo que los textos.
 */
export function actionLabel(t: Translate, action: string): string {
  try {
    return t(`admin.audit.actions.${action}` as MessageKey);
  } catch {
    return action;
  }
}
