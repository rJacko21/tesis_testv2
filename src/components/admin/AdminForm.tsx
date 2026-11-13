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
  type: "text" | "textarea" | "select" | "datetime" | "number" | "checkbox" | "file";
  defaultValue?: string;
  options?: readonly { value: string; label: string }[];
  hint?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  /** Idioma del texto del campo (p. ej. el de una traducción), para el lector de pantalla. */
  lang?: string;
  /** Mínimo y máximo de un campo numérico. */
  min?: number;
  max?: number;
  /** Texto en monoespaciada (slug, Markdown). */
  mono?: boolean;
  /** Tipos aceptados de un campo de fichero (`image/png,image/jpeg`). */
  accept?: string;
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
  "border-parchment-300 text-ink-900 focus:border-navy-700 aria-[invalid=true]:border-danger-700 w-full rounded-lg border bg-surface px-3";

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
          className="border-danger-700 text-danger bg-surface rounded-lg border-2 p-3 font-bold"
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
          if (field.type === "checkbox") {
            // Una casilla envía «1» si está marcada; si no, no envía nada.
            const checked = (values[field.name] ?? field.defaultValue ?? "") === "1";
            return (
              <div key={field.name}>
                <label htmlFor={id} className="inline-flex min-h-11 items-center gap-3 font-bold">
                  <input
                    id={id}
                    name={field.name}
                    type="checkbox"
                    value="1"
                    defaultChecked={checked}
                    aria-describedby={describedBy}
                    className="accent-navy-700 size-5"
                  />
                  {field.label}
                </label>
                {field.hint ? (
                  <p id={`${id}-hint`} className="text-ink-600 text-sm">
                    {field.hint}
                  </p>
                ) : null}
              </div>
            );
          }
          return (
            <div key={field.name} className={wide}>
              <label htmlFor={id} className="text-heading mb-1 block font-bold">
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
              ) : field.type === "file" ? (
                // Un fichero no se puede volver a rellenar tras un error: hay que elegirlo otra vez.
                <input
                  id={id}
                  name={field.name}
                  type="file"
                  accept={field.accept}
                  required={field.required}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                  className={`${INPUT} file:bg-parchment-100 file:text-heading min-h-11 py-2 file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:font-semibold`}
                />
              ) : (
                <input
                  {...common}
                  type={
                    field.type === "datetime"
                      ? "datetime-local"
                      : field.type === "number"
                        ? "number"
                        : "text"
                  }
                  inputMode={field.type === "number" ? "numeric" : undefined}
                  min={field.min}
                  max={field.max}
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
                <p id={`${id}-error`} className="text-danger mt-1 text-sm font-bold">
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
