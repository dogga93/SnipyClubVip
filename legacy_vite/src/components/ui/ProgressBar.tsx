export default function ProgressBar({ value, color = "bg-cyan-400", className = "" }: { value: number; color?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded bg-white/10 ${className}`}>
      <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
