# Backend scaling — how App Runner actually works (and how to verify it)

You asked: *"How does it work for a new backend to spin up for every host? I'm not sure
it's doing that right now."* Short answer: **App Runner does NOT spin up one backend per
frontend host/user, and it shouldn't.** Here's the real model and how to confirm what
yours is set to.

## Your topology
- **Frontend:** Vercel (Next.js). The browser only ever talks to Vercel. The Next.js
  server-side API routes (`/api/*`) proxy to the backend via the `BACKEND_URL` env var.
- **Backend:** **one** AWS App Runner service (us-east-1), auto-deployed from an ECR
  image. Every Vercel request to `BACKEND_URL` hits that **single service URL**.
- **DB:** Neon (serverless Postgres), shared by all backend instances.

So there is exactly **one backend service**, with **one URL**, shared by all frontend
hosts and all users. That's correct and normal.

## What "spins up" — and what doesn't
App Runner runs N **instances** (containers) behind the one service URL and load-balances
across them. It scales the instance **count**, not "one per host." The knobs:

- **Min size** (provisioned instances): how many stay warm. If `min = 1`, one instance is
  always running → no cold start, small always-on cost. If App Runner supported min 0 it
  would scale to zero, but App Runner's floor is **1** (you always pay for ≥1).
- **Max size:** the ceiling on instances under load.
- **Max concurrency:** how many simultaneous requests **one** instance handles before App
  Runner adds another instance. Default is **100**. So one instance serves up to 100
  concurrent requests; the 101st concurrent request triggers a second instance (up to max).

**Important for THIS app:** the `/search` request is heavy and **largely single-threaded
per request** — it makes blocking Bedrock + Gemini + DB calls, and the container runs
`uvicorn` with the **default of 1 worker process** (see `backend/Dockerfile`). So a single
instance at concurrency 100 will queue CPU/GIL-bound work. For a slow endpoint like
`/search`, you generally want a **lower max-concurrency** (e.g. 5–20) so App Runner adds
instances sooner instead of piling requests onto one worker. That's the most likely thing
"not feeling right."

## Why you might *think* it's spinning up per host
Two App Runner behaviors that look like "new backend each time":
1. **Cold start after idle.** If min-size is low and traffic stops, App Runner pauses
   instances; the next request pays a cold start (container boot + your app import +
   Neon waking from suspend — see ARCHITECTURE.md §"Neon suspends after ~5 min"). Feels
   like "spinning up a new backend." It's the same service waking up.
2. **Deploys replace instances.** Each ECR push rolls new instances. Also looks like a
   fresh spin-up, but it's a rolling replace of the one service.

Neither is per-host. There is no per-user/per-host backend.

## Verify what YOURS is set to (run these — I can't, no AWS creds in this session)
Windows CMD, with the AWS CLI configured for us-east-1:

```bat
:: 1) Find the service ARN
aws apprunner list-services --region us-east-1

:: 2) Read the running config — look at AutoScalingConfigurationSummary + Cpu/Memory
aws apprunner describe-service --region us-east-1 ^
  --service-arn arn:aws:apprunner:us-east-1:ACCOUNT:service/ficfinder/XXXX ^
  --query "Service.{Status:Status,Url:ServiceUrl,Cpu:InstanceConfiguration.Cpu,Mem:InstanceConfiguration.Memory,ASC:AutoScalingConfigurationSummary}"

:: 3) Read the autoscaling policy itself — THIS is the answer to your question:
::    MaxConcurrency, MinSize, MaxSize
aws apprunner describe-auto-scaling-configuration --region us-east-1 ^
  --auto-scaling-configuration-arn <the ASC arn from step 2>
```

What the numbers mean:
- **MinSize = 1, MaxSize = N, MaxConcurrency = 100** → one warm instance, scales out only
  when >100 concurrent requests. For `/search` that's probably too coarse.
- If you see requests timing out or queuing under light load, **lower MaxConcurrency** and
  raise MaxSize:

```bat
:: Create a tuned autoscaling config (then point the service at it)
aws apprunner create-auto-scaling-configuration --region us-east-1 ^
  --auto-scaling-configuration-name ficfinder-search-tuned ^
  --max-concurrency 10 --min-size 1 --max-size 5

aws apprunner update-service --region us-east-1 ^
  --service-arn <service arn> ^
  --auto-scaling-configuration-arn <new ASC arn>
```
(Risk note: changing autoscaling triggers a deployment / brief instance churn. Non-locking,
but do it in a low-traffic window. Higher max-size = higher potential cost.)

## Black-box test from the outside (no AWS creds needed)
You can infer instance behavior by watching the response header I added in the ops audit.
Every response now carries **`X-Request-ID`**, and App Runner adds its own infra headers.
Easier: fire concurrent requests and watch latency + whether a cold start shows up.

```bash
# Hit the live health endpoint 20x concurrently and look at the latency spread.
# A single warm instance -> tight latencies. Cold start / scale-out -> one slow outlier.
URL=https://YOUR-APP.us-east-1.awsapprunner.com/health
seq 20 | xargs -P 20 -I{} curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" $URL | sort
```

- First request after idle is much slower than the rest → cold start (min-size too low for
  your latency goal; raise min-size to 1+ if not already, or accept the cold start).
- Under a burst, if many requests serialize to similar long times → they're queuing on one
  instance (max-concurrency too high for this workload).

## Bottom line
- It is **one shared backend service**, not one-per-host — that part is working as designed.
- The thing worth tuning is **max-concurrency vs. uvicorn workers** for the slow `/search`
  path, and **min-size** if cold starts bother you. Run the `describe-auto-scaling-configuration`
  command above to see your current values; that's the concrete "is it doing it right" check.
- Optional throughput win: run uvicorn with a few workers in the Dockerfile CMD
  (`uvicorn api:app --host 0.0.0.0 --port 8000 --workers 2`) so one instance isn't a single
  Python process — size workers to the App Runner instance's vCPU.
```
