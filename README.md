# ShipProof

**Automated hackathon submission verification and sponsor-reporting platform.**

ShipProof confirms a submitted project is actually live, actually deployed on Zerops, and actually built during the event window — without ever requiring a participant to hand over a Zerops API token or manually export any file.

---

## The Problem

Hackathon organizers running events like "The Zerops Challenge" (a 48-hour solo hackathon where every submission must be deployed on Zerops with at least 3 services and stay live through judging) face a real operational pain: **manually verifying every submission**.

With potentially hundreds of participants, organizers must check:
- Is the project actually live and hosted on Zerops?
- Does it use a reasonably complex architecture (not just a single static page)?
- Was it built during the event, not pre-built?
- Does the demo video show real Zerops dashboard usage?

Doing this manually is slow, error-prone, and doesn't scale. Zerops's own community has noted that project-level observability and visibility could be improved — ShipProof's verification dashboard is a working example of the kind of visibility layer that gap points to.

---

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│  Frontend   │─────▶│  API Service │─────▶│  PostgreSQL   │
│  (React)    │      │  (Node.js)   │      │  (managed)    │
└─────────────┘      └──────┬───────┘      └───────────────┘
                             │
                             ▼
                     ┌──────────────┐      ┌───────────────┐
                     │  Job Queue   │─────▶│  Worker       │
                     │  (Valkey)    │      │  (Node.js)    │
                     └──────────────┘      └───────┬───────┘
                                                    │
                                        ┌───────────┴───────────┐
                                        ▼                       ▼
                                 GitHub REST API        Target Live URLs
                                (repo/commits/files)     (uptime pinging)
