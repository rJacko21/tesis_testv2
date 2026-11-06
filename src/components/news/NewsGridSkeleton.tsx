/**
 * Esqueleto del listado mientras llegan las noticias.
 *
 * Reserva el mismo espacio que las tarjetas reales (portada 16:9 y texto)
 * para que, al llegar el contenido, nada se mueva (CLS, RNF-01). Es
 * decorativo: `aria-hidden`, y los lectores de pantalla esperan al
 * contenido real.
 */
export function NewsGridSkeleton({ count = 3, withFilter = false }) {
  return (
    <div aria-hidden="true" className="mt-6">
      {withFilter ? <div className="mb-6 h-13" /> : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="rounded-panel overflow-hidden bg-white/60">
            <div className="bg-parchment-300/60 aspect-[16/9] animate-pulse" />
            <div className="flex flex-col gap-3 p-4">
              <div className="bg-parchment-300/60 h-5 w-24 rounded-full" />
              <div className="bg-parchment-300/60 h-6 w-3/4 rounded" />
              <div className="bg-parchment-300/60 h-4 w-1/3 rounded" />
              <div className="bg-parchment-300/60 h-10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
