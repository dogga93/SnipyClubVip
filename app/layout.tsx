import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Snipy Reset',
  description: 'Reset stable frontend'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="border-b border-slate-800 bg-slate-900/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <h1 className="text-lg font-black text-white">SnipyClubVip</h1>
            <nav className="flex gap-2 text-sm">
              <Link className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800" href="/fenetres">Fenetres</Link>
              <Link className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800" href="/browse">Browse</Link>
              <Link className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800" href="/matches">Matches</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