```

5 services total: 3 application services + 2 managed services, all on Zerops.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, TypeScript, TailwindCSS, Recharts |
| API | Node.js 22, Express, TypeScript |
| Worker | Node.js 22, TypeScript, node-cron |
| Queue | Valkey 7.2 (via ioredis) |
| Database | PostgreSQL 16 (via Prisma ORM) |
| Auth | JWT-based session (judges/organizers) |
| External API | GitHub REST API v3 |
| Hosting | Zerops — all 5 services |

---

## How Verification Works

ShipProof uses a **zero-friction, layered verification model**. The participant provides only what the hackathon submission form already requires: a live URL, a public GitHub repo link, and a demo video link. Nothing extra.

### Layer 1 — Liveness Check (automated, no auth)
- Pings the submitted live URL and records status code + response time.
- Checks if the hostname matches Zerops's auto-generated subdomain pattern (`*.zerops.app`).
- If the participant used a custom domain, the system flags it as "Custom domain — needs manual confirmation" — it does **not** claim false certainty.
- Re-pings every 15 minutes for the duration of the event + judging window to prove the "must stay live" rule.

### Layer 2 — Architecture Check via GitHub (automated, public repo)
- Fetches `zerops.yaml` from the repo root via GitHub REST API.
- Parses `setup:` blocks to count declared services.
- **Important limitation:** `zerops.yaml` only describes app-tier services built from source. Managed services (PostgreSQL, Valkey, object storage) are provisioned via the Zerops dashboard and are **not** declared in this file. This layer alone cannot prove the full stack.
- As a **soft, clearly-labeled signal only**, scans `package.json` / `requirements.txt` / `go.mod` for known database/cache client library names. This is stored as a "dependency hint" and is **never** presented as proof — it is explicitly labeled as "weak signal, not verified" everywhere in the UI.

### Layer 3 — Managed-Services Confirmation (human-assisted)
- The hackathon rules already require a demo video showing "how Zerops is used."
- ShipProof adds one line to the submission checklist: "Make sure your demo video includes a few seconds of your Zerops project dashboard showing your services list."
- In the judge dashboard, a manual checkbox lets judges confirm: "Dashboard shown in video?"
- This is **intentionally** a human-in-the-loop step, not automated.

### Layer 4 — Authenticity Signal (automated signal, human judgment)
- Fetches commit history via GitHub API.
- Computes distribution across the 48-hour event window.
- Flags: `Healthy` (commits spread incrementally), `Review Suggested` (suspicious pattern — e.g., all commits dumped at once before the event), or `Insufficient Data` (too few commits to analyze).
- **Never auto-rejects.** Always routes to human judgment, and says so in the UI copy.

### Explicit Honesty
ShipProof automates what can be honestly automated without violating anyone's account security, and clearly hands off to a human judge for anything it cannot prove with certainty.

---

## Product Walkthrough

1. **Participant flow (public)**
   - The participant navigates to the public submission page (no login required).
   - They fill in five exact fields: Project Name, Participant Name, Email, Live URL, GitHub Repository, and Demo Video URL.
   - Upon submission, they see a confirmation screen explaining that verification runs automatically in the background (checking the live URL, scanning the GitHub repo for architecture signals, monitoring uptime, and verifying commit authenticity) with no further action needed from their side.

2. **Judge panel**
   - After logging in, judges see the main dashboard listing all submissions along with quick-glance status indicators.
   - Clicking a row opens the submission detail view, which visualizes the uptime chart, commit distribution chart, detected services, and dependency hints.
   - Judges use a manual "Dashboard shown in video?" checkbox to confirm managed service usage from the demo video.
   - Judges can then complete the scoring form (Idea, Execution, Zerops Usage) directly on the detail page.
   - *Note: Judges cannot access the sponsor report or the event settings.*

3. **Admin / Organizer panel**
   - Organizers have all judge capabilities, plus access to two additional tools.
   - **Report Page**: View aggregate statistics (total projects, uptime %, average scores, tech stack distribution) and export raw submission data to CSV.
   - **Settings Page**: Dynamically configure the hackathon event window (start date, end date, judging deadline) without touching environment variables or redeploying the app.
   - **Delete Features**: Organizers can permanently delete a single submission from the detail page/dashboard, or use the "Clear all submissions" Danger Zone action in settings to securely reset the platform between events.

4. **Demo credentials for reviewers**
   Use these credentials to log in and explore both roles on the live platform:
   | Role | Email | Password |
   |---|---|---|
   | Judge | `judge@shipproof.dev` | `judge123` |
   | Organizer/Admin | `admin@shipproof.dev` | `changeme123` |
   
   *(Note: These are demo credentials for hackathon evaluation purposes and must be rotated before real production use).*

---

## Best Use of Zerops

ShipProof is itself deployed on Zerops as a **5-service architecture** — making it a real, self-referential example of the kind of multi-service project the hackathon rules require:

- **3 application services:** Frontend (static), API (Node.js 22), Worker (Node.js 22)
- **2 managed services:** PostgreSQL 16, Valkey 7.2
- **Private inter-service networking:** API connects to PostgreSQL and Valkey over Zerops's internal network; Worker consumes jobs from Valkey and writes results to PostgreSQL.
- **Auto-scaling:** App services scale automatically based on load.
- **Real `zerops.yaml` + `import.yaml`:** The project's own deployment configuration files serve as a reference example for what ShipProof checks in other submissions.

---

## Why This Is Different

- **Not an LLM wrapper or chatbot.** Solves a real, named operational problem for a real, named organization structure (hackathon organizers who must verify submissions at scale).
- **Named, checkable rule-references.** Every verification layer maps to a specific hackathon rule that actually exists.
- **Honest about limitations.** The product's own UI copy and this README explicitly state what it can and cannot prove.
- **Zero friction.** Participants provide nothing beyond what the submission form already collects — no API tokens, no file uploads, no extra steps.

---

## Setup / Local Development

### Prerequisites
- Node.js 22+
- PostgreSQL 16 (local or Docker)
- Redis/Valkey (local or Docker, port 6379)

### Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd shipproof

# 2. Install dependencies
cd api && npm install && cd ..
cd worker && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Generate Prisma client
npm install prisma@6 @prisma/client@6
npx prisma generate --schema=prisma/schema.prisma

# 4. Set up database
cp api/.env.example api/.env
# Edit api/.env with your DATABASE_URL
npx prisma db push --schema=prisma/schema.prisma

# 5. Seed default accounts
npx tsx prisma/seed.ts
# Default: admin@shipproof.dev / changeme123
#          judge@shipproof.dev / judge123

# 6. Configure worker
cp worker/.env.example worker/.env
# Edit worker/.env — set GITHUB_TOKEN (your own PAT for rate limits)

# 7. Configure frontend
cp frontend/.env.example frontend/.env
# Default: VITE_API_URL=http://localhost:3000

# 8. Run all services
cd api && npm run dev &
cd worker && npm run dev &
cd frontend && npm run dev &
```

