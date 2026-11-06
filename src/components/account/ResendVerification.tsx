"use client";
/** Botón «Enviar el enlace otra vez» con su resultado, sin recargar la página. */
import { useActionState } from "react";

import { resendVerificationAction } from "@/lib/auth/actions";

export function ResendVerification({ locale, label }: { locale: string; label: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, { status: "idle" });
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="locale" value={locale} />
      {state.status === "idle" ? (
        <button
          type="submit"
          disabled={pending}
          className="text-navy-700 font-bold underline disabled:opacity-60"
        >
          {label}
        </button>
      ) : (
        <p role={state.status === "success" ? "status" : "alert"}>{state.message}</p>
      )}
    </form>
  );
}
