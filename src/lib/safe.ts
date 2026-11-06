/**
 * Ejecuta una carga de datos sin dejar que un fallo tumbe la página.
 *
 * Una caída de la base de datos no debe romper la página entera: la
 * portada sigue funcionando sin la sección de noticias y el listado muestra
 * un aviso. El resultado distingue "falló" de "no hay datos" (`null`
 * legítimo, p. ej. una noticia que no existe), para no responder 404 a algo
 * que solo no se pudo cargar.
 *
 * Solo se usa alrededor de consultas; `notFound()` y `redirect()` se llaman
 * fuera para que no se traguen.
 */
export type LoadResult<T> = { ok: true; data: T } | { ok: false };

export async function tryLoad<T>(what: string, load: () => Promise<T>): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    console.error(`[datos] No se pudo cargar ${what}:`, error);
    return { ok: false };
  }
}
