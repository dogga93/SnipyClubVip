'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Picks', href: '/picks' },
  { name: 'SNIPY Live Bot', href: '/browse' },
  { name: 'Predictions 11', href: '/matches' },
  { name: 'SoccerBuddy 13', href: '/ai-desk' },
  { name: 'AI Desk', href: '/ai-desk' },
  { name: 'Alerts', href: '/picks' },
  { name: 'Pricing', href: '/pricing' }
];

type LeagueLogos = Record<string, string>;

const featuredLeagues = [
  'england premier league',
  'france ligue 1',
  'italy serie a',
  'spain primera division',
  'germany bundesliga',
  'england championship',
  'portugal primeira liga',
  'belgium jupiler league',
  'turkey super lig',
  'greece super league',
  'europe champions league'
];

export function Header() {
  const pathname = usePathname();
  const [logos, setLogos] = React.useState<LeagueLogos>({});

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/league-logos.json', { cache: 'force-cache' });
        if (!res.ok) return;
        const data = (await res.json()) as LeagueLogos;
        setLogos(data);
      } catch {
        setLogos({});
      }
    };
    void load();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[linear-gradient(180deg,rgba(3,10,25,0.98),rgba(5,13,33,0.95))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1660px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 font-black text-slate-900">
            SP
          </span>
          <span className="text-4 font-semibold tracking-tight text-emerald-300">SnipyClubVip</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href === '/browse' && pathname.startsWith('/match/'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm transition',
                  active ? 'text-cyan-300' : 'text-slate-200 hover:text-white'
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <button className="rounded-full border border-cyan-400/30 p-2 text-slate-200 hover:bg-cyan-500/10">
            <Globe className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-2 text-sm text-slate-200 hover:text-white">
            <LogIn className="h-4 w-4" /> Sign in
          </button>
          <Link
            href="/pricing"
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-900"
          >
            Get Started
          </Link>
        </div>
      </div>

      <div className="mx-auto mb-2 max-w-[1660px] px-6">
        <div className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-cyan-500/30 bg-slate-900/45 px-3 py-2">
          {featuredLeagues.map((league) => (
            <div key={league} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/35 bg-slate-950/75">
              {logos[league] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logos[league]} alt={league} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="text-xs">⚽</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
