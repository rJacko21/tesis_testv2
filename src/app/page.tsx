/**
 * Portada provisional.
 *
 * Solo sirve para comprobar que la base técnica funciona (tipografías,
 * tokens, despliegue). La portada real se construye en T-12 según RF-01.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-4 py-12">
      <h1 className="font-display text-navy-900 text-4xl font-bold sm:text-5xl">Florensia</h1>
      <p className="text-lg">
        Free-to-play anime MMORPG. Sail the seas, fight on land, and build your guild.
      </p>
      <p className="text-navy-700 text-sm">New website under construction.</p>
    </main>
  );
}
