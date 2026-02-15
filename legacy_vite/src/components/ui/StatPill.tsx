import type { ReactNode } from "react";

export default function StatPill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border px-2 py-1.5 text-xs ${className}`}>{children}</div>;
}
