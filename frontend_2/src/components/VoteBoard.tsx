"use client";

/**
 * VoteBoard — the community ballot, extracted from the old /vote page so it
 * can live as a section of /sponsor (the combined "Add your fandom" page).
 * Owns its own load/vote state; the page provides the heading around it.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { clearTokenIfUnauthorized } from "@/lib/client/token";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { Icon } from "@/components/Icon";
import type { VoteState } from "@/lib/contracts";
import "./vote.css";

export function VoteBoard() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  const [state, setState] = useState<VoteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // fandom currently being voted

  // Latest-request-wins guard: signing in triggers a reload while a vote POST may
  // still be in flight — without this, a slow GET can resolve last and clobber the
  // fresh post-vote state with a stale pre-vote snapshot.
  const reqSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    setError(null);
    try {
      const s = await api.getVote();
      if (seq === reqSeq.current) setState(s);
    } catch (e) {
      if (seq === reqSeq.current)
        setError(e instanceof ApiError ? e.message : "Couldn't load the vote.");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, []);

  // Load on mount, and re-load once auth resolves so `your_vote` appears after sign-in.
  useEffect(() => {
    void load();
  }, [load, signedIn]);

  const vote = async (fandom: string) => {
    if (!signedIn || busy) return;
    setBusy(fandom);
    setError(null);
    const seq = ++reqSeq.current;
    try {
      const s = await api.castVote(fandom);
      if (seq === reqSeq.current) setState(s);
    } catch (e) {
      if (e instanceof ApiError) clearTokenIfUnauthorized(e.status);
      if (seq === reqSeq.current)
        setError(e instanceof ApiError ? e.message : "Couldn't record your vote.");
      // The ballot was reset under us (400 = fandom no longer on the ballot):
      // refetch the new round so the page recovers without a manual reload.
      if (e instanceof ApiError && e.status === 400) void load();
    } finally {
      setBusy(null);
    }
  };

  const total = state?.total ?? 0;

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      {!signedIn && status !== "loading" && (
        <div className="card stack vote-signin">
          <p className="muted" style={{ margin: 0 }}>
            Sign in to cast your vote. One vote each.
          </p>
          <GoogleSignIn />
        </div>
      )}

      {error && (
        <div className="alert" data-tone="danger">
          <Icon name="alert" size={18} />
          <p>{error}</p>
        </div>
      )}

      {loading && !state ? (
        <p className="muted">Loading the ballot…</p>
      ) : state ? (
        <div className="stack vote-options">
          {state.fandoms.map((f) => {
            const count = state.tallies[f] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const mine = state.your_vote === f;
            return (
              <button
                key={f}
                type="button"
                className={`vote-option${mine ? " vote-option--mine" : ""}`}
                onClick={() => vote(f)}
                disabled={!signedIn || busy !== null}
                aria-pressed={mine}
                title={signedIn ? "Vote for this fandom" : "Sign in to vote"}
              >
                <span className="vote-bar" style={{ width: `${pct}%` }} aria-hidden />
                <span className="vote-option-row">
                  <span className="vote-option-name">
                    {mine && <Icon name="check" size={15} />}
                    {f}
                  </span>
                  <span className="vote-option-count">
                    {busy === f ? "…" : `${count} ${count === 1 ? "vote" : "votes"}`}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="muted vote-total">
            {total} {total === 1 ? "vote" : "votes"} so far
            {state.your_vote ? " · change your vote anytime" : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
