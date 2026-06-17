# TASK 02 — LLM Pipeline & Denial-of-Wallet (audit → fix → verify, one run)
Work ONLY within scope. Leave changes staged, do not commit.

<scope>
Query enhancer, reranker, embed_query, any Bedrock call site; the rate-limit
layer; the search endpoint(s). Pin paths: [fill in]
</scope>

## Step 1 — AUDIT (read-only)
1. Denial-of-wallet: hard max_tokens on EVERY Bedrock call? (table: call site
   + cap/ABSENT). Rate limiting request-count only or token/cost-aware? Per-
   user/tier daily/monthly ceiling checked BEFORE invoke? Free-tier counter
   (2/wk, Monday reset) server-side and atomic, or racy?
2. Prompt injection: user query into enhancer/reranker prompts — untrusted
   input delimited from instructions? Indexed fic content (titles/tags/
   summaries) into reranker treated as untrusted (indirect injection)? Any
   LLM output used to build SQL / control flow / returned raw?
3. Any secret/key/credential inside a prompt?
Write to `findings/LLM-findings.md`: IDs LLM-1..n + the call-site/max_tokens
table.

## Step 2 — FIX (Medium+)
- Direct-fix in scope: add hard max_tokens to every call site; delimit
  untrusted input/content in prompts; stop using LLM output to build SQL
  (parameterize) or return it unsanitized; remove any secret from prompts.
- Behavior-changing → `NEEDS-DECISION`, skip: the actual rate-limit numbers,
  tier ceilings, free-tier quota values (you set these), and any switch from
  request-count to token-based limiting that changes the limit semantics —
  propose the mechanism, let the human set thresholds.
- The CloudWatch/Budgets backstop is AWS config → PROPOSE-ONLY (see Step 3),
  do not implement as code.
- Update findings file: each LLM-# → FIXED / SKIPPED-NEEDS-DECISION.

## Step 3 — VERIFY + AWS backstop (propose-only)
- Re-check fixed call sites for max_tokens + prompt delimiting.
- Output (do NOT execute) exact Windows CMD AWS CLI commands to: create a
  CloudWatch alarm on AWS/Bedrock InputTokenCount/OutputTokenCount/Invocations
  -> SNS, and an AWS Budgets action applying a Deny on bedrock:InvokeModel at a
  hard cap. Write these into `findings/LLM-findings.md` under "AWS backstop
  commands".

## Step 4 — REPORT
Files changed, per-ID status, staged diff, and the proposed AWS commands. Do
not commit.
