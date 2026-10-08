
import { ArrowLeft, Heart } from "lucide-react";

export default function WhyWePlayPage() {
  return (
    <main className="carmitaPage">
      <div className="carmitaStandalonePage">
        <a href="/play-for-carmita" className="carmitaBack">
          <ArrowLeft size={18} />
          BACK TO PLAY FOR CARMITA
        </a>

        <section className="carmitaStory">
          <div className="carmitaContent">
            <div className="carmitaStoryHeading">
              <div>
                <p className="eyebrow">
                  <Heart size={16} /> WHY WE PLAY
                </p>
                <h2>
                  20 YEARS LATER.
                  <br />
                  <span>STILL ALL IN.</span>
                </h2>
              </div>

              <div className="carmitaStoryText">
                <p>
                  It&apos;s been 20 years since we lost our mom to a
                  brain aneurysm. She was our biggest supporter, our
                  constant source of love, and a huge part of the
                  people we became.
                </p>

                <p>
                  Play for Carmita is our way of bringing family,
                  friends and community together through a game that
                  has always meant so much to us — while raising
                  awareness and helping support families affected
                  by brain aneurysms.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
