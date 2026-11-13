/**
 * Landing «Jugar ahora» (RF-03).
 *
 * La original (`/lp/style1/PlayNow`, que redirige aquí) era un vídeo de
 * fondo a pantalla completa con el formulario de registro encima. Aquí se
 * conserva la idea, registrarse sin salir de la página, con estos cambios:
 * - **sin vídeo:** una ilustración del juego y degradados CSS. El vídeo de
 *   fondo pesaba varios MB, retrasaba el LCP y se movía sin poder pararlo
 *   (WCAG 2.2.2);
 * - **es el único formulario de registro** (`RegisterForm`): `/register`
 *   redirige aquí desde el 2026-11-08, para no tener dos páginas que hacen lo
 *   mismo con aspecto distinto (M-40);
 * - **los tres pasos** (crear la cuenta, descargar y jugar) y tres razones
 *   para jugar, en texto;
 * - **en móvil el formulario va justo tras el título**, sin desplazarse.
 *
 * Tras registrarse, el mensaje de éxito ofrece descargar el juego.
 */
import type { Metadata } from "next";
import Link from "next/link";

import magicKnight from "@/assets/characters/magic-knight.webp";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ButtonLink, Container } from "@/components/ui";
import { languageAlternates, OG_IMAGE } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";

const LINK = "text-link font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("playNow.title"),
    description: t("playNow.description"),
    alternates: { canonical: `/${locale}/play-now`, languages: languageAlternates("/play-now") },
    openGraph: { siteName: "Florensia", locale, images: [OG_IMAGE] },
  };
}

export default async function PlayNowPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const reasons = ["land", "sea", "guild"] as const;

  return (
    <main className="flex-1">
      <section
        aria-labelledby="play-title"
        className="from-navy-700 via-navy-900 to-navy-950 relative isolate overflow-hidden bg-linear-to-b pt-8 pb-12 text-white sm:pt-12"
      >
        <div
          aria-hidden="true"
          className="absolute top-10 left-[-20%] -z-10 size-[28rem] rounded-full bg-sky-300/20 blur-3xl"
        />
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start">
          <div className="flex flex-col gap-4">
            <p className="border-gold-500/60 text-gold-300 w-fit rounded-full border px-3 py-1 text-sm font-bold tracking-wide uppercase">
              {t("home.hero.eyebrow")}
            </p>
            <h1
              id="play-title"
              className="font-display text-gold-300 text-4xl font-extrabold drop-shadow-[0_2px_0_rgb(7_29_51)] sm:text-6xl"
            >
              {t("playNow.heading")}
            </h1>
            <p className="text-on-dark max-w-xl text-lg">{t("playNow.intro")}</p>
            <ul className="hidden max-w-xl gap-3 lg:grid">
              {reasons.map((key) => (
                <li key={key} className="border-gold-500 border-l-4 pl-4">
                  <strong className="text-gold-300 block">{t(`home.features.${key}.title`)}</strong>
                  <span className="text-on-dark">{t(`home.features.${key}.body`)}</span>
                </li>
              ))}
            </ul>
            {/*
              Imagen decorativa solo en escritorio y con carga diferida: en
              móvil no se descarga. Con <img> en vez de next/image la página
              no carga el componente de imagen en el cliente (unos 5 KB).
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={magicKnight.src}
              width={magicKnight.width}
              height={magicKnight.height}
              alt=""
              loading="lazy"
              decoding="async"
              className="mt-2 hidden h-auto w-52 self-start drop-shadow-[0_10px_24px_rgb(0_0_0/0.45)] lg:block"
            />
          </div>

          <div className="text-ink-900 bg-surface rounded-lg p-5 shadow-xl sm:p-6">
            <h2 className="font-display text-heading text-2xl font-bold">
              {t("playNow.formTitle")}
            </h2>
            <p className="text-ink-600 mt-1 mb-4">{t("playNow.formIntro")}</p>
            <RegisterForm
              locale={locale}
              t={t}
              idPrefix="play"
              successExtra={
                <p className="flex flex-wrap gap-x-4 gap-y-2">
                  <Link href={`/${locale}/download`} className={LINK}>
                    {t("playNow.downloadNow")}
                  </Link>
                  <Link href={`/${locale}/sign-in`} className={LINK}>
                    {t("auth.register.signInLink")}
                  </Link>
                </p>
              }
            />
            <p className="mt-4 text-center text-sm">
              {t("auth.register.haveAccount")}{" "}
              <Link href={`/${locale}/sign-in`} className={LINK}>
                {t("auth.register.signInLink")}
              </Link>{" "}
              ·{" "}
              <Link href={`/${locale}/download`} className={LINK}>
                {t("playNow.haveAccountDownload")}
              </Link>
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="steps-title" className="py-10 sm:py-14">
        <Container>
          <h2 id="steps-title" className="font-display text-heading text-3xl font-bold">
            {t("playNow.steps.title")}
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {(["account", "download", "play"] as const).map((step, index) => (
              <li key={step} className="rounded-panel shadow-panel bg-surface flex gap-4 p-5">
                <span
                  aria-hidden="true"
                  className="bg-navy-900 text-gold-300 font-display flex size-10 shrink-0 items-center justify-center rounded-full text-xl font-bold"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-heading font-bold">{t(`playNow.steps.${step}.title`)}</h3>
                  <p className="text-ink-600 mt-1">{t(`playNow.steps.${step}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <ButtonLink href={`/${locale}/download`} variant="secondary">
              {t("nav.download")}
            </ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}
