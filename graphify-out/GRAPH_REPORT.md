# Graph Report - .  (2026-06-17)

## Corpus Check
- 188 files · ~79,194 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1061 nodes · 1753 edges · 79 communities (69 shown, 10 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.76)
- Token cost: 880,576 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Indexer & Scrape Orchestration|Indexer & Scrape Orchestration]]
- [[_COMMUNITY_Search UI Components|Search UI Components]]
- [[_COMMUNITY_User Store & Project Docs|User Store & Project Docs]]
- [[_COMMUNITY_Local Parquet Storage|Local Parquet Storage]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Backend Audit Tests|Backend Audit Tests]]
- [[_COMMUNITY_Frontend Build Config|Frontend Build Config]]
- [[_COMMUNITY_Devtool TUI App|Devtool TUI App]]
- [[_COMMUNITY_Query Enhancer & Ranker|Query Enhancer & Ranker]]
- [[_COMMUNITY_Embedder Pipeline|Embedder Pipeline]]
- [[_COMMUNITY_Blog & Misc Pages|Blog & Misc Pages]]
- [[_COMMUNITY_LLMSQL Audit Findings|LLM/SQL Audit Findings]]
- [[_COMMUNITY_Postgres RRF Retrieval|Postgres RRF Retrieval]]
- [[_COMMUNITY_Scrape Progress Checkpointing|Scrape Progress Checkpointing]]
- [[_COMMUNITY_Devtool Swap Logic|Devtool Swap Logic]]
- [[_COMMUNITY_AuthPay Audit Findings|Auth/Pay Audit Findings]]
- [[_COMMUNITY_Results Card & Badges|Results Card & Badges]]
- [[_COMMUNITY_Wattpad Scraper|Wattpad Scraper]]
- [[_COMMUNITY_FastAPI App & Webhooks|FastAPI App & Webhooks]]
- [[_COMMUNITY_Results Table & Filters|Results Table & Filters]]
- [[_COMMUNITY_Layout & Ambient Background|Layout & Ambient Background]]
- [[_COMMUNITY_Home Page & Search Flow|Home Page & Search Flow]]
- [[_COMMUNITY_Test Fixtures & Stubs|Test Fixtures & Stubs]]
- [[_COMMUNITY_Devtool Data Loading|Devtool Data Loading]]
- [[_COMMUNITY_Fic Schema & AO3FFN Scrapers|Fic Schema & AO3/FFN Scrapers]]
- [[_COMMUNITY_Search History (IndexedDB)|Search History (IndexedDB)]]
- [[_COMMUNITY_Architecture Beam & Planning|Architecture Beam & Planning]]
- [[_COMMUNITY_Devtool Scrape Job Control|Devtool Scrape Job Control]]
- [[_COMMUNITY_JWT & Google Auth|JWT & Google Auth]]
- [[_COMMUNITY_HyDE Pipeline Timeline|HyDE Pipeline Timeline]]
- [[_COMMUNITY_Stripe Webhook Handling|Stripe Webhook Handling]]
- [[_COMMUNITY_MCP Server Config|MCP Server Config]]
- [[_COMMUNITY_Auth UI & Settings|Auth UI & Settings]]
- [[_COMMUNITY_HyDE  Bedrock Concepts|HyDE / Bedrock Concepts]]
- [[_COMMUNITY_Auth & Infra Open Questions|Auth & Infra Open Questions]]
- [[_COMMUNITY_Animated Tickers|Animated Tickers]]
- [[_COMMUNITY_Demo Page & Mobile Hook|Demo Page & Mobile Hook]]
- [[_COMMUNITY_Search Status Pipeline|Search Status Pipeline]]
- [[_COMMUNITY_Devtool Progress Controls|Devtool Progress Controls]]
- [[_COMMUNITY_Auth Dependencies & Quota|Auth Dependencies & Quota]]
- [[_COMMUNITY_Devtool Construct Rows|Devtool Construct Rows]]
- [[_COMMUNITY_Scraper & Infra Concepts|Scraper & Infra Concepts]]
- [[_COMMUNITY_Wattpad Sharding|Wattpad Sharding]]
- [[_COMMUNITY_Ops Dashboard|Ops Dashboard]]
- [[_COMMUNITY_Auth Context Provider|Auth Context Provider]]
- [[_COMMUNITY_EmbeddingAuth Timeline|Embedding/Auth Timeline]]
- [[_COMMUNITY_Obsidian App Config|Obsidian App Config]]
- [[_COMMUNITY_Stripe & Infra Concepts|Stripe & Infra Concepts]]
- [[_COMMUNITY_SearchLogin Endpoints|Search/Login Endpoints]]
- [[_COMMUNITY_Reference-Count Tool (rq.py)|Reference-Count Tool (rq.py)]]
- [[_COMMUNITY_Export Button & Toast|Export Button & Toast]]
- [[_COMMUNITY_NeonApp Runner Infra|Neon/App Runner Infra]]
- [[_COMMUNITY_Embedder Concepts|Embedder Concepts]]
- [[_COMMUNITY_Fandom Marquee|Fandom Marquee]]
- [[_COMMUNITY_Format & Export Utils|Format & Export Utils]]
- [[_COMMUNITY_Neon Migration Cleanup|Neon Migration Cleanup]]
- [[_COMMUNITY_WattpadParallel Scraping|Wattpad/Parallel Scraping]]
- [[_COMMUNITY_Inception Concepts|Inception Concepts]]
- [[_COMMUNITY_ShinyAurora Text FX|Shiny/Aurora Text FX]]
- [[_COMMUNITY_Mock Search Route|Mock Search Route]]
- [[_COMMUNITY_Stripe Billing Portal|Stripe Billing Portal]]
- [[_COMMUNITY_Fandoms Endpoint|Fandoms Endpoint]]
- [[_COMMUNITY_Devtool Import Flow|Devtool Import Flow]]
- [[_COMMUNITY_App Runner Scaling Notes|App Runner Scaling Notes]]
- [[_COMMUNITY_Archive Desk Design Tokens|Archive Desk Design Tokens]]
- [[_COMMUNITY_Billing Portal Proxy|Billing Portal Proxy]]
- [[_COMMUNITY_Checkout Proxy Route|Checkout Proxy Route]]
- [[_COMMUNITY_Upsert User|Upsert User]]
- [[_COMMUNITY_Hello World Blog|Hello World Blog]]
- [[_COMMUNITY_MCP Config Node|MCP Config Node]]
- [[_COMMUNITY_ResultsTable Re-export|ResultsTable Re-export]]
- [[_COMMUNITY_Search-Sync Test|Search-Sync Test]]

