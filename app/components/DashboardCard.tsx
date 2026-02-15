import { ReactNode } from 'react';

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({ title, subtitle, children, className }: DashboardCardProps) {
  return (
    <section className={`dashboard-card p-4 ${className ?? ''}`}>
      <header className="mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-300">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

