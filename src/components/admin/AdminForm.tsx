"use client";
/**
 * Formulario del panel con errores por campo (RF-12), para textos largos
 * como el cuerpo de una noticia.
 *
 * Funciona como `AuthForm`: sin JavaScript el navegador envía el
 * formulario y la página vuelve con el resultado; con JavaScript, sin
 * recargar y sin perder lo escrito si hay un error (los valores vuelven en
 * `FormState.values`). Si todo va bien, la Server Action redirige.
 *
 * Accesibilidad: `<label>` en cada campo, pista y error enlazados con
 * `aria-describedby`, `aria-invalid` en el campo erróneo y resumen
 * `role="alert"`.
 *
 * @see RF-12 · M-36
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { FormState } from "@/lib/auth/form-state";

export interface AdminField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "datetime";
  defaultValue?: string;
  options?: readonly { value: string; label: string }[];
  hint?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  /** Idioma del texto del campo (p. ej. el de una traducción), para el lector de pantalla. */
  lang?: string;
  /** Texto en monoespaciada (slug, Markdown). */
  mono?: boolean;
}

export interface AdminFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: readonly AdminField[];
  hidden: Record<string, string>;
  submitLabel: string;
  idPrefix: string;
  /** Dos columnas en pantallas anchas para los campos cortos. */
  columns?: boolean;
}

const INPUT =
  "border-parchment-300 text-ink-900 focus:border-navy-700 aria-[invalid=true]:border-danger-700 w-full rounded-lg border bg-white px-3";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="bg-navy-700 hover:bg-navy-900 inline-flex min-h-11 w-fit items-center justify-center rounded-lg px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function AdminForm({
  action,
  fields,
  hidden,
  submitLabel,
  idPrefix,
  columns,
}: AdminFormProps) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const errors = state.status === "error" ? (state.fields ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  return (
    <form action={formAction} className="grid gap-5">
      {state.status === "error" ? (
        <p
          role="alert"
          className="border-danger-700 text-danger-700 rounded-lg border-2 bg-white p-3 font-bold"
        >
          {state.message}
        </p>
      ) : null}
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {/* Al volver con un error, los campos se montan de nuevo con lo escrito: React
          restablece el formulario tras la acción, y un <select> volvería a su valor inicial. */}
      <div
        key={JSON.stringify(values)}
        className={columns ? "grid gap-5 md:grid-cols-2" : "grid gap-5"}
      >
        {fields.map((field) => {
          const id = `${idPrefix}-${field.name}`;
          const error = errors[field.name];
          const describedBy =
            [field.hint ? `${id}-hint` : null, error ? `${id}-error` : null]
              .filter(Boolean)
              .join(" ") || undefined;
          const common = {
            id,
            name: field.name,
            required: field.required,
            defaultValue: values[field.name] ?? field.defaultValue ?? "",
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
            lang: field.lang,
          };
          const wide = field.type === "textarea" ? "md:col-span-2" : "";
          return (
            <div key={field.name} className={wide}>
              <label htmlFor={id} className="text-navy-900 mb-1 block font-bold">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  {...common}
                  rows={field.rows ?? 4}
                  maxLength={field.maxLength}
                  className={`${INPUT} py-2 ${field.mono ? "font-mono text-sm" : ""}`}
                />
              ) : field.type === "select" ? (
                <select {...common} className={`${INPUT} min-h-11`}>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type={field.type === "datetime" ? "datetime-local" : "text"}
                  maxLength={field.maxLength}
                  className={`${INPUT} min-h-11 ${field.mono ? "font-mono" : ""}`}
                />
              )}
              {field.hint ? (
                <p id={`${id}-hint`} className="text-ink-600 mt-1 text-sm">
                  {field.hint}
                </p>
              ) : null}
              {error ? (
                <p id={`${id}-error`} className="text-danger-700 mt-1 text-sm font-bold">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <Submit label={submitLabel} />
    </form>
  );
}