---

## Deployment Instructions (Zerops)

### 1. Import project

Use the `import.yaml` at the project root:

```bash
zcli project project-import import.yaml
```

Or paste its contents into the Zerops dashboard → "Import project."

This provisions all 5 services: `frontend` (static), `api` (nodejs@22), `worker` (nodejs@22), `db` (postgresql@16), `cache` (valkey@7.2).

### 2. Set environment variables

In the Zerops dashboard, set these secret variables for `api` and `worker`:
- `JWT_SECRET` — a strong random string
- `GITHUB_TOKEN` — a GitHub Personal Access Token (ShipProof-owned, for API rate limits)
- `EVENT_START`, `EVENT_END`, `JUDGING_END` — ISO 8601 timestamps for the hackathon window

### 3. Connect repositories

Connect each service's subfolder to the GitHub repo from the Zerops dashboard:
- `frontend/` → `frontend` service
- `api/` → `api` service
- `worker/` → `worker` service

Each service has its own `zerops.yaml` for build/deploy configuration.

### 4. Verify

After deployment:
- Frontend should be accessible at `frontend-<id>-<port>.<region>.zerops.app`
- API at `api-<id>-3000.<region>.zerops.app`
- Submit a test project and verify the worker picks up the verification job

---

## Limitations (honestly stated)

- **Custom domains** cannot be auto-verified as Zerops-hosted — the system only recognizes the `*.zerops.app` subdomain pattern.
- **Dependency hints** (package.json scanning) can be gamed trivially by adding libraries without using them. This is why they're labeled "weak signal" everywhere.
- **Commit authenticity flags** are suggestions for human review, not verdicts. A skilled developer could manipulate commit timestamps. The system flags patterns, not intentions.
- **`zerops.yaml` only covers app-tier services** — managed services like PostgreSQL and Valkey are invisible to this file-based check. That's why Layer 3 (human video review) exists.
- **GitHub API rate limits** — even with a PAT (5000 req/hr), a very large hackathon could hit limits. The worker caches responses in Valkey to mitigate this.

---

## AI Tool Disclosure

The project idea, the choice of what operational problem to solve, the verification philosophy (what to automate vs. what to leave to human judgment), the tech stack choices, and the overall system architecture were specified and directed by the developer (Mehraan / CodeWithMehru). 

The UI/UX design direction and visual identity were also specified by the developer.

