# KeepSeek — Project Handoff v19

**Date:** July 15, 2026
**Supersedes:** v18 (dated same day — v18 opened this session's work; this doc closes it out with confirmed fixes and test results). v17 (June 30) remains authoritative for exhaustive technical change-logs, Supabase schema, table IDs, routes, and the full historical Mistakes log.

---

## How to read this document

Same definition as v17/v18: "Launch" means opening KeepSeek beyond the friends test group. This session's top item — the Safari new-account loading hang first flagged in v17 and confirmed 100% reproducible in v18 — is now **fixed and confirmed working in both Safari and Chrome.**

---

## Current state (one paragraph)

The signup hang is resolved. Root cause was not browser-specific (Safari-only framing in v17/v18 turned out to be coincidental — see below); it was a timing race in the signup flow that affected every brand-new account in every browser, but only surfaced for testers whose accounts didn't already have a self-photo on file. Fixed via one call to an existing (previously unused) `refresh()` function in `AuthContext.jsx`. In the course of diagnosing it, found and fixed four separate instances of a second, related bug (Postgres/PostgREST's reserved `order` keyword being used incorrectly as a filter column) across two files. All fixes confirmed via live console testing in both Safari and Chrome: clean signup, no errors, gallery loads with a populated `keeperId` every time.

---

## THE BUG — now fixed and confirmed

**Root cause (confirmed by tracing the actual signup code, not inferred from logs):**

In `AuthPage.jsx`'s `handleSignup`, after `supabase.auth.signUp()` succeeds, the code runs a slug-uniqueness-check loop and then calls `/api/create-keeper` to actually insert the keeper's row — this takes real time. Meanwhile, `AuthContext.jsx`'s `onAuthStateChange` listener fires almost immediately (after only a 100ms debounce) and queries the `keepers` table for that user's row, to populate `keeperId`. The read always lost the race against the write — every time, in every browser — so `keeperId` stayed permanently blank, and any page waiting on it (the gallery, via `ItemGrid.jsx`'s `useEffect(() => { if (keeperId) loadItems() }, [keeperId])`) never called `loadItems()`, leaving the loading spinner stuck forever. A refresh or re-login worked because by then the row already existed.

**Why v17/v18 thought this was Safari-only:** almost certainly because friend testers and Michelle's own main account already had a self-photo on file by the time of testing, which happened to mask a secondary, co-occurring bug (below) that was originally mistaken for part of the same symptom. The core race itself was never actually browser-specific — confirmed this session by reproducing in Chrome as well as Safari.

**The fix — `AuthPage.jsx`:**
1. Destructure `refresh` from `useAuth()` (it already existed in `AuthContext.jsx`, just wasn't being called anywhere).
2. Call `await refresh();` immediately after the keeper row is confirmed created via `/api/create-keeper`, before `navigate('/profile/setup')`.

This forces `AuthContext` to re-fetch the keeper row at the one moment it's guaranteed to actually exist, instead of relying on the original timer-based read.

---

## Secondary bug found and fixed — the `order` reserved-word issue (4 instances)

While diagnosing the hang, a live `images` 400 error kept appearing in the console (`"failed to parse order (eq.0)"`). This is a known Postgres/PostgREST gotcha: `order` is a reserved query-string keyword, so filtering with `.eq('order', 0)` (intending "find the row where the order column equals 0") gets misread as a malformed sort instruction instead. It doesn't hang anything on its own — code after it kept running — but it silently fails to load a photo every time it fires.

**Confirmed via exhaustive search (`grep -rn "eq('order'" src/`), not by manual inspection alone.** Four instances found and fixed, all using the same corrected pattern (fetch sorted by `order` ascending, check the first result in JavaScript instead of filtering by it in the query):

- `src/services/airtable.js` — `updatePerson` (was line 343)
- `src/services/airtable.js` — `replaceItemPrimaryImage` (was line 565)
- `src/services/airtable.js` — `addPersonPhotoAsPrimary` (was line 616)
- `src/components/KeeperProfileSetup.jsx` — `loadProfile`'s photo-preview fetch (was line 68) — **this is the one that was actually firing live** during every fresh signup, since it runs on the profile-setup screen right after account creation
- `src/components/KeeperProfileSetup.jsx` — `handleSave`'s existing-photo check (was line 119) — latent, not yet observed firing live, but same bug

All four fixed and confirmed clean this session — final test logs (both Safari and Chrome) show no `images` 400 errors and successful `fetchItems` calls with a populated `keeperId`.

---

## Versioning question from v18 — resolved

v18 flagged an unexplained gap: a past session referenced "v18" work in its own file-change notes back in April 2026, before v17 (dated June 30) even existed. Checked this session by searching past conversation history: it's a real session (April 22, 2026, "Debugging relationship issues after recent changes") that used "v18" as an internal label in its own notes without ever producing a filed handoff doc — not a lost or reverted piece of work. That session changed three files:
- `SeekerAuthPage.jsx` — signingUp ref, sessionChecked fix, images query fix, `window.location.href` in `handleRelationshipSubmit`
- `AuthContext.jsx` — setTimeout delay 0→100ms, debounce via `resolveTimer` ref
- `SeekerDashboard.jsx` — connectionsSettled boolean, guarded slugs list

**Confirmed this session:** the `AuthContext.jsx` change from that April session (100ms setTimeout + `resolveTimer` debounce) is present in the current codebase — verified by reading the file directly, not just from the chat log. That question is now fully closed; no further action needed.

---

## Before Launch — carried forward from v18, untouched this session

1. iPhone 12 horizontal scroll — still unverified/unresolved.
2. Editing a person/connection after creation (discoverability) — still unresolved.
3. Re-login navigation dead-end (Jean's "couldn't find how to add another person") — still unresolved.
4. Hide broken photo-edit controls (brightness, remove-background) — status unknown, not retested.
5. Rename "Complete Entry" button — status unknown, not retested.

*(EditItemForm story-save bug, empty-gallery corner button, and now the signup hang + all four `order` bugs — all confirmed fixed, no reason to suspect regression.)*

---

## Process notes carried forward, plus new ones from this session

- All v17/v18 process notes still apply.
- **New computer's Vercel CLI is now installed and linked** — `vercel --prod` works normally again from `/Users/PrettyBaby/Desktop/keepseek-unified-icloud`. If a global npm install ever needs `sudo` again on this machine, something regressed — it shouldn't, since `~/.npm-global` is now configured to avoid that permanently.
- **`localStorage.clear()` before every fresh-signup test, no exceptions.** Two testing rounds this session showed two different user IDs resolving in the same browser session — evidence of a skipped clear, not a bug. Didn't cause a problem this time, but is exactly the kind of thing that could show one account's data under another's if timing landed differently.
- **When an edit spans several lines, full-file swaps can be faster and less error-prone than manual find/replace** — worth defaulting to for larger or scattered changes; snippet-level find/replace remains the default for small, contained edits (per Michelle's preference, confirmed this session).
- **Security note (already added as a standing instruction, not just this doc):** Michelle should always be proactively told when a screenshot, log, or pasted response contains a live key, token, or credential — she can't reliably spot this herself.

---

## Strategic context, competitive landscape, pricing signal

Unchanged from v17/v18 — refer to those documents. Nothing this session touched product positioning, pricing, or competitive strategy.

---

## Immediate next step

No open blocker remains from this session. Pick up the v18 "Before Launch" backlog (items 1–5 above) next — none were touched or retested this session.
