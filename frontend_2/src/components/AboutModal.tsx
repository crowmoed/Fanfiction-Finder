"use client";

/**
 * AboutModal — the sidebar "?" popup: what Ficwell is, how a search actually
 * works, and who runs it. Deliberately NOT the first-run guide (WelcomeGuide);
 * this one is always reachable and reads as a short letter from the maker —
 * section labels in the tool's sans, the prose itself in the reading serif.
 */
import { Modal } from "@/components/Modal";
import "./guide.css";

export function AboutModal({
  open,
  onClose,
  onOpenGuide,
}: {
  open: boolean;
  onClose: () => void;
  /** Swaps this popup for the how-it-works guide (AppShell wires the two). */
  onOpenGuide: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="About Ficwell"
      variant="guide"
      width="520px"
    >
      <div className="about">
        <section className="about-section">
          <h3 className="about-h">What this is</h3>
          <p>
            Ficwell is a search engine for fanfiction. You describe the fic you
            want in plain language, and it searches AO3, FFN, and Wattpad at
            once.
          </p>
        </section>

        <section className="about-section">
          <h3 className="about-h">How it works</h3>
          <p>
            Searches match on meaning. A language model reads your request,
            compares it against the whole index, and scores the results 0 to
            100 against what you actually asked for. That score is the
            vermilion seal you see on results. The index is built ahead of
            time, so searches come back in seconds, and new fics show up when I
            re-run the indexer.
          </p>
        </section>

        <section className="about-section">
          <h3 className="about-h">Who&rsquo;s behind it</h3>
          <p>
            Just me, Cristiano. Ficwell is a passion project: I got tired of
            hunting for stories I liked, especially since tag search never
            worked well enough and would even cut certain fics out of my
            results. It&rsquo;s free. If your fandom is missing, request it
            from the sidebar and I&rsquo;ll look into adding it.
          </p>
        </section>

        <div className="about-foot">
          <button type="button" className="btn" onClick={onOpenGuide}>
            Open the guide
          </button>
        </div>
      </div>
    </Modal>
  );
}