Claude (Anthropic's AI model) was used as the implementation tool — it wrote the actual code, including backend logic (API routes, worker verification logic, database schema, deployment configuration), under direct developer instruction and iterative debugging across the build process.

This project reflects genuine collaborative development: human-directed architecture and product decisions, combined with AI-assisted implementation, consistent with hackathon policies requiring disclosure and meaningful original contribution from the participant. AI was used as an accelerator, not as the architect.

---

## Verification Layers — Precise Behavior (as implemented and tested)

This section documents what each layer actually does, based on code that has been run end-to-end. It supersedes any higher-level summary elsewhere in this document where there is a discrepancy.

### Layer 1 — Liveness + Zerops Hosting Detection

Pings the submitted live URL using `fetch` with a 10-second timeout and records HTTP status code and response time. Simultaneously tests the hostname against a Zerops subdomain pattern (`/\.zerops\.app\b/i`). Reports one of three distinct states — not a vague single binary:

| Outcome | What it means |
|---|---|
| **Yes** (confirmed Zerops subdomain) | URL hostname contains `.zerops.app` — definitively Zerops-hosted |
| **Custom Domain** | URL does not match the Zerops pattern — organizer must manually confirm hosting |
| **—** (dash) | Verification has not yet run for this submission |

"Custom Domain" is not a flag — it is neutral. It means the system cannot auto-confirm the host and is handing off to a human. The system never claims false certainty in either direction.

Liveness is re-checked every 15 minutes via `node-cron` for the full judging window. The scheduler queries live submission rows fresh on every cycle — once a submission is deleted, the next cycle simply doesn't find it and never pings it again.

### Layer 2 — Architecture via GitHub API

Fetches `zerops.yaml` directly from the **root** of the submitted GitHub repo using the GitHub REST API (authenticated with a PAT to avoid rate-limiting). Parses the file for `setup:` blocks and counts declared services.

**Important structural note:** Zerops requires a single `zerops.yaml` at the repository root, even for monorepos. For a monorepo with multiple services (frontend, api, worker), each service gets its own `setup:` block within that single file. ShipProof's own deployment is structured exactly this way — its `zerops.yaml` declares three `setup:` blocks for the frontend, api, and worker services — which is why it can serve as a real self-referential reference for participants building similar multi-service projects.

As a **weak, non-authoritative signal only**, the layer also scans `package.json`, `requirements.txt`, and `go.mod` for known database and cache client library names (e.g., `pg`, `prisma`, `ioredis`, `psycopg2`). This is stored as a "dependency hint" and is explicitly labeled "weak signal, not verified" everywhere in the UI. It can be gamed by adding imports without using them and is never used as a basis for any automated verdict.

### Layer 3 — Managed Services (Human-Assisted)

Fully manual. A checkbox in the judge review form asks: "Dashboard confirmed in video?" A judge watches the participant's demo video and checks the box if the Zerops project dashboard is visible showing the services list. This step cannot be automated without a Zerops API token belonging to the participant, which ShipProof deliberately does not collect.

### Layer 4 — Commit Authenticity (Automated Signal, Human Verdict)

Fetches commit history from the GitHub repo via the GitHub API. Compares each commit's timestamp against the organizer-configured event window (`eventStart` → `eventEnd` from the database). Flags the result as:

| Flag | Meaning |
|---|---|
| **Healthy** | Commits are distributed across multiple hours within the event window |
| **Review Suggested** | Suspicious pattern — see below |
| **Insufficient Data** | Fewer than 3 commits total — not enough to analyze |

**"Review Suggested" triggers when any of these are true:**
- Zero commits fall within the event window (all commits are before or after the window)
- More than 2× as many commits exist before the window as during it (suggests the project was pre-built)
- More than 5 commits but concentrated in very few unique hours relative to the event length (suggests a bulk commit dump)

**A submission with zero commits inside the window will always show "Review Suggested" with no commit chart.** This is intentional flagging behavior, not a bug. It means either: (a) the code predates the event, (b) the event window in settings hasn't been corrected yet, or (c) the organizer needs to verify the submission date manually. The flag is a signal for a human reviewer — it is never an automatic rejection, and the UI says so explicitly.

### Submission Deletion

Organizer-only. Two endpoints are provided:

- **`DELETE /api/submissions/:id`** — Permanently deletes a single submission. Automatically cascades to all related `verification_results`, `uptime_logs`, and `judge_reviews` rows via PostgreSQL `ON DELETE CASCADE` constraints defined at the schema level. Confirmed working in production: deleting one submission row drops all three related child tables to zero rows simultaneously.

- **`DELETE /api/submissions`** — Deletes all submissions at once. Intended for resetting the platform between hackathons. Requires typing `DELETE ALL` in the UI confirmation input — a single click is not enough to trigger this action.

Both actions are always manually triggered. There is no automatic or scheduled deletion.

---

## Reusing the Platform Across Hackathons

The event window (start date, end date) and the judging deadline are stored in the database and configurable from the `/settings` page — they are **not hardcoded in environment variables or the source code**. This means the same deployed instance can be reused for a new hackathon without a code change, a redeployment, or a restart.

Before a new hackathon starts, an organizer:
1. Navigates to `/settings`
2. Updates the event start, event end, and judging end dates to match the new event
3. Optionally uses the Danger Zone "Clear all submissions" action to remove the previous hackathon's data

The worker picks up the new event window within 5 minutes (the in-memory cache TTL). All future verification jobs will use the updated dates immediately — no restart required.

The Deployment Instructions section above mentions `EVENT_START`, `EVENT_END`, and `JUDGING_END` environment variables. Those are now obsolete — **do not set them**. The worker no longer reads them. All date configuration goes through the `/settings` page and the `event_settings` database table.

