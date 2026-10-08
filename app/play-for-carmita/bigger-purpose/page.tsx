
import Link from "next/link";

export default function BiggerPurposePage() {
  return (
    <main className="carmitaPurposePage">
      <div className="carmitaPurposeInner">
        <Link
          href="/play-for-carmita"
          className="carmitaPurposeBack"
        >
          ← BACK TO PLAY FOR CARMITA
        </Link>

        <p className="carmitaPurposeEyebrow">
          PLAYING FOR A BIGGER PURPOSE
        </p>

        <h1>
          MORE THAN A GAME.
          <span> MORE THAN A MEMORY.</span>
        </h1>

        <p className="carmitaPurposeLead">
          Play for Carmita honors our mom and helps raise
          awareness about brain aneurysms. Proceeds from
          the event will be donated to the Brain Aneurysm
          Foundation.
        </p>

        <div className="carmitaPurposeFoundation">
          <img
            src="/Brain-Aneurysm-Foundation-logo-featured.jpg"
            alt="Brain Aneurysm Foundation"
          />
          <div>
            <h2>WHY WE SUPPORT THE FOUNDATION</h2>
            <p>
              Through education, awareness, research, and
              support for those affected, the Brain Aneurysm
              Foundation works to make a difference for
              patients and families.
            </p>
          </div>
        </div>

        <h2 className="carmitaPurposeSectionTitle">
          KNOW THE SIGNS. SPREAD AWARENESS.
        </h2>

        <div className="carmitaPurposeGrid">
          <article>
            <span>01 / UNDERSTAND</span>
            <h3>WHAT IS A BRAIN ANEURYSM?</h3>
            <p>
              A brain aneurysm is a weakened area in the
              wall of a blood vessel in the brain that
              bulges outward. Many never cause symptoms,
              but a rupture can cause life-threatening
              bleeding in the brain.
            </p>
          </article>

          <article>
            <span>02 / RECOGNIZE</span>
            <h3>KNOW THE WARNING SIGNS</h3>
            <p>
              A sudden, extremely severe headache may
              indicate a ruptured aneurysm. Other symptoms
              can include vomiting, neck stiffness, vision
              changes, confusion, or loss of consciousness.
            </p>
            <p className="carmitaPurposeEmergency">
              If a rupture is suspected, call 911 immediately.
            </p>
          </article>

          <article>
            <span>03 / MAKE AN IMPACT</span>
            <h3>WHY AWARENESS MATTERS</h3>
            <p>
              Brain aneurysms can affect individuals and
              families without warning. Learning the signs,
              sharing information, and supporting research
              can make a meaningful difference.
            </p>
          </article>
        </div>

        <div className="carmitaPurposeActions">
          <a
            href="https://www.bafound.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            VISIT THE BRAIN ANEURYSM FOUNDATION ↗
          </a>
          <Link href="/play-for-carmita">
            ← RETURN TO THE EVENT
          </Link>
        </div>
      </div>
    </main>
  );
}
