# GEO Case Study: ContentEngine README

*A self-directed exercise applying GEO principles to my own project's docs.*

## Why this exists

I don't have a GEO case study with real citation data yet the writing I've done (onboarding docs, QA bug reports) lives inside internal wikis, not anywhere a crawler or an AI retrieval system could ever reach. Rather than dress that up as something it isn't, I picked something public I already knew well and rewrote it with GEO in mind, so you can see the actual before and after.

## The audit

I asked: if someone typed "what is ContentEngine and how does its eval harness work" into an AI system, what sub-questions would it need answered?

- What does this project do, in one sentence?
- What's the stack?
- How does the eval/scoring system actually work?
- How do I run it?

Then I checked the original README against each one.

## Before / after

**Original opening line:**
> Draft → evaluate → revise loop for technical writing.

Six words, no verb, no subject stated outright. Fine as a tagline under a repo name on GitHub, where the title supplies context. Useless as a standalone quote, an AI pulling this sentence out of its page has nothing citable.

**Rewritten opening line:**
> ContentEngine is a TypeScript pipeline that improves AI-generated technical writing by running each draft through an automated evaluation harness and revising it against the harness's own critique, rather than accepting the first output a model produces.

Longer, but it stands alone. Pull it out of the document entirely and it still answers "what is this" on its own.

## What else was wrong

| Problem | Why it hurts GEO |
|---|---|
| Tagline opener, not a full claim | Nothing quotable |
| No Q&A section | Doesn't match how people phrase questions to AI |
| Architecture only shown as a file-path table | Tells you *where* code lives, not *what it does* no conceptual answer to pull |
| Setup and concept explanation mixed together | Retrieval grabs a noisier, less useful chunk |

## What changed

- Rewrote the opener as a complete, self-contained claim
- Added a Q&A block, phrased the way someone would actually ask an AI about this project
- Split "what it does" (citable) from "how to run it" (not citable, nobody asks an AI to quote install steps)
- Kept the existing tables, but added a line of context above each so a retrieved chunk isn't just a bare table with no claim attached

Full result is in `README-rewrite.md`, now live on `main`. The original wasn't bad writing, it just wasn't written to be *quoted*, which is the actual shift GEO asks for.

## What I'd track if this were a live customer

No real search traffic here, so no citation-rate numbers to report, and I'd rather say that plainly than fake it. On an actual engagement, I'd track: appearance rate across a fixed set of baseline prompts run against ChatGPT/Perplexity/AI Overviews, share-of-voice against named competitors on those prompts, and AI-referral traffic before/after the rewrite, where attributable.