## God Nodes (most connected - your core abstractions)
1. `SwapApp` - 51 edges
2. `FicResult` - 30 edges
3. `Fic` - 25 edges
4. `compilerOptions` - 16 edges
5. `cn()` - 15 edges
6. `BrowserSession` - 14 edges
7. `get_engine()` - 14 edges
8. `UserStore` - 13 edges
9. `search()` - 12 edges
10. `scrape_and_embed_ao3()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Bedrock IAM Instance Role Auth` --semantically_similar_to--> `Google OAuth ID Token Auth`  [INFERRED] [semantically similar]
  ARCHITECTURE.md → backend/auth/auth.py
- `RRF + LLM-rerank pipeline` --conceptually_related_to--> `embed_query()`  [INFERRED]
  semantic-archive-audit/ANALYTICS.md → backend/ai/embedder.py
- `HyDE Query Enhancement Pipeline` --references--> `enhance_query()`  [INFERRED]
  ficfinder-vault/Timeline/Mar 23 - HyDE Query Design.md → backend/ai/query_enhancer.py
- `Task 05 — Infra, Secrets & Network Audit` --references--> `UserStore`  [INFERRED]
  semantic-archive-audit/semantic-archive-audit/tasks/05-infra.md → backend/auth/user_store.py
- `Fic` --semantically_similar_to--> `FicCard()`  [INFERRED] [semantically similar]
  backend/data/schema.py → frontend/components/results/FicCard.tsx

## Import Cycles
- 1-file cycle: `backend/api.py -> backend/api.py`
- 2-file cycle: `backend/api.py -> backend/auth/auth.py -> backend/api.py`
- 2-file cycle: `backend/api.py -> backend/auth/dependencies.py -> backend/api.py`
- 3-file cycle: `backend/api.py -> backend/auth/dependencies.py -> backend/auth/auth.py -> backend/api.py`

