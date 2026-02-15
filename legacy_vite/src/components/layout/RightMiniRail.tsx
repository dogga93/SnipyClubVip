const RIGHT_MINI_LOGOS = [
  "https://r2.thesportsdb.com/images/media/league/badge/3h6z8n1679955001.png",
  "https://r2.thesportsdb.com/images/media/league/badge/a9v67i1737743130.png",
  "https://r2.thesportsdb.com/images/media/league/badge/4v7n7k1743621595.png",
  "https://r2.thesportsdb.com/images/media/league/badge/0j55xg1698014231.png",
  "https://r2.thesportsdb.com/images/media/league/badge/4v7n7k1743621595.png",
  "https://r2.thesportsdb.com/images/media/team/badge/6svyww1467972925.png",
];

export default function RightMiniRail() {
  return (
    <aside className="hidden xl:flex fixed right-[20.5rem] 2xl:right-[21.5rem] top-24 z-20 flex-col gap-2.5 pointer-events-none">
      {RIGHT_MINI_LOGOS.map((logo, index) => (
        <div
          key={`right-mini-rail-${index}`}
          className="w-12 h-12 rounded-xl border border-cyan-300/20 bg-[#081a34]/65 backdrop-blur-sm p-1.5 shadow-[0_8px_20px_rgba(3,14,30,0.35)]"
        >
          <img
            src={logo}
            alt="Mini logo"
            className="w-full h-full object-contain opacity-95"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.opacity = "0.25";
            }}
          />
        </div>
      ))}
    </aside>
  );
}
