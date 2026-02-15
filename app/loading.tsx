export default function Loading() {
  return (
    <section className="space-y-4">
      <div className="panel h-24 animate-pulse" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel h-64 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
      </div>
    </section>
  );
}
