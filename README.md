# HealTrip AI Patient Decision Assistant — Prototype

A small, buildable slice: a patient describes symptoms → the agent asks clarifying questions → decides the next step
(ER / cardiologist / second opinion) → **fetches real providers through a tool** → answers only from DB rows.
Bilingual (EN/AR, RTL). Scope is deliberately **chest pain only**.

```bash
node src/server.js        # http://localhost:3000  (Node >= 18, zero dependencies)
node src/test.js          # policy, grounding and tool-validation tests
ANTHROPIC_API_KEY=... node src/server.js   # optional: LLM-based understanding
```

## Architecture

```
Browser (chat UI, EN/AR)
   │ POST /api/chat {sessionId, message, lang}
   ▼
API layer (server.js): validation · rate limit · size cap · security headers · no message logging
   ▼
Agent (agent.js)
   1. NLU (nlu.js)      LLM or rules → slots JSON (complaint, redFlags, duration, city…)  [untrusted → sanitized]
   2. Triage policy     deterministic code: emergency | ask | urgent-cardiology
   3. Tools (tools.js)  search_providers(args) — schema-validated, allowlisted
   4. Grounding gate    every provider shown must appear in a tool result, else request fails
   ▼
Data (db.js mock  →  PostgreSQL)
```

### Key decision: the LLM does not make medical decisions
Safety-critical routing (is this an emergency?) is **deterministic code**, testable and auditable. The LLM is used where it is
strong — understanding messy Arabic/English text into structured slots. If the LLM fails or times out, rules take over
(graceful degradation, and red-flag detection never depends on an API being up).

### Preventing fabricated information
1. Provider facts (names, fees, cities, ER availability) come **only** from tool results; the LLM never writes them.
2. The response carries provider *rows from the DB*, rendered by the client — not free text about providers.
3. `assertGrounded()` rejects any card whose id was not returned by a tool call in this turn.
4. Tool args are validated against an enum/type schema; unknown tools/args throw. Empty result → explicit "no match", never a guess.
5. Trace of tool calls is returned and shown in the UI (`Agent trace`) for auditability.
6. If you later let the LLM phrase the answer: give it only tool rows, require JSON with provider ids, run the same gate.

## Database (PostgreSQL target)

```sql
CREATE TABLE providers (
  id            text PRIMARY KEY,
  type          text NOT NULL CHECK (type IN ('doctor','hospital')),
  name_en       text NOT NULL,  name_ar text NOT NULL,
  city          text NOT NULL,
  er_available  boolean NOT NULL DEFAULT false,
  second_opinion boolean NOT NULL DEFAULT false,
  fee_egp       int,
  rating        numeric(2,1),
  languages     text[] NOT NULL DEFAULT '{ar,en}'
);
CREATE TABLE specialties (id serial PRIMARY KEY, code text UNIQUE NOT NULL);           -- cardiology, emergency…
CREATE TABLE provider_specialties (provider_id text REFERENCES providers, specialty_id int REFERENCES specialties,
  PRIMARY KEY (provider_id, specialty_id));
CREATE TABLE conversations (id uuid PRIMARY KEY, created_at timestamptz DEFAULT now(), slots jsonb);   -- no raw text stored
CREATE TABLE agent_traces (id bigserial PRIMARY KEY, conversation_id uuid, tool text, args jsonb, result_ids text[], at timestamptz DEFAULT now());
```
The mock in `db.js` has the same shape. `search_providers` becomes a parameterized query (never string-built SQL).

## API
| Endpoint | Purpose |
|---|---|
| `POST /api/chat` | `{sessionId, message≤1000, lang}` → `{reply, urgency, questions[], cards[], trace[]}` |
| `GET /health` | liveness |

## Security
Input length/type validation · 10KB body cap · 30 req/min/IP · CSP, nosniff, frame deny · UI uses `textContent` (no XSS) ·
API key server-side only · user text is passed to the LLM as data with an extraction-only prompt and output is whitelisted
(prompt-injection can at most set a slot) · messages are not logged (PHI) · tool allowlist prevents arbitrary actions.

## Error handling
LLM timeout/invalid JSON → rules fallback · tool validation error → 500 with a safe message that repeats the emergency number ·
no results → honest "no match" · UI shows a connection error that includes the emergency number.

## Assumptions & limits
- Data is fictional; the emergency number `123` (Egypt ambulance) is configurable via `EMERGENCY_NUMBER`.
- Regex NLU is a fallback, not clinical-grade; negation handling ("no" at start = denies red flags) is naive.
- Sessions are in-memory (Redis in production). No auth, no persistence, no multi-turn LLM memory.
- Medical rules here are illustrative and need clinician review before any real use. Not a diagnosis tool.

## Path to production (NestJS)
`ChatController` → `AgentService` (NLU provider interface: Rules | Claude) → `TriageService` (policy) →
`ToolsModule` (`ProvidersTool` via TypeORM/Prisma) · Redis sessions · pgvector for symptom→specialty retrieval ·
more complaints as pluggable triage protocols · audit log · eval suite of red-flag cases run in CI.
