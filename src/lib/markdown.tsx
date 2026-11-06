/**
 * Markdown mínimo y seguro para el cuerpo de las noticias (RF-08).
 *
 * El texto se convierte en **elementos de React**, nunca en una cadena HTML:
 * no hay `dangerouslySetInnerHTML`, así que una etiqueta `<script>` o un
 * `onerror=` escrito en el panel se muestra como texto y no se ejecuta (XSS
 * imposible por construcción). Por eso no se usa una librería de Markdown
 * más un saneador de HTML: serían ~40 KB más en el servidor y una superficie
 * de ataque que hay que mantener al día.
 *
 * Sintaxis admitida, la que necesitan las noticias:
 * - Párrafos separados por una línea en blanco.
 * - Títulos `#`/`##` (se muestran como `h2`, porque el `h1` es el título de la
 *   noticia) y `###` o más (`h3`).
 * - Listas con `-`/`*` o `1.`, y citas con `>`.
 * - En línea: `**negrita**`, `*cursiva*`, `` `código` `` y `[texto](url)`.
 *
 * Los enlaces solo aceptan rutas internas (`/…`, `#…`), `http(s):` y
 * `mailto:`. Un `javascript:` u otro esquema se muestra como texto plano.
 */
import type { ReactNode } from "react";

/** Bloque de primer nivel del documento. */
export type MarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const UNORDERED_ITEM = /^[-*]\s+(.*)$/;
const ORDERED_ITEM = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

/**
 * Divide el Markdown en bloques. Las líneas seguidas sin marca se unen en
 * un mismo párrafo, como en Markdown estándar.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      flushParagraph();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1]!.length <= 2 ? 2 : 3, text: heading[2]! });
      continue;
    }

    const unordered = UNORDERED_ITEM.exec(line);
    const ordered = unordered ? null : ORDERED_ITEM.exec(line);
    const item = unordered ?? ordered;
    if (item) {
      flushParagraph();
      const isOrdered = ordered !== null;
      const last = blocks.at(-1);
      if (last?.type === "list" && last.ordered === isOrdered) last.items.push(item[1]!);
      else blocks.push({ type: "list", ordered: isOrdered, items: [item[1]!] });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flushParagraph();
      const last = blocks.at(-1);
      if (last?.type === "quote") last.text += ` ${quote[1]}`;
      else blocks.push({ type: "quote", text: quote[1]! });
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

/**
 * Indica si un destino de enlace es seguro.
 *
 * @returns `true` para rutas internas, anclas, `http(s):` y `mailto:`.
 */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (href.startsWith("#")) return true;
  return /^(https?:\/\/|mailto:)/i.test(href);
}

/** Opciones de presentación. */
export interface MarkdownOptions {
  /** Texto oculto que se añade a los enlaces externos, p. ej. "(sitio externo)". */
  externalLabel: string;
  /**
   * Da un `id` a cada `h2` para poder enlazarlo desde un índice (reglas y
   * páginas legales, RF-10). Ver {@link tableOfContents}.
   */
  headingIds?: boolean;
}

/** Quita el formato en línea para usar el texto en un índice o un `id`. */
function plainText(text: string): string {
  return text.replace(/\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\([^)]*\)/g, "$1$2$3$4");
}

/**
 * Convierte un título en un `id` legible y estable: "Juego limpio" →
 * "juego-limpio". Quita acentos y conserva letras de cualquier alfabeto.
 */
export function slugify(text: string): string {
  return (
    plainText(text)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "seccion"
  );
}

/** Entrada del índice: `id` del `h2` y su texto. */
export interface TocEntry {
  id: string;
  title: string;
}

/**
 * Índice de los títulos `h2`, con los mismos `id` que pone {@link Markdown}
 * con `headingIds` (los repetidos llevan sufijo `-2`, `-3`…).
 */
export function tableOfContents(source: string): TocEntry[] {
  const seen = new Map<string, number>();
  return parseMarkdown(source)
    .filter(
      (block): block is Extract<MarkdownBlock, { type: "heading" }> =>
        block.type === "heading" && block.level === 2,
    )
    .map((block) => {
      const base = slugify(block.text);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return { id: count === 1 ? base : `${base}-${count}`, title: plainText(block.text) };
    });
}

// Un único patrón con alternativas: negrita, cursiva, código y enlace.
const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Convierte el formato en línea de un texto en nodos de React. */
export function renderInline(text: string, options: MarkdownOptions): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [whole, bold, italic, code, linkText, href] = match;

    if (bold !== undefined) nodes.push(<strong key={key++}>{renderInline(bold, options)}</strong>);
    else if (italic !== undefined) nodes.push(<em key={key++}>{renderInline(italic, options)}</em>);
    else if (code !== undefined) nodes.push(<code key={key++}>{code}</code>);
    else if (linkText !== undefined && href !== undefined) {
      if (!isSafeHref(href)) nodes.push(linkText);
      else {
        const external = /^https?:/i.test(href);
        nodes.push(
          <a key={key++} href={href} rel={external ? "noopener noreferrer" : undefined}>
            {renderInline(linkText, options)}
            {external ? <span className="sr-only"> {options.externalLabel}</span> : null}
          </a>,
        );
      }
    } else nodes.push(whole);

    last = match.index + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Renderiza el Markdown completo. Los estilos los pone el contenedor (`.prose-news`). */
export function Markdown({ source, ...options }: MarkdownOptions & { source: string }) {
  const ids = options.headingIds ? tableOfContents(source).map((entry) => entry.id) : [];
  let h2 = 0;
  return parseMarkdown(source).map((block, i) => {
    switch (block.type) {
      case "heading": {
        if (block.level === 2) {
          return (
            <h2 key={i} id={ids[h2++]}>
              {renderInline(block.text, options)}
            </h2>
          );
        }
        return <h3 key={i}>{renderInline(block.text, options)}</h3>;
      }
      case "paragraph":
        return <p key={i}>{renderInline(block.text, options)}</p>;
      case "quote":
        return <blockquote key={i}>{renderInline(block.text, options)}</blockquote>;
      case "list": {
        const List = block.ordered ? "ol" : "ul";
        return (
          <List key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item, options)}</li>
            ))}
          </List>
        );
      }
    }
  });
}
