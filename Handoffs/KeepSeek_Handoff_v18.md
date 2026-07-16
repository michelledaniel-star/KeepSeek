# KeepSeek — Project Handoff v18

**Date:** July 15, 2026
**Supersedes:** v17 (dated June 30, 2026 — still authoritative for exhaustive technical change-logs, Supabase schema, table IDs, routes, and the full historical Mistakes log; this doc does not reproduce those, it carries forward what changed)

---

## A note on versioning — please confirm

A past session (April 22, 2026) referenced work as "v18" in its own file-change notes, but the project's actual most recent handoff on file is v17, dated June 30 — later than that April session. This numbering doesn't line up. It's possible that April "v18" work was on a branch that never got folded into what became v17, or the number was just reused loosely in a chat title rather than a real filed doc. Worth a quick check: confirm whether anything from that April session (AuthContext debounce timing, SeekerAuthPage session-check fixes) made it into the codebase, or whether it's still sitting unapplied somewhere. Not urgent, but worth not losing track of.

This document is numbered v18 because it's the next one after the v17 file that's actually in the project folder.

---

## How to read this document

Same definition as v17: "Launch" means opening KeepSeek beyond the friends test group. This session did not add product features — it was infrastructure and security work triggered by a computer migration, plus a re-confirmed bug that now blocks the next testing round.

---

## Current state (one paragraph)

Michelle moved the project to a new computer (Mac Studio, project folder now `/Users/PrettyBaby/Desktop/keepseek-unified-icloud`, replacing the old laptop path). During the move, real API key values were pasted into a chat conversation, which triggered a full security cleanup: migrating off Supabase's legacy anon/service_role JWT key system onto the new publishable/secret key system, then disabling the legacy keys entirely. That work is **done and confirmed working** — signup, invite, and normal keeper login all tested successfully on the new keys. In the course of testing, a previously-intermittent bug from v17 ("Safari, first load of a brand-new account, loading hangs") was **re-tested and is now 100% reproducible**, not intermittent. This is the single open item blocking the next testing round.

---

## Work completed this session

1. **Computer migration.** Project now lives at `/Users/PrettyBaby/Desktop/keepseek-unified-icloud` on a new Mac Studio. Vercel CLI is not yet installed on this machine (`vercel: command not found`) — use the **Redeploy button in the Vercel dashboard** as a working substitute until the CLI is reinstalled (confirmed this session: dashboard Redeploy picks up all current Environment Variable values in one build, same as `vercel --prod`).

2. **Supabase key security incident — fully resolved.** Real key values were pasted into a Claude chat. Response and current state:
   - Supabase's **legacy anon/service_role keys are JWTs signed by the project's JWT secret** — once a project has migrated to the newer asymmetric JWT Signing Keys system (this project migrated ~4 months prior to this session), **it is no longer possible to rotate the legacy JWT secret or get new legacy key values.** This is a permanent Supabase-side limitation, not something broken on our end — confirmed via Supabase's own documentation this session.
   - The correct, Supabase-recommended path: migrate to the **new publishable/secret key system** (`sb_publishable_...` / `sb_secret_...`). These are not JWTs, rotate independently of any signing key, and — critically — rotating them does **not** invalidate existing user sessions.
   - Confirmed `@supabase/supabase-js@2.110.2` (the version already installed) works with the new key format with zero code changes needed — it's a pure value swap in the same `createClient(url, key)` call already in use everywhere.
   - Values were swapped into the **same existing variable names** (`VITE_SUPABASE_ANON_KEY` now holds the `sb_publishable_...` value; `SUPABASE_SERVICE_ROLE_KEY` now holds the `sb_secret_...` value) in both local `.env` and Vercel Environment Variables, then redeployed via the Vercel dashboard.
   - **Legacy anon/service_role keys have since been disabled** in Supabase (Settings → API Keys → Legacy tab → Disable JWT-based API keys). Confirmed no OAuth apps depended on them (only Claude's own Supabase connector was listed as an authorized app, which is unrelated to the app's own API keys).
   - Tested and confirmed working after disabling: new signup, invite send, and existing main keeper account login all work correctly on the new keys alone.

3. **`.env` / Vercel cleanup (in progress).** Two leftover unprefixed duplicate variables (`SUPABASE_URL` and `AIRTABLE_TOKEN`, without the `VITE_` prefix) were confirmed unused anywhere in the codebase via `grep`. Michelle is deleting these from both `.env` and Vercel; redeploy once done so the live build matches.

4. **Still pending, not urgent:** `RESEND_API_KEY` and the still-in-use `AIRTABLE_TOKEN`/`VITE_AIRTABLE_TOKEN` were also visible in an exposed screenshot during this session's cleanup. They were not rotated this session (lower urgency, no evidence of misuse) but should be rotated at some point as the same hygiene principle applies.

