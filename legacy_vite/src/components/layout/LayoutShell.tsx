import type { ReactNode } from "react";
import RightMiniRail from "./RightMiniRail";

type LayoutShellProps = {
  leftMini?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export default function LayoutShell({ leftMini, children, contentClassName = "" }: LayoutShellProps) {
  return (
    <div className="relative min-w-0">
      {leftMini}
      <RightMiniRail />
      <div className={`min-w-0 2xl:pl-20 ${contentClassName}`.trim()}>{children}</div>
    </div>
  );
}
