# Content Engine

Draft → evaluate → revise loop for technical writing. Built as a portfolio demo for a Content Engineer / AI DevRel role: prompts, eval harness, and UI stay clearly separated.

## Stack

- Next.js 15 (App Router) + React + TypeScript
- Tailwind CSS
- Vercel AI SDK (`ai` + `@ai-sdk/openai`) via Groq’s OpenAI-compatible API
- Zod for structured eval output
- Biome (lint/format) + Vitest (unit tests)

No database — everything is stateless per request.

## Architecture

| Layer | Role |
|---|---|
| `lib/ai` | Groq client, system prompts, Zod schemas |
| `lib/harness` | Rubric dimensions, `runEval`, fixtures |
| `lib/pipeline` | `generateDraft` / `reviseDraft` / `runPipeline` |
| `app/api/*` | Thin JSON route handlers |
| `components/*` | Brief form, draft view, scorecard, stepper |
| `evals/*` | Fixed cases + CLI pass/fail runner |

**Models:** `llama-3.3-70b-versatile` for draft/revise, `llama-3.1-8b-instant` for eval.

## Setup

1. Copy env file and add a free Groq key from [console.groq.com](https://console.groq.com/keys):

```bash
cp .env.example .env.local
# edit .env.local → GROQ_API_KEY=gsk_...
```

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm test` | Vitest (mocked AI — no API key needed) |
| `npm run evals` | Live Groq eval suite → `evals/results/<timestamp>.json` |
| `npm run lint` | Biome check |

## Eval CLI

Requires `GROQ_API_KEY`. Runs each case in `evals/cases.ts` through draft + eval, compares scores to `minScores`, prints a pass/fail table, and writes full JSON under `evals/results/`.
