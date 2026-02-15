import type { ReactNode } from "react";

type LeagueListSidebarProps = {
  children: ReactNode;
  className?: string;
};

export default function LeagueListSidebar({ children, className = "" }: LeagueListSidebarProps) {
  return <aside className={`min-w-0 ${className}`.trim()}>{children}</aside>;
}
