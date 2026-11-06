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

/** Opciones de presentación de los enlaces. */
export interface MarkdownOptions {
  /** Texto oculto que se añade a los enlaces externos, p. ej. "(sitio externo)". */
  externalLabel: string;
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
  return parseMarkdown(source).map((block, i) => {
    switch (block.type) {
      case "heading": {
        const Heading = block.level === 2 ? "h2" : "h3";
        return <Heading key={i}>{renderInline(block.text, options)}</Heading>;
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