## Hyperedges (group relationships)
- **Fic Results Display Composition** — components_resultstable_resultstable, components_resultscard_resultscard, components_platformbadge_platformbadge, components_ratingbadge_ratingbadge, components_scorebar_scorebar, components_taglist_taglist [INFERRED 0.85]
- **Rate Limit and Upgrade Flow** — components_accountbadge_accountbadge, components_ratelimitbanner_ratelimitbanner, components_ratelimitblock_ratelimitblock [INFERRED 0.80]
- **Inception Architectural Decisions** — ficfindervault_2026_03_20_inception_unifiedsemanticsearch, ficfindervault_2026_03_20_inception_scrapetodb, ficfindervault_2026_03_20_inception_metadataonly, ficfindervault_2026_03_20_inception_stack [EXTRACTED 1.00]
- **Search Inference Pipeline (HyDE + Embedding + Ranking)** — concept_query_enhancer, concept_embedder_py, concept_llm_ranker, concept_multi_angle_hyde_pipeline, concept_aws_bedrock [INFERRED 0.85]
- **Multi-Source Fic Scraper Ingestion** — concept_ao3_scraper, concept_ffn_scraper, concept_wattpad_scraper, concept_indexer_py, concept_fandoms_py [INFERRED 0.80]
- **Auth + Subscription Flow** — concept_aws_cognito, concept_jwt_jwks_flow, concept_subscription_model, concept_stripe_webhooks, concept_users_table [INFERRED 0.85]
- **End-to-End AI Search Retrieval Pipeline** — concept_hyde_pipeline, concept_multi_angle_hyde, concept_pgvector_search, concept_gemini_embeddings, concept_claude_haiku_45 [INFERRED 0.85]
- **Embedding Pipeline Design Decisions** — concept_matryoshka_768, concept_tags_first_embedding, concept_asymmetric_task_types, concept_gemini_embeddings [INFERRED 0.85]
- **Multi-Source Scraping & Reliability System** — concept_seleniumbase_scraper, concept_wattpad_v4_api, concept_dynamic_quality_filter, concept_parallel_scraping_rules, concept_gemini_retry_backoff [INFERRED 0.75]
- **Search query pipeline (enhance → embed → RRF → rank)** — backend_api_search, ai_query_enhancer_enhance_query, ai_embedder_embed_query, db_postgres_search_rrf, ai_ranker_rank [EXTRACTED 0.95]
- **Indexer ingestion flow (scrape → embed → store)** — backend_indexer_run_source, ai_embedder_embed_fics_batch, backend_indexer_store_batch, db_local_storage_upsert_fics_batch_local, db_postgres_upsert_fic [EXTRACTED 0.95]
- **HyDE blend + RRF fusion** — ai_query_enhancer_enhance_query, ai_embedder_embed_query, backend_api_blend_embeddings, db_postgres_search_rrf [INFERRED 0.85]
- **Leaked-secrets remediation (env vars, git history, webhook secret)** — inf_1_env_secrets_in_git_history, inf_2_secrets_plain_env, pay_5_webhook_secret_env, auth_3_jwt_secret_placeholder [INFERRED 0.85]
- **LLM prompt-injection surface (enhancer, ranker, scraped fic content)** — llm_4_enhancer_prompt_injection, llm_5_ranker_indirect_injection, blog_ffn_scraper [INFERRED 0.75]
- **Denial-of-wallet chain (disabled gate, unbounded query, no timeouts)** — llm_1_search_gate_noop, llm_2_query_no_max_length, ops_1_no_outbound_timeouts [INFERRED 0.85]
- **Google OAuth -> JWT -> DynamoDB User Lookup Auth Flow** — auth_auth_verify_google_token, auth_auth_create_jwt, auth_dependencies_get_current_user, auth_auth_decode_jwt, auth_user_store_get_user_with_week_reset [INFERRED 0.85]
- **Stripe Checkout -> Webhook -> Tier Update Billing Flow** — auth_stripe_handler_create_checkout_session, auth_stripe_handler_handle_webhook, auth_user_store_mark_event_processed, auth_user_store_set_tier, auth_stripe_handler_verify_paid_user [INFERRED 0.85]
- **Query Enhance -> Embed -> Retrieve -> Rank Search Pipeline** — architecture_md_query_enhancer, architecture_md_embedder, architecture_md_search_pipeline, architecture_md_ranker [INFERRED 0.75]
- **Frontend search-to-render data flow** — hooks_usesearch_usesearch, hooks_usesearchhistory_usesearchhistory, results_resultsbento_resultsbento, results_ficcard_ficcard [INFERRED 0.75]
- **Fic embedding generation flow** — data_schema_fic, ai_embedder_format_fic_text, ai_embedder_embed_fics_batch, ai_embedder_normalize [INFERRED 0.85]
- **Scrape checkpoint resume flow** — data_fandoms_fandoms, data_progress_mark_progress, data_progress_get_resume_point, data_progress_scrape_progress [INFERRED 0.75]
- **AO3 / FFN / Wattpad scrapers share build-url → fetch → parse_results → Fic shape** — scrapers_ao3_search, scrapers_ffn_search, scrapers_wattpad_search_iter [INFERRED 0.85]
- **AI search pipeline: HyDE enhance → multi-source scrape → LLM rank** — ai_query_enhancer_enhance_query, scrapers_ao3_search, ai_ranker_rank [INFERRED 0.75]
- **Frontend search request flow: HomePage → useSearch → /api/search SSE proxy → backend /search** — app_page_handlesearch, hooks_usesearch_usesearch, search_route_post, backend_search_endpoint [INFERRED 0.85]
- **RRF vector retrieval pipeline** — db_postgres_search_rrf, db_postgres_rrf_k, db_postgres_ensure_vector_index, db_postgres_ficrecord [INFERRED 0.75]
- **Local append-only persistence and compaction** — db_local_storage_upsert_fics_batch_local, db_local_storage_write_part, db_local_storage_compact, db_local_storage_write_canonical, db_local_storage_fandomlock [INFERRED 0.75]
- **Search results spreadsheet export** — utils_export_exportresults, utils_export_torow, utils_format_querytoslug, utils_format_formatfilenamedate [INFERRED 0.75]
- **Search history persistence data flow** — schema_types_ficresult, schema_types_searchhistoryentry, storage_db_semanticarchivedb [INFERRED 0.85]

