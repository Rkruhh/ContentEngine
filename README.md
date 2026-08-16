# Content Engine

ContentEngine is a TypeScript pipeline that improves AI-generated technical writing by running each draft through an automated evaluation harness and revising it against the harness's own critique, rather than accepting the first output a model produces.

## Q&A

**What does ContentEngine do?**
It runs a draft → evaluate → revise loop: a model generates a first draft of technical content, a separate rubric-based evaluator scores it on defined quality dimensions, and — if it falls short — the system revises the draft against that specific feedback before returning it.

**What stack is it built on?**
Next.js 15 (App Router) and TypeScript on the frontend, the Vercel AI SDK against Groq's OpenAI-compatible API for generation, local Transformers.js embeddings for RAG (`Xenova/all-MiniLM-L6-v2`), Zod for structured/validated eval output, and Biome + Vitest for linting and testing. Workspace/memory/knowledge persist as local JSON — no hosted database.

**How does the eval harness work?**
Each draft is scored against fixed rubric dimensions defined in `lib/harness/rubric.ts`. `runEval` compares the draft to fixture examples (`good-example.md`, `bad-example.md`) and returns a structured, typed score via Zod — not a free-text opinion — so scores are comparable across runs and can gate whether a revision cycle triggers.

**Can I run the evals without an API key?**
Yes for the test suite (`npm test` uses mocked AI calls). Running the live eval suite against real model output (`npm run evals`) requires a `GROQ_API_KEY`.

## Architecture

The system is organized so that generation, evaluation, and orchestration are separate concerns — each can be tested or swapped independently.

| Layer | Role |
|---|---|
| `lib/ai` | Groq client, system prompts, Zod schemas |
| `lib/harness` | Rubric dimensions, `runEval`, fixtures |
| `lib/pipeline` | `generateDraft` / `reviseDraft` / `runPipeline` |
| `lib/knowledge` | RAG: parsers → chunker → local embeddings → JSON vector store → retriever |
| `app/api/*` | Thin JSON route handlers |
| `components/*` | Brief form, draft view, scorecard, stepper |
| `evals/*` | Fixed cases + CLI pass/fail runner |

**Models:** `llama-3.3-70b-versatile` for draft/revise, `llama-3.1-8b-instant` for eval. RAG embeddings run locally (default `Xenova/all-MiniLM-L6-v2`) — no OpenAI key.

## Setup

1. Copy the env file and add a free Groq key from [console.groq.com](https://console.groq.com/keys):

```bash
cp .env.example .env.local
# edit .env.local → GROQ_API_KEY=gsk_...
# optional: EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Knowledge Base / RAG

- Embeddings run **locally** via `@huggingface/transformers` (`LocalEmbeddingService`).
- **No `OPENAI_API_KEY`** is required for ingest or retrieval.
- Groq still handles Writer / Critic / Editor / Evaluator text generation.
- Vectors stay in local JSON (`data/knowledge/`) behind the `VectorStore` abstraction.
- The first ingestion may take longer while the embedding model downloads and caches (typically under `~/.cache/huggingface/`). Model weights are **not** committed to git.
- Optional: set `EMBEDDING_MODEL` to another Transformers.js-compatible feature-extraction model.
- Optional integration test for the real model: `RUN_LOCAL_EMBEDDING_INTEGRATION=1 npm test -- tests/local-embedding.integration.test.ts`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm test` | Vitest (mocked AI — no API key needed) |
| `npm run evals` | Live Groq eval suite → `evals/results/<timestamp>.json` |
| `npm run lint` | Biome check |

## Eval CLI

Requires `GROQ_API_KEY`. Runs each case in `evals/cases.ts` through draft + eval, compares scores against `minScores` thresholds, prints a pass/fail table, and writes the full result JSON to `evals/results/`.
