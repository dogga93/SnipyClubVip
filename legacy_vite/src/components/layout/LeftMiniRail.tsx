const MINI_LOGOS = [
  "https://r2.thesportsdb.com/images/media/team/badge/lhwuiz1621593302.png",
  "https://crests.football-data.org/524.png",
  "https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png",
  "https://crests.football-data.org/86.png",
  "https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png",
  "https://r2.thesportsdb.com/images/media/league/badge/afedb31688770443.png",
];

export default function LeftMiniRail() {
  return (
    <aside className="hidden xl:flex fixed left-2 top-24 z-20 flex-col gap-2.5">
      {MINI_LOGOS.map((logo, index) => (
        <div
          key={`mini-rail-${index}`}
          className="w-12 h-12 rounded-xl border border-cyan-300/20 bg-[#081a34]/65 backdrop-blur-sm p-1.5 shadow-[0_8px_20px_rgba(3,14,30,0.35)] hover:border-cyan-300/45 hover:shadow-[0_10px_24px_rgba(34,211,238,0.25)] transition-all"
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
