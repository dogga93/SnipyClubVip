'use client';

type SectionHeaderProps = {
  title: string;
  right?: string;
  className?: string;
};

export function SectionHeader({ title, right, className }: SectionHeaderProps) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className ?? ''}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">{title}</h3>
      {right ? <span className="text-xs text-slate-400">{right}</span> : null}
    </div>
  );
}

