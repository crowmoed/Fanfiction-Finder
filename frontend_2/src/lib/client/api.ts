"use client";

/**
 * api.ts — the browser's typed client for THIS app's own /api/* routes.
 *
 * The browser never calls the backend directly; it calls these same-origin Next
 * routes, which proxy to the backend. This module centralizes that fetch: it
 * attaches the stored JWT, parses JSON, and normalizes errors into ApiError.
 */

import type {
  FandomsResponse,
  LoginResponse,
  User,
  VoteState,
} from "@/lib/contracts";
import { getToken } from "@/lib/client/token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(0, "Network error: could not reach the server.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    let requestId: string | undefined;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
      if (body?.request_id) requestId = body.request_id;
    } catch {
      /* keep generic detail */
    }
    throw new ApiError(res.status, detail, requestId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  fandoms: () => call<FandomsResponse>("/api/fandoms"),
  login: (idToken: string) =>
    call<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }),
  me: () => call<User>("/api/auth/me"),
  /**
   * Free "request a fandom" — records the request and emails the operator.
   * Anonymous; no payment.
   */
  requestFandom: (body: { fandom_name: string; notes?: string; email?: string }) =>
    call<{ ok: boolean }>("/api/sponsor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** The free community vote: current ballot + tallies (+ your pick if signed in). */
  getVote: () => call<VoteState>("/api/vote"),
  /** Cast/change your one vote. Requires sign-in (401 otherwise). */
  castVote: (fandom: string) =>
    call<VoteState>("/api/vote", {
      method: "POST",
      body: JSON.stringify({ fandom }),
    }),
};
