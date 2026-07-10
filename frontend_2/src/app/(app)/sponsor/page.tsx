"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/client/api";
import { useFandoms } from "@/lib/client/useFandoms";
import { ALL_FANDOMS } from "@/lib/contracts";
import { Icon } from "@/components/Icon";
import "./sponsor.css";

/** Only follow a checkout redirect to Stripe's own https domains (open-redirect defense). */
function isStripeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      (u.hostname === "stripe.com" || u.hostname.endsWith(".stripe.com"))
    );
  } catch {
    return false;
  }
}

function SponsorForm() {
  const params = useSearchParams();
  const router = useRouter();
  const outcome = params.get("sponsor"); // "success" | "cancelled" | null
  const { fandoms } = useFandoms();

  const [fandom, setFandom] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the buyer types a fandom that's already indexed, don't take their money —
  // point them at search instead.
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
      const { url } = await api.sponsorFandom({
        fandom_name: fandom.trim(),
        notes: notes.trim(),
      });
      if (!isStripeUrl(url)) {
        setError("Got an unexpected checkout redirect. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="sponsor-page stack">
      <header className="stack sponsor-head">
        <p className="eyebrow">Support · one-time</p>
        <h1 className="t-display-hero sponsor-title">Sponsor a fandom.</h1>
        <p className="muted sponsor-lede">
          Don&apos;t see your fandom? Pay once and I&apos;ll vectorize it into Ficwell&apos;s
          search — then it&apos;s searchable for everyone, for good.
        </p>
      </header>

      {outcome === "success" && (
        <div className="alert" data-tone="info">
          <Icon name="check" size={18} />
          <div>
            <p className="alert-title">Payment received — thank you!</p>
            <p>
              I&apos;ll email you to confirm the exact fandom, then index it. It usually
              goes live within a few days.
            </p>
          </div>
        </div>
      )}
      {outcome === "cancelled" && (
        <div className="alert" data-tone="warn">
          <Icon name="info" size={18} />
          <p>Checkout cancelled — nothing was charged. You can try again below.</p>
        </div>
      )}

      <div className="card stack sponsor-card">
        <label className="sponsor-field">
          <span className="sponsor-label">Fandom</span>
          <input
            className="sponsor-input"
            type="text"
            placeholder="e.g. Bleach, The Locked Tomb, Baldur&apos;s Gate 3…"
            value={fandom}
            onChange={(e) => setFandom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            disabled={busy}
            autoFocus
          />
        </label>

        <label className="sponsor-field">
          <span className="sponsor-label">
            Notes <span className="muted">(optional — where to find it, ships, anything)</span>
          </span>
          <textarea
            className="sponsor-textarea"
            placeholder="e.g. the AO3 tag is “Bleach (Anime &amp; Manga)”; mostly the IchiRuki side"
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
              <p className="alert-title">“{alreadyIndexed.name}” is already searchable.</p>
              <p>
                No need to sponsor it —{" "}
                <button type="button" className="sponsor-link" onClick={() => router.push("/")}>
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
                <Icon name="spinner" size={13} /> Redirecting…
              </>
            ) : (
              "Sponsor for $20"
            )}
          </button>
          <span className="muted sponsor-price-note">One-time · secure checkout via Stripe</span>
        </div>
      </div>

      <ol className="sponsor-how">
        <li>
          <strong>You pay $20</strong> — Stripe collects your email; no account needed.
        </li>
        <li>
          <strong>I confirm by email</strong> — a quick “this exact fandom?” before I start.
        </li>
        <li>
          <strong>I index it</strong> — scraping + vectorizing takes a bit; usually live in a few days.
        </li>
        <li>
          <strong>It&apos;s searchable for everyone</strong> — added to the shared library for good.
        </li>
      </ol>
    </div>
  );
}

export default function SponsorPage() {
  // useSearchParams() (read from ?sponsor=) must sit under a Suspense boundary or
  // the whole route bails out of static prerender — Next's CSR-bailout rule.
  return (
    <Suspense fallback={<div className="sponsor-page stack" aria-busy="true" />}>
      <SponsorForm />
    </Suspense>
  );
}
