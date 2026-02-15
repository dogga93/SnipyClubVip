import type { ReactNode } from "react";

export default function BrowseCenter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 space-y-0 ${className}`.trim()}>{children}</section>;
}
