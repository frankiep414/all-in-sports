import Image from "next/image";
import Link from "next/link";

export default function PlayForCarmitaPage() {
  return (
    <main className="min-h-screen bg-[#07070a] text-white">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* subtle background glow */}
        <div className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-purple-700/15 blur-[130px]" />
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[150px]" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10">

          {/* LEFT */}
          <div className="max-w-2xl">
            <Image
              src="/ALL-IN-Firefly-LAST-new-logo-9x16.png"
              alt="All In Sports"
              width={180}
              height={90}
              priority
              className="mb-10 h-auto w-[145px] object-contain"
            />

            <p className="mb-5 text-xs font-bold uppercase tracking-[0.35em] text-purple-400 sm:text-sm">
              All In Sports Presents
            </p>

            <h1 className="text-[56px] font-black uppercase leading-[0.86] tracking-[-0.055em] sm:text-[76px] lg:text-[92px]">
              Play For
              <span className="block bg-gradient-to-r from-purple-400 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
                Carmita
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed text-zinc-300 sm:text-xl">
              A charity soccer tournament in honor of our mom.
            </p>

            {/* EVENT QUICK INFO */}
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold uppercase tracking-[0.08em] text-zinc-300">
              <span>Nov 1</span>
              <span className="text-purple-500">•</span>
              <span>11 AM – 4 PM</span>
              <span className="text-purple-500">•</span>
              <span>Coed 7v7</span>
              <span className="text-purple-500">•</span>
              <span>New Jersey</span>
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#register"
                className="rounded-full bg-white px-7 py-4 text-center text-sm font-black uppercase tracking-[0.08em] text-black transition hover:scale-[1.02] hover:bg-zinc-200"
              >
                Register a Team · $250
              </a>

              <a
                href="#register"
                className="rounded-full border border-white/20 bg-white/[0.04] px-7 py-4 text-center text-sm font-black uppercase tracking-[0.08em] text-white transition hover:border-purple-400 hover:bg-purple-500/10"
              >
                Register as a Player · $25
              </a>
            </div>
          </div>

          {/* RIGHT — ORIGINAL PHOTO */}
          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-purple-600/20 to-orange-500/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-zinc-900 shadow-2xl">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="/mom and chris_frank.jpg"
                  alt="Carmita with her sons"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 45vw"
                  className="object-cover object-center"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                <div className="absolute bottom-5 left-5">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                    Why We Play
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    For Mom.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PURPOSE */}
      <section className="bg-[#0b0b0f] px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_.85fr] lg:items-center">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-purple-400">
              Why We Play
            </p>

            <h2 className="mt-5 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              20 years later,
              <span className="block text-zinc-500">
                her impact is still with us.
              </span>
            </h2>

            <div className="mt-7 max-w-2xl space-y-5 text-base leading-7 text-zinc-400 sm:text-lg">
              <p>
                It&apos;s been 20 years since we lost our mom to a brain
                aneurysm. She was our biggest supporter, our constant source
                of love, and a huge part of the people we became.
              </p>

              <p>
                Play for Carmita is our way of bringing family, friends and
                community together through a game that has always meant so
                much to us — while raising awareness and helping support other
                families affected by brain aneurysms.
              </p>
            </div>
          </div>

          {/* FOUNDATION */}
          <div className="rounded-[28px] border border-white/10 bg-white p-7 sm:p-9">
            <p className="mb-6 text-center text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Playing For A Bigger Purpose
            </p>

            <Image
              src="/Brain-Aneurysm-Foundation-logo-featured.jpg"
              alt="Brain Aneurysm Foundation"
              width={700}
              height={280}
              className="mx-auto h-auto max-h-[125px] w-auto max-w-full object-contain"
            />

            <div className="mt-7 border-t border-zinc-200 pt-6 text-center">
              <p className="text-lg font-black leading-snug text-zinc-900">
                Proceeds will be donated to the
                <br />
                Brain Aneurysm Foundation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EVENT */}
      <section className="border-y border-white/10 bg-[#07070a] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-6xl">

          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-purple-400">
              The Event
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Soccer. Family. Community.
            </h2>
          </div>

          <div className="grid overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] md:grid-cols-3">

            <div className="p-7 md:border-r md:border-white/10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Date & Time
              </p>

              <p className="mt-4 text-2xl font-black">
                Sunday, November 1
              </p>

              <p className="mt-1 text-zinc-400">
                11:00 AM – 4:00 PM
              </p>
            </div>

            <div className="border-t border-white/10 p-7 md:border-r md:border-t-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Tournament
              </p>

              <p className="mt-4 text-2xl font-black">
                COED · 7v7
              </p>

              <p className="mt-1 text-zinc-400">
                Team & individual registration
              </p>
            </div>

            <div className="border-t border-white/10 p-7 md:border-t-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Location
              </p>

              <p className="mt-4 text-2xl font-black">
                Coming Soon
              </p>

              <p className="mt-1 text-zinc-400">
                Harrison / Jersey City, NJ
              </p>
            </div>
          </div>

          {/* WHAT'S INCLUDED */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Charity Tournament"],
              ["02", "Kids & Family Activities"],
              ["03", "Halloween Costume Contest"],
              ["04", "Championship Prizes"],
            ].map(([number, title]) => (
              <div
                key={number}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-purple-500/40"
              >
                <p className="text-xs font-black text-purple-400">
                  {number}
                </p>

                <p className="mt-8 text-lg font-bold leading-tight">
                  {title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REGISTRATION */}
      <section
        id="register"
        className="relative overflow-hidden bg-[#0b0b0f] px-6 py-24 lg:px-10"
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-purple-400">
            Join Us
          </p>

          <h2 className="mt-5 text-5xl font-black tracking-tight sm:text-6xl">
            Play for something bigger.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-zinc-400">
            Build your team or sign up individually. Individual players will
            be placed on a team.
          </p>

          <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">

            <button
              type="button"
              className="group rounded-[24px] border border-purple-500/30 bg-purple-600/10 p-7 text-left transition hover:-translate-y-1 hover:border-purple-400 hover:bg-purple-600/15"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                Register a Team
              </p>

              <div className="mt-8 flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black">$250</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    per team
                  </p>
                </div>

                <span className="text-2xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </button>

            <button
              type="button"
              className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-7 text-left transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Register Individually
              </p>

              <div className="mt-8 flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black">$25</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    per player
                  </p>
                </div>

                <span className="text-2xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </button>
          </div>

          <p className="mt-12 text-sm font-black uppercase tracking-[0.2em] text-zinc-600">
            Same Game. Bigger Purpose.
          </p>
        </div>
      </section>

      {/* BACK TO ALL IN */}
      <footer className="border-t border-white/10 bg-black px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-zinc-600">
            Play for Carmita · All In Sports
          </p>

          <Link
            href="/"
            className="text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            Back to All In Sports →
          </Link>
        </div>
      </footer>

    </main>
  );
}
