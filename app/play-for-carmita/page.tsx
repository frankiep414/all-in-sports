import Image from "next/image";

export default function PlayForCarmitaPage() {
  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-20">
          
          {/* ORIGINAL FAMILY PHOTO */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-br from-purple-600/40 via-transparent to-orange-500/30 blur-xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
              <Image
                src="/mom and chris_frank.jpg"
                alt="Carmita with her sons"
                width={900}
                height={900}
                priority
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-purple-500/20 bg-white/[0.04] p-5 text-sm leading-6 text-zinc-300 sm:text-base">
              It&apos;s been 20 years since we lost our mom to a brain
              aneurysm. This event brings our community together to celebrate
              her, support families, and raise awareness for brain aneurysm
              education, research, and prevention.
            </div>
          </div>

          {/* TITLE / PURPOSE */}
          <div>
            <Image
              src="/ALL-IN-Firefly-LAST-new-logo-9x16.png"
              alt="All In Sports"
              width={240}
              height={100}
              className="mb-8 h-auto w-[190px] object-contain sm:w-[230px]"
            />

            <p className="mb-3 text-sm font-black uppercase tracking-[0.32em] text-purple-400">
              All In Sports Presents
            </p>

            <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-tight sm:text-7xl lg:text-8xl">
              Play for
              <span className="mt-2 block bg-gradient-to-r from-purple-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
                Carmita
              </span>
            </h1>

            <p className="mt-7 text-xl font-bold uppercase tracking-[0.12em] text-zinc-100 sm:text-2xl">
              A Charity Soccer Tournament
              <span className="mt-1 block text-zinc-400">
                In Honor of Our Mom
              </span>
            </p>

            {/* FOUNDATION */}
            <div className="mt-8 rounded-3xl bg-white p-6 text-zinc-900 shadow-xl">
              <Image
                src="/Brain-Aneurysm-Foundation-logo-featured.jpg"
                alt="Brain Aneurysm Foundation"
                width={700}
                height={300}
                className="mx-auto h-auto max-h-[135px] w-auto max-w-full object-contain"
              />

              <div className="mt-5 border-t border-zinc-200 pt-5 text-center">
                <p className="text-xl font-black uppercase leading-tight text-purple-800 sm:text-2xl">
                  Proceeds will be donated to the
                  <br />
                  Brain Aneurysm Foundation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVENT HIGHLIGHTS */}
      <section className="border-y border-white/10 bg-[#090a10]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 py-10 md:grid-cols-4 md:px-8">
          {[
            ["⚽", "Charity Soccer Tournament", "Competitive & recreational teams"],
            ["👨‍👩‍👧", "Kids & Family Activities", "Games, fun zones & more"],
            ["🎃", "Halloween Costume Contest", "For kids & adults"],
            ["🏆", "Prizes for Winning Teams", "Championship awards"],
          ].map(([icon, title, description], index) => (
            <div
              key={title}
              className={`px-4 py-6 text-center ${
                index !== 0 ? "md:border-l md:border-purple-500/30" : ""
              }`}
            >
              <div className="mb-4 text-5xl">{icon}</div>

              <h2 className="text-lg font-black uppercase leading-tight sm:text-xl">
                {title}
              </h2>

              <p className="mt-2 text-sm text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVENT INFORMATION */}
      <section className="bg-[#f6f3ef] text-zinc-950">
        <div className="mx-auto grid max-w-7xl md:grid-cols-3">
          
          <div className="p-8 text-center md:border-r md:border-zinc-300">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-purple-700">
              When
            </p>

            <h2 className="mt-3 text-3xl font-black uppercase">
              Sunday
            </h2>

            <p className="text-4xl font-black uppercase text-purple-800">
              November 1
            </p>

            <p className="mt-2 text-xl font-bold">
              11:00 AM – 4:00 PM
            </p>
          </div>

          <div className="p-8 text-center md:border-r md:border-zinc-300">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-purple-700">
              Tournament
            </p>

            <h2 className="mt-4 text-4xl font-black">
              COED • 7v7
            </h2>

            <div className="mt-5 flex justify-center gap-10">
              <div>
                <p className="text-4xl font-black text-amber-500">$250</p>
                <p className="text-xs font-black uppercase tracking-wider">
                  Per Team
                </p>
              </div>

              <div className="border-l border-zinc-300 pl-10">
                <p className="text-4xl font-black text-sky-600">$25</p>
                <p className="text-xs font-black uppercase tracking-wider">
                  Per Player
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-purple-700">
              Where
            </p>

            <h2 className="mt-4 text-3xl font-black uppercase">
              Location TBD
            </h2>

            <p className="mt-3 font-bold text-purple-800">
              Harrison, NJ • Jersey City, NJ
            </p>
          </div>
        </div>
      </section>

      {/* REGISTRATION */}
      <section className="relative overflow-hidden bg-[#07080d] px-6 py-16">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-700/20 blur-[100px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-purple-400">
            Registration
          </p>

          <h2 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
            Choose How You Want to Play
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Register your full squad or sign up individually and we&apos;ll
            place you on a team.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <a
              href="#team-registration"
              className="group rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-700/30 to-purple-950/30 p-8 transition hover:-translate-y-1 hover:border-purple-400"
            >
              <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
                Team Registration
              </p>

              <p className="mt-3 text-5xl font-black">$250</p>
              <p className="mt-1 text-zinc-400">per team</p>

              <div className="mt-7 rounded-xl bg-purple-600 px-5 py-4 font-black uppercase tracking-wide text-white">
                Register a Team →
              </div>
            </a>

            <a
              href="#individual-registration"
              className="group rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-700/20 to-slate-950 p-8 transition hover:-translate-y-1 hover:border-sky-400"
            >
              <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">
                Individual Registration
              </p>

              <p className="mt-3 text-5xl font-black">$25</p>
              <p className="mt-1 text-zinc-400">per player</p>

              <div className="mt-7 rounded-xl bg-sky-600 px-5 py-4 font-black uppercase tracking-wide text-white">
                Register as a Player →
              </div>
            </a>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            Individual players will be placed on a team.
          </p>
        </div>
      </section>

      {/* CLOSING */}
      <section className="border-t border-white/10 bg-black px-6 py-12 text-center">
        <p className="text-3xl font-black uppercase italic sm:text-4xl">
          Same Game.
          <span className="text-purple-500"> Bigger Purpose.</span>
        </p>

        <p className="mt-3 text-zinc-500">
          Play for Carmita • Presented by All In Sports
        </p>
      </section>
    </main>
  );
}
