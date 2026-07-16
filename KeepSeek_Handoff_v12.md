# KeepSeek — Project Handoff v12

## The Product

KeepSeek is a private family heritage platform. A keeper catalogs family heirlooms with photos, stories, and provenance. Seekers (the keeper's family) receive invitation links and browse the collection with personalized relationship labels.

The keeper is always one person — never a couple. The thrust of KeepSeek is the stories behind the things, not the things themselves. Each keeper's collection is fully isolated — multiple keepers can have accounts and never see each other's data.

---

## Michelle

- Graphic designer learning React
- Be concise and direct
- Give explicit file paths and terminal commands
- Don't ask clarifying questions with jargon — explain what you need and why
- She uploads files directly to chat for you to read
- She replaces files manually in her project folder after downloading from chat
- Always ask for clarification before building
- Never lie to be nice — always give the truth and the best way forward, not easiest or fastest
- Always put the best solution first, not the fastest or simplest. Michelle will push back if she thinks you're cutting corners — take that seriously and think harder before responding
- Look at every problem from multiple angles before proposing a solution
- Do not flatter or be fake nice
- Do not suggest patches or quick fixes — always find the root cause
- When giving code changes, always give exact find/replace with no ambiguity
- Never create downloadable files for code changes — give find/replace instructions only
- Always check current file state before writing changes — ask Michelle to upload the file first
- When Michelle says "x10 think" — stop, look at the problem from every angle, do not give the fastest or easiest answer

---

## Local Setup

- Project path: `/Users/michelledaniel/Downloads/keepseek-unified-fixed-2/`
- Production URL: `https://mykeepseek.com`
- Dev: `npm run dev` → localhost:3000
- Deploy: `vercel --prod`
- Stack: React + Vite + Tailwind CSS
- Build check: `npm run build` — always run before deploying when making JSX changes

---

## Services & Keys

- Cloudinary cloud: `dg5pprmpg`, preset: `everheld`
- Supabase keys in `.env`
- Resend — email provider, domain: `mykeepseek.com` — verified ✅
- `RESEND_API_KEY` is set in Vercel via the Resend-Vercel native integration (not manually)
- Supabase SMTP also uses a separate Resend API key — both must be valid
- All other keys are in `.env` file, not hardcoded

---

## Environment Variables

In both `.env` and Vercel (all environments):

- `VITE_SUPABASE_URL` — used by frontend
- `VITE_SUPABASE_ANON_KEY` — used by frontend
- `SUPABASE_URL` — used by serverless functions (same value as `VITE_SUPABASE_URL`, different name because Vite prefixes don't work in Node)
- `SUPABASE_SERVICE_ROLE_KEY` — used by serverless functions, bypasses RLS
- `RESEND_API_KEY` — managed by Resend-Vercel native integration, do NOT manually edit

Note: `VITE_AIRTABLE_TOKEN` and `AIRTABLE_TOKEN` have been removed. Airtable migration is complete.

---

## Domain

- `mykeepseek.com` — purchased from GoDaddy, connected to Vercel ✅
- DNS verified in Resend ✅
- Supabase Site URL and Redirect URLs updated to mykeepseek.com ✅

---

## Supabase Configuration

**Authentication → URL Configuration:**
- Site URL: `https://mykeepseek.com`
- Redirect URLs: `https://mykeepseek.com/auth/confirm`

⚠️ Critical: Both keeper and seeker `supabase.auth.signUp` calls pass `emailRedirectTo: 'https://mykeepseek.com/auth/confirm'` explicitly. If this is missing, Supabase falls back to the Site URL and confirmation links break.

**Stale sessions during development:**
When you delete a Supabase user and create a new one during development, any browser that had the old session will show auth errors on next load. Fix: clear site data in that browser (Chrome: DevTools → Application → Clear site data. Safari: Settings → Privacy → Manage Website Data → remove mykeepseek.com entry). This is a development-only issue — real users never have their accounts deleted.

**Resetting all test data (SQL nuke):**
Run this in Supabase → SQL Editor in this exact order:
```sql
UPDATE keepers SET self_person_id = NULL;
DELETE FROM stories;
DELETE FROM images;
DELETE FROM items;
DELETE FROM people;
DELETE FROM access;
DELETE FROM seekers;
DELETE FROM keepers;
```
Then go to Authentication → Users and delete auth users manually — SQL cannot reach that table.
Then clear site data in every browser profile before testing again.

**Circular reference when deleting keeper:**
`keepers.self_person_id` points to `people.id` and `people.keeper_id` points back to `keepers`. The SQL nuke handles this with `UPDATE keepers SET self_person_id = NULL` first. Do not skip it.

**Deleting a seeker during testing:**
1. Supabase → Table Editor → access → delete the seeker's row(s)
2. Supabase → Table Editor → seekers → delete the seeker's row
3. Supabase → Authentication → Users → delete the auth user
Then clear site data before testing again.

**Foreign key on items.person_id:**
`items_person_id_fkey` is set to `ON DELETE SET NULL` — deleting a person sets their items' `person_id` to null. Changed from `NO ACTION` in v12. Do NOT revert to `NO ACTION`.

---

## Supabase Tables (current — post-migration)

- **keepers** — id, user_id (uuid), slug, email, name, self_person_id (uuid), profile_complete (bool, default false), created_at
- **seekers** — id, user_id (uuid), email, name, created_at
- **access** — id, seeker_id (uuid), keeper_slug, relationship, generation (integer), status, created_at
- **people** — id, keeper_id (uuid), name, middle_name (text, nullable), maiden_name (text, nullable), photo (text, legacy), relationship, side, generation (integer, default 0), location, birthdate, years, notes, created_at
- **items** — id, keeper_id (uuid), person_id (uuid, nullable), name, description, status (default 'draft'), year, image_url (text, legacy), category, value, beneficiary, notes, created_at
- **stories** — id, item_id (uuid), story_type, text_content, media_url, created_at
- **images** — id, item_id (uuid, nullable), person_id (uuid, nullable), url, order (integer, default 0), caption (text, nullable), created_at

⚠️ `people.photo` and `items.image_url` still exist as legacy columns but are no longer written to. Drop in a future cleanup pass.
⚠️ `keepers.airtable_person_id` still exists as a legacy column. Drop in a future cleanup pass.

### Key relationships
- `keepers.self_person_id` → `people.id` — the keeper's own person record (relationship = 'Self')
- `items.person_id` → `people.id` — nullable, SET NULL on person delete
- `images.item_id` OR `images.person_id` — belongs to either an item or a person, never both
- `images.order = 0` is always the primary image

### Name fields in people table
- `name` — always `First Last` — display name used everywhere
- `middle_name` — nullable, stored separately
- `maiden_name` — nullable, stored separately
- Full formal name assembled at render time: `First Middle (Maiden) Last`
- `keepers.name` mirrors `people.name` for Self person — synced by `updatePerson` on save

### RLS Policies
- keepers: Public can read slugs (SELECT), Users can read/insert/update own row
- seekers: Users can read/insert own row
- access: Public can read rows, Seekers can read own rows, Anyone can insert
- people: Keepers can read/insert/update/delete own rows, Seekers can read people for keepers they have access to
- items: Keepers can read/insert/update/delete own rows, Seekers can read public items for keepers they have access to
- stories: Keepers can read/insert/update/delete via item ownership, Seekers can read stories for items they can access. ⚠️ ON DELETE CASCADE on item_id
- images: Keepers can read/insert/update/delete for own items/people, Seekers can read for public items/people. ⚠️ ON DELETE CASCADE on both item_id and person_id

⚠️ All four seeker RLS policies compare `a.seeker_id = auth.uid()` directly. Do NOT revert to using `seekers.id`.

---

## Auth Architecture (current — v12)

**`AuthProvider` wraps the entire app** — mounted once inside `<Router>`. Do NOT move inside individual routes.

**`onAuthStateChange` uses `setTimeout(fn, 0)`** to defer `resolveUser` outside the Supabase auth lock. Do NOT make async or await inside it.

**`onAuthStateChange` filters `TOKEN_REFRESHED` and `PASSWORD_RECOVERY`** — these do not change who the user is. Do NOT remove this filter.

**`resolveUser` does NOT call `setReady(false)`** — once `ready` is true it never goes back to false until logout. Removing `setReady(false)` fixed a flash on seeker login caused by two simultaneous resolves.

**`resolveUser` uses a version ref** (`resolveVersion`). Each call increments the version. Only the call whose version matches at `finally` time sets `ready: true`.

**`AuthContext` always loads both keeper and seeker data.** `userType` = `'keeper'` if keeper row exists, `'seeker'` if only seeker row exists. `connections` always populated if seeker access rows exist.

**`AuthConfirm` uses `useAuth()` context** — no polling. Renders loading screen until `ready`, then routes based on `userType` and `connections`. Fixed bug where keeper was routed to `/viewer` when clicking a seeker confirmation link.

**Login routing:**
- Keepers → `/auth` → `/viewer` (or `/profile/setup` if incomplete)
- Seekers → `/auth` → gallery (one keeper) or `/seeker` dashboard (multiple)
- Seekers can also log in at `/s/:slug` → that specific gallery
- Keepers should NOT log in at `/s/:slug`

**`AuthPage` login handler** — queries `keepers` directly after `signInWithPassword` for fast keeper routing. Seekers handled by `onAuthStateChange` + already-logged-in guard. Do NOT add `access` query back.

**`AuthPage` hooks** — `signupData` state declared before the early return guard. Do NOT move it below — rules-of-hooks violation.

**`AuthPage` seeker mode** — `/auth?role=seeker` hides Create Account tab and "Don't have an account?" link.

---

## Item Status Logic

**New items default to `'public'` if no confirmed seekers exist, `'draft'` if confirmed seekers exist.**

`AddItemForm` calls `setDefaultStatus()` on mount. Checks `access` rows for this keeper's slug, then checks whether any of those seeker IDs have a `seekers` row (confirmed account). If yes → `'draft'`. If no → `'public'`.

Items added before anyone joins are immediately visible when the first seeker arrives. Items added after seekers are active are drafts until the keeper publishes them.

**"Share with Seekers" banner** — appears in `ItemGrid` when `hasSeekers` is true and `draftCount > 0`. Clicking calls `/api/notify-seekers` which should publish all drafts and email confirmed seekers. `ItemGrid` calls `invalidateCache('items-${keeperId}')` before re-fetching after the API call.

⚠️ Banner is currently not disappearing after clicking — `notify-seekers` returns 200 but items are not being updated to `public` in Supabase. Next step: check Vercel → Functions → notify-seekers logs for the specific run to find where the update is failing server-side.

---

## File: `airtable.js`

Despite the name, fully migrated to Supabase. Contains all data fetching and mutation functions plus a module-level cache with 60-second TTL. Exports `invalidateCache(key)` — pass `items-${keeperId}` or `people-${keeperId}` to bust a specific entry, or no argument to bust all. All mutating functions call `invalidateCache` automatically.

Will be renamed `supabaseData.js` in a future cleanup pass. All imports reference `'../services/airtable'`.

⚠️ Cache does not store empty results — prevents poisoned cache from failed fetches.

---

## Landing Page (v12)

- Split layout: Keeping left, Seeking right, vertical border divider. Mobile stacks vertically.
- "Start Keeping" → `/auth`
- "Start Seeking" → modal explaining invitation-only. Modal has "Log In" → `/auth?role=seeker` and "Back"
- No animations, no external assets

---

## create-seeker.js (v12)

Handles duplicate signups — checks for existing `seekers` row before inserting, checks for existing `access` row before inserting. Same email can accept invitations from multiple keepers without errors.

---

## notify-seekers.js (v12)

⚠️ Was querying `seekers` table by `id` instead of `user_id`. Fixed to `.in('user_id', seekerIds)` since `access.seeker_id` stores `auth.uid()`, not `seekers.id`. Do NOT revert to `.in('id', seekerIds)`.

⚠️ Items not being published is an active bug — see Known Active Bugs below.

---

## SeekerDashboard (v12)

Uses `useAuth()` context. Fetches keeper names from `keepers` table using slugs from `connections`. Falls back to slug-derived name if fetch fails.

---

## Known Active Bugs (as of v12)

**"Share with Seekers" banner does not disappear after clicking:**
Cache invalidation is in place. Items are still showing as draft after clicking, meaning `notify-seekers` is not publishing them despite returning 200. The `UPDATE items SET status = 'public'` may be failing silently server-side. Next step: check Vercel → Functions → notify-seekers logs.

**"Unknown" person option in AddItemForm causes 400 error:**
Person dropdown has an "Unknown" option submitting the string `"unknown"` as `person_id`. Supabase rejects it — UUID column. Fix: remove the Unknown option. Per product decision, keeper selects themselves if source is unknown. Need current `AddItemForm.jsx` to find and remove it.

**Safari seeker login — old UI served:**
Seeker on Safari saw old cached UI despite clearing site data. May be Safari caching the JS bundle. Test with fresh seeker signup in incognito Safari. If it persists, investigate Vercel cache headers.

**People photo management deferred:**
PersonDetail shows primary photo only — no carousel for people yet. Deferred to design phase.

---

## Pre-Launch Checklist

- [x] Fix seeker confirmation blank page
- [x] Fix blank page on app load
- [x] Fix login hanging
- [x] Fix seeker logout going to signup tab
- [x] Add My Profile to mobile menu
- [x] Auth context refactor
- [x] Fix seeker confirmation same-browser issue
- [x] Connect mykeepseek.com to Vercel
- [x] Investigate Chrome "dangerous site" warning — resolved
- [x] Migrate from Airtable to Supabase
- [x] Fix useNavigate missing import in App.jsx
- [x] Fix stories ON DELETE CASCADE
- [x] Fix AddItemForm not closing after save
- [x] Fix create-seeker referencing connections instead of access
- [x] Add middle_name and maiden_name to people table
- [x] Name display — First Last header, full formal sub-heading
- [x] Fix all four seeker RLS policies
- [x] Fix AuthProvider remount race condition
- [x] Fix Supabase auth lock contention (AbortError)
- [x] AuthContext dual-role support
- [x] Fix AuthConfirm — rewritten to use context, no polling
- [x] Fix signup page flash — removed setReady(false) from resolveUser
- [x] Fix resolveUser firing on TOKEN_REFRESHED — filtered out
- [x] Landing page "Are you Keeping? / Are you Seeking?" buttons
- [x] Rename URLs: /directory → /connections, /s/:slug/origins → /s/:slug/connections
- [x] SeekerDashboard wired up for multiple keeper collections
- [x] Fix create-seeker duplicate signup handling
- [x] Fix notify-seekers querying seekers by wrong column
- [x] Fix items_person_id_fkey — changed from NO ACTION to SET NULL
- [ ] Fix "Share with Seekers" banner — notify-seekers not publishing items (check Vercel logs)
- [ ] Fix "Unknown" person option in AddItemForm causing 400 error
- [ ] End to end test — full keeper signup through seeker gallery (clean, no bugs)
- [ ] Seeker welcome page on first visit, gallery on return
- [ ] Fix Safari seeker login — old UI caching issue
- [ ] Delete all test data before friend testing
- [ ] Drop legacy columns: people.photo, items.image_url, keepers.airtable_person_id
- [ ] Delete duplicate file: api/api/notify-seekers.js
- [ ] Typo recovery on signup — confirm email field + "wrong email?" re-entry flow
- [ ] Invite email copy — tell seekers to bookmark mykeepseek.com/auth
- [ ] Change invite acceptance email CTA to "Create Account"
- [ ] Change signup form final button to "Confirm Account"
- [ ] Email delivery speed — investigate Resend or add "this can take a few minutes" message
- [ ] Add QR code upload to people photos
- [ ] Add Aunt/Uncle to seeker signup relationship dropdown
- [ ] Change "+ Add" button label to "+ Add New Item"

---

## Todo / Pinned Features (in priority order)

- Mobile keeper Add Item flow ✅
- Keeper profile setup page ✅
- Send invitation email via Resend ✅
- Keeper profile editing accessible from app ✅
- Email confirmation ✅
- Seeker header with consistent navigation ✅
- Seeker categories page ✅
- Auth context refactor ✅
- Fix seeker confirmation same-browser issue ✅
- Airtable → Supabase migration ✅
- Fix seeker RLS policies ✅
- Fix AuthProvider race condition ✅
- Fix AuthConfirm routing bug ✅
- Landing page role buttons ✅
- SeekerDashboard wired up ✅
- Fix Share with Seekers banner (notify-seekers not publishing)
- Fix Unknown person 400 error
- End to end test (clean pass)
- Seeker welcome page on first visit
- Fix Safari seeker login caching issue
- Image framing/card design (design phase)
- People page redesign (design phase)
- Google/Apple/phone sign-in
- Address field for book export
- Book export
- Additional photo captions (images.caption column already exists)
- Seekers can share the link
- Multiple stories per item UI (data layer already supports it)

---

## What Went Wrong in Previous Sessions (honest notes for next Claude)

- Chased a "same browser" red herring for seeker confirmation — root cause was missing `emailRedirectTo`
- `AuthContext` `return null` while resolving caused blank pages — should have been a loading screen
- Long back-and-forth on `getSession()` vs `onAuthStateChange` — correct answer is pure `onAuthStateChange`
- `window.location.href` after login caused auth race — fix was `navigate()`
- Duplicate Supabase user accounts from different sessions caused persistent auth failures
- Stale sessions in browser after deleting Supabase users — not a code bug, clear site data
- `create-seeker.js` had `connections` table reference instead of `access` — caused 500 on seeker signup
- `AddItemForm` modal not closing after save — `onSuccess` and `onClose` fighting each other
- Dynamic import of `createStory` in `AddItemForm` caused silent hang — use static import
- `stories` table missing `ON DELETE CASCADE` on `item_id` — caused 409 when deleting items
- `PersonDetail.jsx` — find/replace left old JSX block in place — always verify file after edits
- Told Michelle to delete Vercel deployments — not possible, multiple "Production" entries is normal
- Went in circles on 400 image error — was Cloudinary bad URLs from test data, not a code issue
- All four seeker RLS policies used `seekers.id` instead of `auth.uid()` — fixed in v11
- `ready` not included in AuthContext Provider value — caused timing guards to fail silently
- Empty fetch results were being cached — fixed to prevent poisoned cache
- `AuthProvider` mounted inside individual routes — caused remount race conditions
- `onAuthStateChange` callback made async — caused `AbortError: Lock was stolen`
- Used `resolving` ref instead of version counter — permanently blocked second auth event
- Gave find/replace strings from memory instead of uploaded file — always write from the actual file
- Assumed people table was empty based on Supabase UI — always verify with SQL
- `items_person_id_fkey` was `NO ACTION` — blocked deletion of people with items. Changed to `SET NULL` in v12
- `notify-seekers.js` queried `seekers` by `id` instead of `user_id` — no emails sent. Fixed in v12
- Items defaulting to `draft` made seeker gallery empty — fixed with `setDefaultStatus()` in `AddItemForm`
- Assumed Supabase UI table view was accurate — it can be filtered/cached. Always verify with SQL.

---

## Decisions Made (don't relitigate these)

- "Connections" is the name for the family map/directory (formerly Origins)
- "Who is this item connected to?" is the field label
- `access` is the Supabase table for seeker-to-keeper permissions
- Every item must link to a person — no Unknown option — keeper selects themselves if source is unknown
- Multiple stories per item are allowed
- QR upload is desktop-only by design
- Seekers never interact with QR flow
- Design phase starts after core flow is solid
- Email provider (Resend) handles both confirmations and seeker notifications
- Coming soon items in seeker dropdown: Share
- Keeper is always one person, never a couple
- Collections are never merged — permanently isolated
- Data fetching is per-component with module cache — do NOT move back to App.jsx
- Module cache chosen over React Query — appropriate for current scale
- Pronouns removed entirely
- `profile_complete` stored in Supabase keepers table — do NOT use localStorage
- Invite email sends directly via Resend — do NOT revert to mailto
- AuthConfirm does NOT create records — serverless functions do that at signup time
- Resend-Vercel integration manages `RESEND_API_KEY` — do not manually edit in Vercel
- `AuthProvider` wraps the entire app inside `<Router>` — do NOT move inside individual routes
- `onAuthStateChange` callback must NOT be async — use `setTimeout(fn, 0)` to defer `resolveUser`
- Keeper login uses `navigate('/viewer')` not `window.location.href`
- `connections` object in AuthContext is a map keyed by `keeper_slug` — includes `keeperId`
- Serverless functions use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — no `VITE_` prefix
- Both keeper and seeker row creation go through serverless functions — do NOT revert to direct frontend inserts
- AuthContext uses pure `onAuthStateChange` with no `getSession()` init — do NOT add `getSession()` back
- `emailRedirectTo` must be passed explicitly in all `supabase.auth.signUp` calls
- `keepers.name` is source of truth for keeper name — `First Last` only — synced via `updatePerson`
- `keepers.self_person_id` points to the keeper's own people row — set by `create-keeper.js` at signup
- Images live in the `images` table — one primary (order=0) plus unlimited additional per item/person
- `notify-seekers.js` requires JWT auth — frontend passes `session.access_token` in Authorization header
- `people.name` is always `First Last` — middle and maiden stored separately, assembled at render
- Maiden name displays with parentheses: `(Maiden)` — in sub-heading only
- Sub-heading on PersonDetail only appears if middle_name or maiden_name exist
- Self person hides Relationship, Side, Years in EditPerson form
- X on extra photos in EditItemForm deletes immediately from Supabase — not deferred to Save
- `showRemoveBg={false}` passed to PhotoEditor when used for people photos
- `access.seeker_id` stores `auth.uid()` — all RLS policies must compare against `auth.uid()` directly
- Seeker button on landing page opens a modal — not a direct route to /auth
- No combined accounts — seeker and keeper accounts are always separate
- New items default to `public` until a seeker confirms their account, then default to `draft`
