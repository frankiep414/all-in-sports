import { Trophy, ArrowLeft } from 'lucide-react';

const champions = [
  {
    year: '2026',
    season: 'Summer',
    competition: 'Coed League',
    team: 'They Not Like Us',
    image: '/history/2026-summer-coed-they-not-like-us.webp',
  },
  {
    year: '2026',
    season: 'Winter',
    competition: "Men's",
    team: 'They Not Like Us',
    image: '/history/2026-winter-mens-they-not-like-us.webp',
  },
  {
    year: '2026',
    season: 'Winter',
    competition: "Men's",
    team: 'All Things Soccer',
    image: '/history/2026-winter-mens-all-things-soccer.webp',
  },
  {
    year: '2026',
    season: 'Winter II',
    competition: "Men's",
    team: 'San Pedro',
    image: '/history/2026-winter-ii-mens-san-pedro.webp',
  },
  {
    year: '2026',
    season: 'Spring',
    competition: 'Tournament',
    team: 'Wolverines',
    image: '/history/2026-spring-tournament-wolverines.webp',
  },
  {
    year: '2025',
    season: 'Winter',
    competition: "Men's",
    team: '21FC',
    image: '/history/2025-winter-mens-21fc.webp',
  },
  {
    year: '2024',
    season: 'Winter',
    competition: 'Tournament',
    team: 'Mickey Mouse',
    image: '/history/2024-winter-tournament-mickey-mouse.webp',
  },
  {
    year: '2023',
    season: 'Fall',
    competition: 'Futsal',
    team: 'Gran Combo',
    image: '/history/2023-fall-futsal-gran-combo.webp',
  },
  {
    year: '2023',
    season: 'Summer',
    competition: 'League',
    team: 'Gran Combo',
    image: '/history/2023-summer-gran-combo.webp',
  },
  {
    year: '2023',
    season: 'Winter',
    competition: 'League',
    team: 'Los Galacticos',
    image: '/history/2023-winter-los-galacticos.webp',
  },
];

export default function HistoryPage() {
  return (
    <main className="historyPage">
      <header className="historyPageNav">
        <a href="/" className="historyBack">
          <ArrowLeft size={17} />
          ALL IN SPORTS
        </a>

        <img src="/all-in-logo.svg" alt="All In Sports" />
      </header>

      <section className="historyHero">
        <div className="historyHeroGlow" />

        <div className="historyHeroContent">
          <p className="eyebrow">ALL IN ARCHIVE // 2023—2026</p>

          <h1>
            BUILT BY THE
            <br />
            <span>CHAMPIONS.</span>
          </h1>

          <p className="historyHeroCopy">
            Every season leaves a mark. The teams, the moments and the
            championships that built All In Sports.
          </p>

          <div className="historyCount">
            <Trophy size={18} />
            <strong>{champions.length}</strong>
            <span>CHAMPIONSHIPS RECOVERED</span>
          </div>
        </div>
      </section>

      <section className="historyArchive">
        <div className="historyArchiveHeader">
          <div>
            <p className="eyebrow">THE ARCHIVE</p>
            <h2>ALL IN HISTORY</h2>
          </div>

          <p>
            More seasons and championship moments will be added as the
            All In archive continues to grow.
          </p>
        </div>

        <div className="historyArchiveGrid">
          {champions.map((champion, index) => (
            <article
              className="historyArchiveCard"
              key={`${champion.year}-${champion.season}-${champion.team}`}
            >
              <div className="historyArchiveImage">
                <img
                  src={champion.image}
                  alt={`${champion.team} ${champion.year} champions`}
                />

                <div className="historyArchiveShade" />

                <span className="historyArchiveNumber">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="historyArchiveYear">{champion.year}</span>
              </div>

              <div className="historyArchiveInfo">
                <div>
                  <span>
                    {champion.season} • {champion.competition}
                  </span>
                  <h3>{champion.team}</h3>
                </div>

                <Trophy size={21} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="historyPageFooter">
        <img src="/all-in-logo.svg" alt="All In Sports" />
        <p>North Jersey • Play. Compete. Connect.</p>
      </footer>
    </main>
  );
}
