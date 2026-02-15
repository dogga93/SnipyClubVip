import Link from 'next/link';

export default function BrowsePage() {
  return (
    <section className="space-y-4">
      <div className="panel">
        <h2 className="text-xl font-bold">Browse</h2>
        <p className="mt-1 text-sm text-slate-300">Importer les fichiers Game Monitor puis ouvrir les Match Cards analytiques.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <a
            className="rounded-md border border-cyan-600/40 bg-cyan-900/20 px-3 py-2 text-cyan-200 hover:bg-cyan-900/35"
            href="https://snipy-macram1920-1921s-projects.vercel.app"
            target="_blank"
            rel="noreferrer"
          >
            snipy-macram1920-1921s-projects.vercel.app
          </a>
          <a
            className="rounded-md border border-cyan-600/40 bg-cyan-900/20 px-3 py-2 text-cyan-200 hover:bg-cyan-900/35"
            href="https://snipy-macram1920-1921-macram1920-1921s-projects.vercel.app"
            target="_blank"
            rel="noreferrer"
          >
            snipy-macram1920-1921-macram1920-1921s-projects.vercel.app
          </a>
        </div>
      </div>

      <div className="panel space-y-2">
        <p className="text-sm text-slate-300">Etape 1: importer Game Monitor page 1*</p>
        <pre className="overflow-auto rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-cyan-200">{`curl -X POST http://localhost:3000/api/import/game-monitor \\
  -H "x-admin-secret: $ADMIN_SECRET"`}</pre>
        <p className="text-xs text-slate-400">Utilise aussi body JSON optionnel: {`{"files": ["/path/file.xlsx"]}`}</p>
      </div>

      <div className="panel">
        <p className="text-sm text-slate-300">Etape 2: ouvrir les cards analytiques</p>
        <Link className="mt-2 inline-block rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800" href="/matches">
          Aller a Matches
        </Link>
      </div>
    </section>
  );
}
