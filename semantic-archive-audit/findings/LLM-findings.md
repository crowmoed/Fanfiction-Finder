# LLM Findings & Fix Log
Run: 2026-06-13 · Task: tasks/02-llm.md

| ID | file:line | Severity | Finding | Fix direction | Status |
|----|-----------|----------|---------|---------------|--------|
| LLM-1 | backend/auth/dependencies.py:34 `check_search_limit` | High | The per-user search gate is a **no-op** ("disabled during beta") — every authed user gets unlimited searches. Each `/search` fans out to 1 enhancer + 4 embed + N ranker Bedrock/Gemini calls with no pre-invoke ceiling. The free-tier counter increments but nothing reads it → denial-of-wallet. | Re-enabling the gate / picking quota numbers is a deliberate product choice and changes limit semantics. Propose mechanism, human sets thresholds. | SKIPPED-NEEDS-DECISION |
| LLM-2 | backend/api.py:140 `q` Query param | Medium | `q` has **no max length**. A multi-MB query is embedded (Gemini cost) and stuffed into the enhancer prompt (Bedrock input-token cost) — unbounded-input denial-of-wallet. | Add a `max_length` guardrail on `q` (safety cap, not a quota). Chose **1000 chars**. | FIXED |
| LLM-3 | query_enhancer.py:148 / ranker.py:80 | — | Hard `max_tokens` present on BOTH Bedrock calls (enhancer 2048, ranker 8192). Embedder is Gemini (no output-token cost). | None — confirm SAFE. | NO-FIX (SAFE) |
| LLM-4 | backend/ai/query_enhancer.py:152 | Medium | User query interpolated into the enhancer user-message **without delimiting** from instructions → direct prompt injection. Output is parsed as JSON and used only for embeddings/filters (filters are bound params — see SQL domain), so blast radius is limited, but still undelimited untrusted input. | Wrap the user query in explicit delimiters and instruct the model to treat it as data, not instructions. | FIXED |
| LLM-5 | backend/ai/ranker.py:16,73 | Medium | Two untrusted inputs go into the ranker prompt undelimited: (a) the user `query`, and (b) **indexed fic content** (titles/summaries/tags scraped from AO3/FFN/Wattpad — authors control these) → **indirect** prompt injection. A crafted summary could try to force its own score. Output is parsed as JSON `{index,score}` used only for sorting (not SQL/control-flow). | Delimit the user query; mark the fic list as untrusted data; instruct the model to score only on relevance and ignore any instructions embedded in fic text. | FIXED |

## Bedrock / LLM call-site + max_tokens table (audit step 1)
| Call site | Provider/Model | max_tokens | Verdict |
|-----------|----------------|-----------|---------|
| `query_enhancer._invoke_enhancer` (enhancer.py:118) | Bedrock Haiku 4.5 | **2048** | CAPPED |
| `ranker._rank_chunk` (ranker.py:76) | Bedrock Haiku 4.5 | **8192** | CAPPED |
| `embedder._embed_single` (embedder.py:45) | Gemini embedding-001 | n/a | N/A (embeddings — no output-token cost) |
| `embedder._embed_batch` (embedder.py:64) | Gemini embedding-001 | n/a | N/A |

**Rate limiting:** Currently request-count-based and **disabled** (LLM-1). No
token/cost-aware limiting, no per-user/tier daily/monthly ceiling checked before invoke.
**Free-tier counter** (`increment_searches`, user_store.py:99): the get-then-update is
**racy** (TOCTOU between `get_user` and `update_item`) — flagged in OPS/here as a
correctness gap, but since the gate is disabled the counter isn't load-bearing today.

**Secrets in prompts:** None found. System prompts contain no credentials/keys.

**Residual risk note (LLM-4/LLM-5):** delimiting + an "ignore embedded instructions"
directive is a *mitigation*, not a guarantee — a crafted query/summary can still
attempt a `</user_query>` breakout. Because both outputs are parsed as strict JSON and
used only for embeddings/filters (enhancer) or sorting scores (ranker) — never SQL or
control flow — the worst residual impact is degraded relevance / score manipulation,
not code execution or data exfiltration. Output JSON is validated (`EnrichedQuery`
pydantic model / `{index,score}` parse) before use.