## Communities (79 total, 10 thin omitted)

### Community 0 - "Indexer & Scrape Orchestration"
Cohesion: 0.06
Nodes (41): Centralized env loader. Import this module to ensure the root .env is loaded.  U, BrowserSession, _ffn_bucket_label(), _ffn_len_for(), _hold_terminal_on_crash(), index_all(), index_ao3_only(), index_fandom() (+33 more)

### Community 1 - "Search UI Components"
Cohesion: 0.06
Nodes (36): AccountBadge(), AccountBadgeProps, FILTERS, QuickFilter, QuickFilters(), QuickFiltersProps, RateLimitBanner(), RateLimitBannerProps (+28 more)

### Community 2 - "User Store & Project Docs"
Cohesion: 0.07
Nodes (31): Bedrock IAM Instance Role Auth, Embedder (Gemini 768-dim L2-normalized), FicFinder System Architecture, HyDE Hypothetical Document Embedding, Index-then-Search Architecture, Matryoshka 768-dim Embedding Tradeoff, Query Enhancer (Bedrock Haiku 4.5), LLM Ranker (Bedrock Haiku 4.5) (+23 more)

### Community 3 - "Local Parquet Storage"
Cohesion: 0.10
Nodes (37): Path, Ambient UI (blog post), Filter Chips Redesign (blog post), The Frontend Overhaul (blog post), Local-First Storage and the Neon Swap (blog post), Local-first storage compromise, DataFrame, _canonical_paths() (+29 more)

### Community 4 - "Frontend Dependencies"
Cohesion: 0.05
Nodes (37): dependencies, clsx, dexie, gray-matter, @mdx-js/loader, @mdx-js/react, motion, next (+29 more)

### Community 5 - "Backend Audit Tests"
Cohesion: 0.06
Nodes (17): _endpoint_for(), Behavioral tests for the backend security/reliability audit fixes.  One section, A representative search must produce params-only SQL: no user/data value may, A sync route is run in FastAPI's threadpool; an async route with blocking     ca, /webhooks/stripe must stay async (needs `await request.body()`) but offload, Behavioral: a slow SYNC route runs in the threadpool, so /health stays     respo, A failing analytics write must never raise into the request path., _reload_auth() (+9 more)

### Community 6 - "Frontend Build Config"
Cohesion: 0.07
Nodes (25): config, createMDX, nextConfig, withMDX, Frontend package.json (semantic-archive-frontend), config, compilerOptions, allowJs (+17 more)

### Community 7 - "Devtool TUI App"
Cohesion: 0.13
Nodes (7): App, fmt_bytes(), load_constructed_meta(), Delete fics with null/zero embedding vectors from local parquet+npy         stor, Remove duplicate fics (same url) from local parquet+npy stores and         from, Populate the cleanup 'Fandom to clear' dropdown from local storage., SwapApp

