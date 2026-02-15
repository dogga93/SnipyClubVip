export default function HomePage() {
  return (
    <section className="space-y-4">
      <div className="panel">
        <h2 className="text-xl font-bold">Accueil</h2>
        <p className="mt-1 text-sm text-slate-300">
          Acces rapide aux instances Vercel et aux pages locales.
        </p>
      </div>
      <div className="panel grid gap-3 md:grid-cols-2">
        <a
          className="rounded-md border border-cyan-600/40 bg-cyan-900/20 px-3 py-2 text-cyan-200 hover:bg-cyan-900/35"
          href="https://snipy-macram1920-1921s-projects.vercel.app"
          target="_blank"
          rel="noreferrer"
        >
          Ouvrir Vercel 1
        </a>
        <a
          className="rounded-md border border-cyan-600/40 bg-cyan-900/20 px-3 py-2 text-cyan-200 hover:bg-cyan-900/35"
          href="https://snipy-macram1920-1921-macram1920-1921s-projects.vercel.app"
          target="_blank"
          rel="noreferrer"
        >
          Ouvrir Vercel 2
        </a>
      </div>
      <div className="panel">
        <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-300">Pages du projet</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <a
            className="rounded-md border border-emerald-600/40 bg-emerald-900/20 px-3 py-2 text-center text-emerald-200 hover:bg-emerald-900/35"
            href="/fenetres"
          >
            Ouvrir Fenetres
          </a>
          <a
            className="rounded-md border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-center text-slate-200 hover:bg-slate-800"
            href="/browse"
          >
            Ouvrir Browse
          </a>
          <a
            className="rounded-md border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-center text-slate-200 hover:bg-slate-800"
            href="/matches"
          >
            Ouvrir Matches
          </a>
        </div>
      </div>
    </section>
  );
}