## NEEDS-DECISION (behavior-changing — human decides)
- **LLM-1: re-enable the search gate + set quotas.** Mechanism already exists
  (`increment_searches` + `searches_used`/`week_start`, free-tier "2/wk Monday reset"
  per the schema). To re-enable: in `check_search_limit`, compare `searches_used` to a
  tier ceiling and raise 429. YOU set: free-tier weekly quota (code comment implies 2),
  paid-tier ceiling (daily/monthly), and whether to go token/cost-aware vs request-count.
  Also make the counter atomic first (see racy note) before it gates money.
- **LLM-2 cap value (1000 chars)** is a guardrail I chose; sanity-check it fits your
  longest expected natural-language query.

## AWS backstop commands (propose-only, run in Windows CMD)
These create a hard external ceiling on Bedrock spend independent of app logic.
Replace ACCOUNT_ID / SNS topic ARN / budget amount as needed. **Do not run blind** —
the Budgets Deny SCP-style action can block legitimate Bedrock calls once the cap is hit.

```bat
:: 1) SNS topic to receive alarms
aws sns create-topic --name ficfinder-bedrock-alarms --region us-east-1

:: 2) CloudWatch alarm: alert when Bedrock Invocations exceed a threshold in 1h
::    (tune Threshold to your expected peak; this one trips at 5000 invokes/hour)
aws cloudwatch put-metric-alarm ^
  --alarm-name ficfinder-bedrock-invocations-high ^
  --namespace AWS/Bedrock ^
  --metric-name Invocations ^
  --statistic Sum ^
  --period 3600 ^
  --evaluation-periods 1 ^
  --threshold 5000 ^
  --comparison-operator GreaterThanThreshold ^
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:ficfinder-bedrock-alarms ^
  --region us-east-1

:: 3) CloudWatch alarm on OutputTokenCount (the real cost driver)
aws cloudwatch put-metric-alarm ^
  --alarm-name ficfinder-bedrock-output-tokens-high ^
  --namespace AWS/Bedrock ^
  --metric-name OutputTokenCount ^
  --statistic Sum ^
  --period 3600 ^
  --evaluation-periods 1 ^
  --threshold 5000000 ^
  --comparison-operator GreaterThanThreshold ^
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:ficfinder-bedrock-alarms ^
  --region us-east-1

:: 4) AWS Budgets action: apply a Deny on bedrock:InvokeModel at a hard $ cap.
::    Create budget-deny.json and budget-action.json first (templates below), then:
aws budgets create-budget ^
  --account-id ACCOUNT_ID ^
  --budget file://budget-deny.json

aws budgets create-budget-action ^
  --account-id ACCOUNT_ID ^
  --budget-name ficfinder-bedrock-monthly ^
  --cli-input-json file://budget-action.json
```
budget-deny.json (monthly $50 cap — set your own amount):
```json
{
  "BudgetName": "ficfinder-bedrock-monthly",
  "BudgetLimit": { "Amount": "50", "Unit": "USD" },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": { "Service": ["Amazon Bedrock"] }
}
```
budget-action.json (attaches an IAM Deny policy at 100% of the budget):
```json
{
  "NotificationType": "ACTUAL",
  "ActionType": "APPLY_IAM_POLICY",
  "ActionThreshold": { "ActionThresholdValue": 100, "ActionThresholdType": "PERCENTAGE" },
  "Definition": {
    "IamActionDefinition": {
      "PolicyArn": "arn:aws:iam::ACCOUNT_ID:policy/DenyBedrockInvoke",
      "Roles": ["ficfinder-apprunner-instance"]
    }
  },
  "ApprovalModel": "AUTOMATIC",
  "Subscribers": [
    { "SubscriptionType": "SNS", "Address": "arn:aws:sns:us-east-1:ACCOUNT_ID:ficfinder-bedrock-alarms" }
  ]
}
```
(DenyBedrockInvoke = an IAM managed policy with Effect Deny on `bedrock:InvokeModel`.)
```
```
