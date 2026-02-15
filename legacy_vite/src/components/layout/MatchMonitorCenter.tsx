import type { ReactNode } from "react";

export default function MatchMonitorCenter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 ${className}`.trim()}>{children}</section>;
}
