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

This project was built with the assistance of AI coding tools (Antigravity/Claude) for:
- Code generation and scaffolding
- TypeScript type definitions
- UI component implementation
- README drafting

All AI-generated code was reviewed, tested, and verified by the developer. The architectural decisions, verification philosophy, and product design were human-directed. AI was used as an accelerator, not as the architect.
