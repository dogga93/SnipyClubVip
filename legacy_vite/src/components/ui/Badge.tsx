import type { ReactNode } from "react";

export default function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}