### Community 8 - "Query Enhancer & Ranker"
Cohesion: 0.11
Nodes (22): enhance_query(), EnrichedQuery, _invoke_enhancer(), Query enhancer for FicFinder — HyDE-style expansion via Claude 3.5 Haiku (Bedroc, Expand a raw user query into a rich semantic description + structured filters., Enhancer SYSTEM_PROMPT, _build_prompt(), _format_tags() (+14 more)

### Community 9 - "Embedder Pipeline"
Cohesion: 0.11
Nodes (25): _embed_batch(), embed_fic(), embed_fics_batch(), embed_query(), _embed_single(), _format_fic_text(), _is_rate_limit(), _normalize() (+17 more)

### Community 10 - "Blog & Misc Pages"
Cohesion: 0.12
Nodes (16): BlogIndexPage(), FicDetailPage, getFic data loader, fallbackFic (mock fallback), GET /api/fic/[platform]/[id] proxy route, FicDetailPage(), getFic(), BLOG_DIR (+8 more)

### Community 11 - "LLM/SQL Audit Findings"
Cohesion: 0.12
Nodes (24): AO3 Scraper (declarative, semantic HTML), FFN Scraper (regex-and-pray, messy HTML), Blended Ranker Score (semantic + metadata + quality prior), Fixed Test-Query Regression Set, Tuning the Ranker Without Going Insane, Scraping AO3 and FFN: A Tale of Two HTML Schemas, Shared-Schema Normalization with Source Tagging, LLM Pipeline Subsystem (+16 more)

### Community 12 - "Postgres RRF Retrieval"
Cohesion: 0.12
Nodes (21): GET /api/admin/stats proxy route, Fic, Base, add_search_text_column(), ensure_vector_index(), FicRecord, get_admin_stats(), migrate_tags_to_array() (+13 more)

### Community 13 - "Scrape Progress Checkpointing"
Cohesion: 0.16
Nodes (18): Any, min_words-keyed AO3 checkpoint, _empty(), _entry(), get_resume_point(), is_done(), load(), mark_done() (+10 more)

### Community 14 - "Devtool Swap Logic"
Cohesion: 0.17
Nodes (20): pgvector over Dedicated Vector DB, Devtool Local<->Neon Fandom Swap Workflow, fics Postgres Table (pgvector), _ensure_tag_list(), export(), fandom_dir(), list_fandoms(), load_meta() (+12 more)

### Community 15 - "Auth/Pay Audit Findings"
Cohesion: 0.15
Nodes (21): Findings Template, AUTH-1: /admin/stats has no auth dependency, AUTH-2: Google token audience not verified (empty GOOGLE_CLIENT_ID), AUTH-3: JWT_SECRET falls back to public placeholder, CORS allow_origins=* with allow_credentials=True, Auth Subsystem, Infrastructure Subsystem, Stripe / Payments Subsystem (+13 more)

### Community 16 - "Results Card & Badges"
Cohesion: 0.17
Nodes (16): PlatformBadge(), PlatformBadgeProps, STAMP, Rating, RATING_STYLES, RatingBadge(), RatingBadgeProps, ResultsCard() (+8 more)

### Community 17 - "Wattpad Scraper"
Cohesion: 0.17
Nodes (19): Fic, build_search_url(), calibrate(), _get_percentile_for_total(), _get_ratio(), _is_valid_story(), _make_session(), parse_story() (+11 more)

### Community 18 - "FastAPI App & Webhooks"
Cohesion: 0.15
Nodes (16): admin_stats(), http_exception_handler(), lifespan(), _log(), me(), Return the current user's profile (tier, searches remaining, etc.)., Stripe webhook endpoint — no auth, raw body for signature verification., # NOTE: intentionally a plain `def`, not `async def`. Every step below (+8 more)

### Community 19 - "Results Table & Filters"
Cohesion: 0.20
Nodes (15): COLUMNS, KUDOS_MIN, Row, Sort, SortId, TD, WORD_COUNT_MIN, selectStyle (+7 more)

### Community 20 - "Layout & Ambient Background"
Cohesion: 0.15
Nodes (13): GravityGridBackground(), SmoothScroll(), instrumentSerif, inter, jetbrainsMono, metadata, RootLayout(), Providers() (+5 more)

### Community 21 - "Home Page & Search Flow"
Cohesion: 0.20
Nodes (11): HangingCupSign(), TeahouseCanopy(), AppState, HomePage handleSearch, HomePage(), SettingsButton(), HeroTitle(), useSearch() (+3 more)

### Community 22 - "Test Fixtures & Stubs"
Cohesion: 0.12
Nodes (11): POST /api/auth/login proxy route, main(), One-time setup: create the ficfinder-users DynamoDB table.  Usage:     python sc, fake_table(), FakeDynamoTable, Shared test fixtures.  The backend modules create AWS/Gemini/DB clients at impor, Stub boto3 / google-genai / sqlalchemy engine creation before app import., Minimal in-memory stand-in for a DynamoDB Table supporting the ops we use. (+3 more)

### Community 23 - "Devtool Data Loading"
Cohesion: 0.15
Nodes (13): get_db_size(), get_fandom_list(), get_local_fandoms(), get_local_fic_count(), get_neon_fandoms(), Load the FANDOMS dict from backend., Return the number of fics currently in local storage for a fandom.      Includes, get_engine() (+5 more)

### Community 24 - "Fic Schema & AO3/FFN Scrapers"
Cohesion: 0.24
Nodes (12): Fic, Fic, FANDOMS, Fic, build_search_url(), parse_int(), parse_results(), search() (+4 more)

### Community 25 - "Search History (IndexedDB)"
Cohesion: 0.18
Nodes (10): ResultsCardProps, ResultsTableProps, SearchHistoryProps, FicCardProps, ResultsBentoProps, FicResult, SearchHistoryEntry, getDB() (+2 more)

### Community 26 - "Architecture Beam & Planning"
Cohesion: 0.14
Nodes (12): Dexie.js / IndexedDB Persistence, ResultsTable Component, SearchBar Component, SearchHistory Component, StatusIndicator Component, Two-Phase Result Loading, Frontend Planning (2026-03-21), Frontend Design System (+4 more)

### Community 27 - "Devtool Scrape Job Control"
Cohesion: 0.15
Nodes (4): Launch a scraper subprocess and record it. Non-blocking., Read the progress file and render a human status string for a job., Rebuild the Active tab table from self._scrape_jobs + checkpoint file., Kill a job's full process tree (Chrome/chromedriver descend from it).

### Community 28 - "JWT & Google Auth"
Cohesion: 0.20
Nodes (13): create_jwt(), decode_jwt(), Google ID token verification and JWT issuance., Return the configured JWT secret, failing closed if it's missing/placeholder., Verify a Google OAuth2 ID token and return the decoded payload.      The payload, Issue a signed JWT for the given user., Decode and validate a JWT. Raises HTTPException 401 on failure., _require_jwt_secret() (+5 more)

### Community 29 - "HyDE Pipeline Timeline"
Cohesion: 0.19
Nodes (14): AWS Bedrock Migration, Claude Haiku 4.5 (Bedrock), Gemini Embedding (gemini-embedding-001), HyDE Query Enhancement Pipeline, Multi-Angle Tri-Prompt HyDE Search, pgvector Cosine Similarity Search, Scrape-to-DB Pre-Indexing Architecture, SeleniumBase AO3/FFN Scraper (+6 more)

### Community 30 - "Stripe Webhook Handling"
Cohesion: 0.19
Nodes (12): _downgrade_by_customer_id(), handle_webhook(), Stripe subscription logic — checkout sessions and webhook handling.  All Stripe, Find the user with this Stripe customer ID and set their tier to free.      Uses, Verify and process a Stripe webhook event.      Handles:       checkout.session., Re-check Stripe for a paid user's subscription, downgrading if none is active., verify_paid_user(), UserStore.mark_event_processed (+4 more)

### Community 31 - "MCP Server Config"
Cohesion: 0.19
Nodes (12): C:\Users\notcr\AppData\Local\Programs\Python\Python312\Scripts\uvx.exe, cmd, context7, deepwiki, github, mermaid, repomix, serena (+4 more)

### Community 32 - "Auth UI & Settings"
Cohesion: 0.21
Nodes (7): SettingsPage route, AuthButton(), useAuth(), SettingsContent(), SettingsContentProps, SettingsModal(), SettingsModalProps

### Community 33 - "HyDE / Bedrock Concepts"
Cohesion: 0.23
Nodes (12): ARCHITECTURE.md (Claude Code Context), AWS Bedrock Inference, Claude Haiku 4.5 (Bedrock), Dual Schema Enforcement, HyDE (Hypothetical Document Embeddings), LLM Ranker (ranker.py), Multi-Angle HyDE Pipeline, Query Enhancer (query_enhancer.py) (+4 more)

### Community 34 - "Auth & Infra Open Questions"
Cohesion: 0.20
Nodes (12): AWS Cognito Auth, EC2 + Xvfb Remote Indexer, Grafana Cloud Monitoring, Cognito JWT / JWKS Verification Flow, Stripe Webhooks, Subscription / Tier Model, users Table, Auth Planning (2026-03-29) (+4 more)

### Community 35 - "Animated Tickers"
Cohesion: 0.21
Nodes (8): prefers-reduced-motion guard, CRAVINGS, RotatingCravings(), StatsTicker(), NumberTicker(), NumberTickerProps, WordRotate(), WordRotateProps

### Community 36 - "Demo Page & Mobile Hook"
Cohesion: 0.27
Nodes (8): DemoPage(), useIsMobile(), useIsTablet(), useMediaQuery(), ResultsView, usePersistedResultsView(), ViewToggle(), ViewToggleProps

### Community 37 - "Search Status Pipeline"
Cohesion: 0.24
Nodes (8): StatusIndicator(), StatusIndicatorProps, createInitialStatus(), INITIAL_STEPS, PipelineStatus, PipelineStep, SearchEvent, formatElapsed()

### Community 38 - "Devtool Progress Controls"
Cohesion: 0.24
Nodes (4): get_local_platform_counts(), Get per-platform fic counts from local storage (canonical + in-flight parts)., Update the progress-status card based on the currently selected fandom., Pressed

### Community 39 - "Auth Dependencies & Quota"
Cohesion: 0.27
Nodes (9): check_search_limit(), get_current_user(), FastAPI dependencies for authentication and rate limiting., Extract Bearer token, decode JWT, look up user in store.      Returns the full u, Search limits temporarily disabled during beta — everyone gets unlimited.      T, UserStore.get_user, UserStore.get_user_with_week_reset, UserStore.increment_searches (+1 more)

### Community 40 - "Devtool Construct Rows"
Cohesion: 0.27
Nodes (5): Changed, ComposeResult, ConstructRow, A single fandom row: checkbox + min-words dropdown., Horizontal

### Community 41 - "Scraper & Infra Concepts"
Cohesion: 0.24
Nodes (10): AO3 Scraper, AWS RDS PostgreSQL + pgvector, fandoms.py, FFN Scraper, indexer.py, SeleniumBase, Vercel (Frontend Host), Wattpad Scraper (v4 API) (+2 more)

### Community 42 - "Wattpad Sharding"
Cohesion: 0.24
Nodes (10): clear_fandom(), get_fic_count(), Return total fics indexed, optionally filtered by fandom., Delete all fics for a fandom so it can be re-indexed., _get_total(), _plan_shards(), Cheap probe: total results for a given shard., Build a list of shards that each fit under OFFSET_CAP.      Strategy:       1 (+2 more)

### Community 43 - "Ops Dashboard"
Cohesion: 0.31
Nodes (7): /api/admin/stats endpoint, AdminStats, FandomStat, fmt(), getStatus(), OpsPage(), prioritySort()

### Community 44 - "Auth Context Provider"
Cohesion: 0.25
Nodes (4): AuthContext, AuthContextValue, AuthProvider(), AuthUser

### Community 45 - "Embedding/Auth Timeline"
Cohesion: 0.22
Nodes (9): Asymmetric Retrieval Task Types, AWS Cognito Auth + Subscriptions, Multi-Account Neon DB Sharding, Obsidian Devlog/Vault System, Tags-First Embedding Format, Apr 4 - Devlog and Notes System, Apr 4 - Multi account DB, Mar 24 - Embedding Pipeline Overhaul (+1 more)

### Community 46 - "Obsidian App Config"
Cohesion: 0.22
Nodes (8): alwaysUpdateLinks, defaultViewMode, foldHeading, readableLineLength, showFrontmatter, showLineNumber, spellcheck, strictLineBreaks

### Community 47 - "Stripe & Infra Concepts"
Cohesion: 0.25
Nodes (8): FicFinder Infrastructure (App Runner / Neon / Vercel), Neon Pooler URL + pool_pre_ping, create_checkout_session(), Create a Stripe Checkout Session for a $2/month subscription.      Returns the c, checkout(), Create a Stripe Checkout Session and return the URL., Stripe Subscription Billing, Task 06 — Reliability & Ops Audit

### Community 48 - "Search/Login Endpoints"
Cohesion: 0.25
Nodes (8): user_store, _blend_embeddings(), login(), LoginRequest, Exchange a Google ID token for a FicFinder JWT., Weighted blend of HyDE and raw query embeddings.          Protects against cas, search(), BaseModel

### Community 49 - "Reference-Count Tool (rq.py)"
Cohesion: 0.46
Nodes (7): ao3_total(), bar(), ffn_total(), fmt(), get_db_counts(), show_fandom(), wattpad_total()

### Community 50 - "Export Button & Toast"
Cohesion: 0.32
Nodes (6): doExport, ExportButton(), ExportButtonProps, Toast(), ToastProps, exportResults

### Community 51 - "Neon/App Runner Infra"
Cohesion: 0.25
Nodes (8): AWS App Runner, Multi-Account Neon Split (Scale Idea), Neon Serverless Postgres, Secret Exposure in App Runner Logs, SQLAlchemy Pool Pre-Ping / Recycle Config, Wattpad ToS Scraping Issue, DB Cleanup + Neon Migration (2026-03-31), Today - ToS + Scale Planning (2026-04-04)

### Community 52 - "Embedder Concepts"
Cohesion: 0.33
Nodes (7): Embedder (embedder.py), gemini-embedding-001, Matryoshka 768-dim Embeddings, Safe Parallelism Rules, Tags-First Token Ordering, Tenacity 429 Exponential Backoff Retry, Parallel Scraping + Retry Logic (2026-04-04)

### Community 53 - "Fandom Marquee"
Cohesion: 0.33
Nodes (5): Append-only part-file write path, FandomMarquee(), FANDOMS, Marquee(), MarqueeProps

### Community 54 - "Format & Export Utils"
Cohesion: 0.52
Nodes (5): ExportFormat, exportResults(), toRow(), formatFilenameDate(), queryToSlug()

### Community 55 - "Neon Migration Cleanup"
Cohesion: 0.47
Nodes (4): migrate(), Neon serverless Postgres, Null-Embedding DB Cleanup (cleanup.py), Mar 31 AM — DB Cleanup + Neon Migration

### Community 56 - "Wattpad/Parallel Scraping"
Cohesion: 0.33
Nodes (6): Dynamic Percentile Quality Filter, Gemini 429 Exponential Backoff Retry, Parallel Scraping Safety Rules, Wattpad v4 Search API, Apr 3 - Wattpad Scraper, Apr 4 - Parallel Scraping and Retry

### Community 57 - "Inception Concepts"
Cohesion: 0.47
Nodes (6): FicFinder Project Vault Index, Inception Milestone, Metadata-Only Storage, Scrape-to-DB Pre-Indexing, FastAPI + pgvector + Gemini Stack, Unified Semantic Fanfic Search

### Community 58 - "Shiny/Aurora Text FX"
Cohesion: 0.33
Nodes (4): AnimatedShinyText(), AnimatedShinyTextProps, AuroraText(), AuroraTextProps

### Community 59 - "Mock Search Route"
Cohesion: 0.60
Nodes (3): fallbackFic(), GET(), MOCK_RESULTS

### Community 60 - "Stripe Billing Portal"
Cohesion: 0.50
Nodes (4): create_portal_session(), Create a Stripe Billing Portal session so the customer can cancel or update paym, billing_portal(), Create a Stripe Billing Portal session so the user can cancel or manage billing.

### Community 61 - "Fandoms Endpoint"
Cohesion: 0.50
Nodes (4): get_fandoms(), Returns supported fandoms with their collection status., get_indexed_fandoms(), Return the set of fandoms that have at least one fic indexed.

## Ambiguous Edges - Review These
- `ResultsTable()` → `SettingsButton()`  [AMBIGUOUS]
  frontend/components/SettingsButton.tsx · relation: conceptually_related_to
- `FandomMarquee.tsx` → `Append-only part-file write path`  [AMBIGUOUS]
  frontend/components/proof/FandomMarquee.tsx · relation: conceptually_related_to

## Knowledge Gaps
- **183 isolated node(s):** `@upstash/context7-mcp`, `C:\Users\notcr\AppData\Local\Programs\Python\Python312\Scripts\uvx.exe`, `start-mcp-server`, `github`, `mcp-remote` (+178 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ResultsTable()` and `SettingsButton()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `FandomMarquee.tsx` and `Append-only part-file write path`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Fic` connect `Fic Schema & AO3/FFN Scrapers` to `Query Enhancer & Ranker`, `Embedder Pipeline`, `Wattpad Sharding`, `Postgres RRF Retrieval`, `Search/Login Endpoints`, `Wattpad Scraper`, `FastAPI App & Webhooks`, `Home Page & Search Flow`, `JWT & Google Auth`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `FicResult` connect `Search History (IndexedDB)` to `Search UI Components`, `Search Status Pipeline`, `Query Enhancer & Ranker`, `Blog & Misc Pages`, `Ops Dashboard`, `Results Card & Badges`, `Export Button & Toast`, `Results Table & Filters`, `Home Page & Search Flow`, `Format & Export Utils`, `Mock Search Route`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `get_platform_counts()` connect `Local Parquet Storage` to `Devtool Progress Controls`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `Fic` (e.g. with `embed_fic()` and `Fic`) actually correct?**
  _`Fic` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@upstash/context7-mcp`, `C:\Users\notcr\AppData\Local\Programs\Python\Python312\Scripts\uvx.exe`, `start-mcp-server` to the rest of the system?**
  _338 weakly-connected nodes found - possible documentation gaps or missing edges._