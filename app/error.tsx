'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel">
      <h2 className="text-lg font-bold text-rose-300">Erreur d'affichage</h2>
      <p className="mt-1 text-sm text-slate-300">{error.message}</p>
      <button className="mt-3 rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800" onClick={reset}>
        Retry
      </button>
    </section>
  );
}
