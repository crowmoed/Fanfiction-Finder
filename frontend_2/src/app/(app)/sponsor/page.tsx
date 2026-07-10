"use client";

/**
 * /sponsor — the combined "Add your fandom" page: the community vote board on
 * top (VoteBoard), the request form below. Replaces the separate /vote page
 * (which now redirects here) so the sidebar carries ONE entry for both.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/client/api";
import { useFandoms } from "@/lib/client/useFandoms";
import { ALL_FANDOMS } from "@/lib/contracts";
import { Icon } from "@/components/Icon";
import { VoteBoard } from "@/components/VoteBoard";
import "./sponsor.css";

export default function AddFandomPage() {
  const router = useRouter();
  const { fandoms } = useFandoms();

  const [fandom, setFandom] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // If the typed fandom is already indexed, point them at search instead.
  const alreadyIndexed = useMemo(() => {
    const q = fandom.trim().toLowerCase();
    if (!q) return null;
    return (
      fandoms.find(
        (f) => f.collected && f.name !== ALL_FANDOMS && f.name.toLowerCase() === q
      ) ?? null
    );
  }, [fandom, fandoms]);

  const canSubmit = fandom.trim().length > 0 && !busy && !alreadyIndexed;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await api.requestFandom({
        fandom_name: fandom.trim(),
        notes: notes.trim(),
        email: email.trim(),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sponsor-page stack">
      <header className="stack sponsor-head">
        <p className="eyebrow">Community</p>
        <h1 className="t-display-hero sponsor-title">Add your fandom.</h1>
        <p className="muted sponsor-lede">
          Vote the next fandom into the index, or request one that isn&apos;t on
          the ballot.
        </p>
      </header>

      <section className="stack sponsor-section" aria-labelledby="vote-h">
        <div className="sponsor-section-head">
          <h2 id="vote-h" className="sponsor-section-h">
            Vote
          </h2>
          <p className="muted sponsor-section-lede">
            Four fandoms, one vote each. The winner gets indexed next.
          </p>
        </div>
        <VoteBoard />
      </section>

      <section className="stack sponsor-section" aria-labelledby="request-h">
        <div className="sponsor-section-head">
          <h2 id="request-h" className="sponsor-section-h">
            Request
          </h2>
          <p className="muted sponsor-section-lede">
            Don&apos;t see your fandom on the ballot? Ask for it. If it&apos;s a
            good fit I&apos;ll index it and it becomes searchable for everyone.
          </p>
        </div>

        {sent ? (
          <div className="alert" data-tone="info">
            <Icon name="check" size={18} />
            <div>
              <p className="alert-title">Request sent. Thank you!</p>
              <p>
                I&apos;ll take a look and email you if/when it&apos;s added. You
                can request another anytime.
              </p>
            </div>
          </div>
        ) : (
          <div className="card stack sponsor-card">
            <label className="sponsor-field">
              <span className="sponsor-label">Fandom</span>
              <input
                className="sponsor-input"
                type="text"
                placeholder="e.g. Bleach, The Locked Tomb, Baldur's Gate 3…"
                value={fandom}
                onChange={(e) => setFandom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                disabled={busy}
              />
            </label>

            <label className="sponsor-field">
              <span className="sponsor-label">
                Your email{" "}
                <span className="muted">
                  (optional, so I can tell you when it&apos;s added)
                </span>
              </span>
              <input
                className="sponsor-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>

            <label className="sponsor-field">
              <span className="sponsor-label">
                Notes{" "}
                <span className="muted">
                  (optional: where to find it, ships, anything)
                </span>
              </span>
              <textarea
                className="sponsor-textarea"
                placeholder="e.g. the AO3 tag, which ships you want, anything that helps"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={busy}
              />
            </label>

            {alreadyIndexed && (
              <div className="alert" data-tone="info">
                <Icon name="check" size={18} />
                <div>
                  <p className="alert-title">
                    &ldquo;{alreadyIndexed.name}&rdquo; is already searchable.
                  </p>
                  <p>
                    No need to request it:{" "}
                    <button
                      type="button"
                      className="sponsor-link"
                      onClick={() => router.push("/")}
                    >
                      search it now
                    </button>
                    .
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="alert" data-tone="danger">
                <Icon name="alert" size={18} />
                <p>{error}</p>
              </div>
            )}

            <div className="row sponsor-actions">
              <button className="btn-primary" disabled={!canSubmit} onClick={submit}>
                {busy ? (
                  <>
                    <Icon name="spinner" size={13} /> Sending…
                  </>
                ) : (
                  "Send request"
                )}
              </button>
              <span className="muted sponsor-price-note">I read every request</span>
            </div>
          </div>
        )}

        <ol className="sponsor-how">
          <li>
            <strong>You ask:</strong> name the fandom (and drop your email for a
            heads-up).
          </li>
          <li>
            <strong>I take a look:</strong> if it&apos;s indexable across
            AO3/FFN/Wattpad, I&apos;ll add it.
          </li>
          <li>
            <strong>I index it:</strong> scraping + vectorizing takes a bit;
            usually a few days.
          </li>
          <li>
            <strong>It&apos;s searchable for everyone:</strong> added to the
            shared library for good.
          </li>
        </ol>
      </section>
    </div>
  );
}
