'use client';

import { useMemo, useState } from 'react';

type RemoteProject = {
  label: string;
  baseUrl: string;
};

const projects: RemoteProject[] = [
  {
    label: 'Vercel 1',
    baseUrl: 'https://snipy-macram1920-1921s-projects.vercel.app'
  },
  {
    label: 'Vercel 2',
    baseUrl: 'https://snipy-macram1920-1921-macram1920-1921s-projects.vercel.app'
  }
];

const routes = ['/', '/browse', '/matches'];

export default function FenetresPage() {
  const [selectedProject, setSelectedProject] = useState(projects[0].baseUrl);
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);

  const previewUrl = useMemo(() => {
    const base = selectedProject.endsWith('/') ? selectedProject.slice(0, -1) : selectedProject;
    return `${base}${selectedRoute}`;
  }, [selectedProject, selectedRoute]);

  return (
    <section className="space-y-4">
      <div className="panel">
        <h2 className="text-xl font-bold">Fenêtres Vercel</h2>
        <p className="mt-1 text-sm text-slate-300">
          Toutes les pages principales des 2 projets, regroupées ici. L&apos;accueil local reste inchangé.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <div key={project.baseUrl} className="panel">
            <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-300">{project.label}</h3>
            <p className="mt-1 break-all text-xs text-slate-400">{project.baseUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {routes.map((route) => {
                const full = `${project.baseUrl}${route === '/' ? '' : route}`;
                return (
                  <a
                    key={`${project.baseUrl}-${route}`}
                    href={full}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-cyan-600/40 bg-cyan-900/20 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900/35"
                  >
                    {route}
                  </a>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedProject(project.baseUrl);
                setSelectedRoute('/browse');
              }}
              className="mt-3 rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
              Prévisualiser /browse
            </button>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.baseUrl} value={p.baseUrl}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            {routes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-emerald-600/40 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-900/35"
          >
            Ouvrir dans une nouvelle fenêtre
          </a>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-700">
          <iframe
            title="Aperçu fenêtres Vercel"
            src={previewUrl}
            className="h-[70vh] w-full bg-slate-950"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Si un site bloque l&apos;iframe, utilise le bouton &quot;Ouvrir dans une nouvelle fenêtre&quot;.
        </p>
      </div>
    </section>
  );
}