---

## THE OPEN BUG — fix first (Before Launch, top priority)

**Safari: brand-new account signup hangs on "loading" over the empty gallery, indefinitely, every time.**

- **v17 status (before this session):** flagged as a one-time, non-reproducing "tripwire" — hung once, recovered on re-login, could not be reproduced in Chrome or on retry. Explicitly marked "do NOT chase blind."
- **This session's status: promoted to confirmed, repeatable bug.** Michelle tested multiple new signups on Safari — it happens **every single time** a brand-new account is created, not intermittently.
- **What's confirmed:**
  - Only affects the very first load after a brand-new signup — logging into an existing/main keeper account works fine, every time.
  - Browser-specific to Safari (consistent with v17's original note that it did not reproduce in Chrome).
  - A manual refresh, or logging out and back in, clears it — the account is fine afterward, this is purely a first-load issue.
  - Very likely **unrelated to this session's Supabase key migration** — the symptom was already documented in v17, before any key work happened this session, and the main keeper account (using the same new keys) logs in without issue. Worth a quick console check to rule this out definitively, but don't assume the key work caused it.
- **Not yet gathered:** Safari console/network output. Safari's developer tools were not enabled on this new computer during this session — Michelle has since enabled them (Safari → Settings → Advanced → "Show features for web developers"). **Next session should start by reproducing the bug and capturing the Console tab and Network tab output** during the hang — specifically watching for a failed or slow request around initial auth/data resolution, and any 400/timeout on the images or connections query.
- **Worth checking, not confirmed:** a separate April 2026 session diagnosed a similar-flavored Safari/timing bug on the *seeker* auth path — a race between the JWT being written to `localStorage` and `resolveUser` firing in `AuthContext.jsx`, fixed via a `setTimeout` delay and a `resolveTimer` debounce ref. That fix was for seekers, not keepers, and it's not confirmed the same root cause applies here — but given both bugs are Safari-specific auth-timing issues, it's worth checking whether the keeper signup path has an analogous unhandled race, especially since Safari's storage/ITP behavior differs from Chrome's in ways that commonly surface exactly this class of bug.
- **Why this matters for the testing round:** AuthPage already recommends Safari as a supported browser. If this is genuinely 100% reproducible, every Safari tester hits a stuck loading screen as their very first impression of the product, before seeing a single item. This is a first-impression bug, not a cosmetic one.

---

## Before Launch — carried forward from v17, still open

1. iPhone 12 horizontal scroll — still unverified/unresolved as of v17; not retested this session.
2. Editing a person/connection after creation (discoverability) — still unresolved as of v17.
3. Re-login navigation dead-end (Jean's "couldn't find how to add another person") — still unresolved as of v17.
4. Hide broken photo-edit controls (brightness, remove-background) — status unknown, not retested this session.
5. Rename "Complete Entry" button — status unknown, not retested this session.
6. **NEW, promoted from "watch" to confirmed:** Safari new-account loading hang (see above) — now the top item.

*(EditItemForm story-save bug and empty-gallery corner button were confirmed done as of v17 — not retested this session, but no reason to suspect regression.)*

---

## Process notes carried forward, plus new ones from this session

- All v17 process notes still apply (read files before find/replace, confirm bugs reproduce, don't relitigate settled architecture, `localStorage.clear()` before auth testing).
- **New computer, new terminal quirk:** if a terminal command "does nothing," check whether that terminal tab is still running `npm run dev` (or another long-running process) — commands typed into a busy terminal don't execute, they just sit as unsent text. Ctrl+C to free it up, confirm with a plain `pwd` before running anything else.
- **Vercel CLI needs reinstalling on this new computer** (`npm install -g vercel`, then `vercel login`, then `vercel link` from inside the project folder — link to the existing project, don't create a new one). Until done, the Vercel dashboard's Redeploy button is a confirmed-working substitute.
- **Never screenshot the `.env` file with real values visible** — describe variable names in words, or crop tightly to show only names, not values, when confirming file contents in chat.
- **Supabase key architecture, for future reference:** this project uses the new publishable/secret key system (not legacy anon/service_role, which is now disabled). If a future session needs to rotate a key again, it's a simple, safe, non-disruptive action in Supabase's "Publishable and secret API keys" tab — no JWT secret involved, no session invalidation risk.

---

## Strategic context, competitive landscape, pricing signal

Unchanged from v17 — refer to that document. Nothing in this session's work touches product positioning, pricing, or competitive strategy.

---

## Immediate next step

Reproduce the Safari new-account loading bug with DevTools open (now enabled). Capture:
1. Console tab — any red errors during the hang
2. Network tab — any request that fails, times out, or hangs during the hang, especially around auth resolution or the initial items/images fetch

That data is what the actual fix depends on — don't guess at a fix without it.
