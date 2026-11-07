"use client";
/**
 * Formulario de cuenta genérico (registro, inicio de sesión, recuperación).
 *
 * Recibe una Server Action y la descripción de sus campos con los textos ya
 * traducidos. Funciona sin JavaScript (el navegador envía el formulario y
 * la página vuelve con el resultado) y, con JavaScript, sin recargar.
 *
 * Accesibilidad (RNF-03, WCAG 2.2):
 * - Cada campo tiene `<label>`, y su pista y su error están enlazados con
 *   `aria-describedby`; el campo erróneo lleva `aria-invalid`.
 * - El resumen de errores es `role="alert"`: el lector de pantalla lo lee
 *   al aparecer.
 * - `autocomplete` correcto en cada campo, para que el gestor de
 *   contraseñas rellene y proponga contraseñas seguras (WCAG 1.3.5, 3.3.8).
 * - No se impide pegar en los campos de contraseña.
 */
import { type ReactNode, useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { FormState } from "@/lib/auth/form-state";

export interface AuthField {
  name: string;
  /** Texto de la etiqueta; en una casilla puede llevar enlaces. */
  label: ReactNode;
  type: "text" | "email" | "password" | "checkbox" | "select";
  /** Opciones de un `select`; la primera puede ser la vacía («Elige…»). */
  options?: readonly { value: string; label: string }[];
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface AuthFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: readonly AuthField[];
  /** Campos ocultos: idioma, token, destino tras iniciar sesión… */
  hidden?: Record<string, string>;
  submitLabel: string;
  /** Se muestra junto al mensaje de éxito (p. ej. un enlace a iniciar sesión). */
  successExtra?: ReactNode;
  /** Trampa para bots: añade un campo oculto que una persona no rellena. */
  honeypot?: boolean;
  /** Prefijo de los `id` de los campos, para poner varios formularios en una página. */
  idPrefix?: string;
}

const INPUT =
  "border-parchment-300 text-ink-900 min-h-11 w-full rounded-lg border bg-white px-3 aria-[invalid=true]:border-danger-700";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="bg-gold-500 text-navy-950 hover:bg-gold-300 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-5 font-semibold disabled:cursor-wait disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function AuthForm({
  action,
  fields,
  hidden = {},
  submitLabel,
  successExtra,
  honeypot = false,
  idPrefix = "field",
}: AuthFormProps) {
  const [state, formAction] = useActionState(action, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" className="mt-6 rounded-lg bg-teal-100 p-4 text-teal-900">
        <p>{state.message}</p>
        {successExtra ? <div className="mt-3">{successExtra}</div> : null}
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fields ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
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

      {honeypot ? (
        // Fuera de la vista y del orden de tabulación; los lectores de pantalla lo ignoran.
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
      ) : null}

      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const error = errors[field.name];
        const describedBy =
          [field.hint ? `${id}-hint` : null, error ? `${id}-error` : null]
            .filter(Boolean)
            .join(" ") || undefined;

        if (field.type === "checkbox") {
          return (
            <div key={field.name}>
              <div className="flex items-start gap-3">
                <input
                  id={id}
                  name={field.name}
                  type="checkbox"
                  required={field.required}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                  className="accent-navy-700 mt-1 size-5 shrink-0"
                />
                <label htmlFor={id}>{field.label}</label>
              </div>
              {error ? (
                <p id={`${id}-error`} className="text-danger-700 mt-1 text-sm font-bold">
                  {error}
                </p>
              ) : null}
            </div>
          );
        }

        const hint = field.hint ? (
          <p id={`${id}-hint`} className="text-ink-600 mt-1 text-sm">
            {field.hint}
          </p>
        ) : null;
        const fieldError = error ? (
          <p id={`${id}-error`} className="text-danger-700 mt-1 text-sm font-bold">
            {error}
          </p>
        ) : null;

        if (field.type === "select") {
          return (
            <div key={field.name}>
              <label htmlFor={id} className="text-navy-900 mb-1 block font-bold">
                {field.label}
              </label>
              <select
                id={id}
                name={field.name}
                required={field.required}
                defaultValue={values[field.name] ?? ""}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={INPUT}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {hint}
              {fieldError}
            </div>
          );
        }

        return (
          <div key={field.name}>
            <label htmlFor={id} className="text-navy-900 mb-1 block font-bold">
              {field.label}
            </label>
            <input
              id={id}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required={field.required}
              minLength={field.minLength}
              maxLength={field.maxLength}
              pattern={field.pattern}
              // Las contraseñas nunca se devuelven al volver a pintar el formulario.
              defaultValue={field.type === "password" ? undefined : values[field.name]}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              spellCheck={field.type === "text" ? false : undefined}
              autoCapitalize={field.type === "password" ? undefined : "none"}
              className={INPUT}
            />
            {hint}
            {fieldError}
          </div>
        );
      })}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
