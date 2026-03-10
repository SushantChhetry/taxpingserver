# TaxPing — CTO Rules for Claude Code

## What This Product Does
SMS-native AI document collection for solo tax preparers.
Client texts a photo → Claude classifies it → file lands in preparer's Google Drive.
That's the whole product. Do not expand scope beyond this.

## Stack (non-negotiable)
- Runtime: Node.js 20 / TypeScript (strict mode)
- Framework: Express
- Database: Postgres via `pg` library — NO ORM
- SMS: Twilio Programmable Messaging (raw webhooks, NOT Conversations API)
- AI: Anthropic SDK — Haiku for image classification, Sonnet for conversation
- Storage: Google Drive API v3 via `googleapis`
- Jobs: node-cron (NOT BullMQ)
- Testing: Vitest

## Architecture Rules
- The inbound message handler must complete all 8 pipe steps in order
- Conversation state lives ONLY in Postgres — never in memory
- Every Drive write must have retry logic (3 attempts, exponential backoff)
- Failed Drive writes go to a `dead_letter_queue` table — never silently dropped
- Claude Haiku classifies images. Claude Sonnet writes conversational replies.
- Keep them separate. Never use Sonnet for classification.

## What We Are NOT Building
- No Dropbox integration
- No Stripe/payments
- No self-serve signup flow (preparer provisioning is manual for now)
- No LangChain or any agent framework
- No email notifications
- No mobile app

## Code Style
- No `any` types in TypeScript
- All async functions must have explicit error handling
- SQL queries go in `src/db/queries.ts` — no inline SQL elsewhere
- Environment variables validated at startup via a `validateEnv()` function
- Keep functions under 40 lines — extract if longer

## The One Metric That Matters
Time from client receiving first SMS to first file in Drive must be < 5 minutes.
Every architectural decision should be evaluated against this.
