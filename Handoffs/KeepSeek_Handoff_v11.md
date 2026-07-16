# KeepSeek — Project Handoff v11

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

**Circular reference when deleting keeper:**
`keepers.self_person_id` points to `people.id` and `people.keeper_id` points back to `keepers`. To delete a keeper during testing:
1. Supabase → Table Editor → keepers → set `self_person_id` to null
2. Delete the Self person row in people
3. Delete the keepers row
4. Supabase → Authentication → Users → delete auth user
Then clear site data in every browser before signing up again.

**Deleting a seeker during testing:**
1. Supabase → Table Editor → access → delete the seeker's row(s)
2. Supabase → Table Editor → seekers → delete the seeker's row
3. Supabase → Authentication → Users → delete the auth user
Then clear site data before testing again.

---

## Supabase Tables (current — post-migration)

- **keepers** — id, user_id (uuid), slug, email, name, self_person_id (uuid), profile_complete (bool, default false), created_at
- **seekers** — id, user_id (uuid), email, name, created_at
- **access** — id, seeker_id (uuid), keeper_slug, relationship, generation (integer), status, created_at
- **people** — id, keeper_id (uuid), name, middle_name (text, nullable), maiden_name (text, nullable), photo (text, legacy), relationship, side, generation (integer, default 0), location, birthdate, years, notes, created_at
- **items** — id, keeper_id (uuid), person_id (uuid), name, description, status (default 'draft'), year, image_url (text, legacy), category, value, beneficiary, notes, created_at
- **stories** — id, item_id (uuid), story_type, text_content, media_url, created_at
- **images** — id, item_id (uuid, nullable), person_id (uuid, nullable), url, order (integer, default 0), caption (text, nullable), created_at

⚠️ `people.photo` and `items.image_url` still exist as legacy columns but are no longer written to by new code. All new image reads and writes go through the `images` table. These legacy columns will be dropped in a future cleanup pass.

⚠️ `keepers.airtable_person_id` still exists as a legacy column. Not used by any code. Drop in a future cleanup pass.

### Key relationships
- `keepers.self_person_id` → `people.id` — the keeper's own person record (relationship = 'Self')
- `items.person_id` → `people.id` — "Who is this item connected to?" — required, no nulls
- `images.item_id` OR `images.person_id` — belongs to either an item or a person, never both
- `images.order = 0` is always the primary image

### Name fields in people table
- `name` — always `First Last` — this is the display name used everywhere
- `middle_name` — nullable, stored separately
- `maiden_name` — nullable, stored separately
- Full formal name is assembled at render time: `First Middle (Maiden) Last`
- `keepers.name` mirrors `people.name` for the Self person — synced by `updatePerson` on save

### RLS Policies
- keepers: Public can read slugs (SELECT), Users can read own row (SELECT), Users can insert own row (INSERT), Users can update own row (UPDATE)
- seekers: Users can read own row (SELECT), Users can insert own row (INSERT)
- access: Public can read rows (SELECT), Seekers can read own rows (SELECT), Anyone can insert row (INSERT), Users can insert own row (INSERT)
- people: Keepers can read/insert/update/delete own rows, Seekers can read people for keepers they have access to
- items: Keepers can read/insert/update/delete own rows, Seekers can read public items for keepers they have access to
- stories: Keepers can read/insert/update/delete via item ownership, Seekers can read stories for items they can access. ⚠️ stories has ON DELETE CASCADE on item_id — deleting an item automatically deletes its stories
- images: Keepers can read/insert/update/delete images for their own items and people, Seekers can read images for public items and people they have access to. ⚠️ images has ON DELETE CASCADE on both item_id and person_id

⚠️ All four seeker RLS policies (items, people, stories, images) were fixed in v11. They previously used `seekers.id` to match against `access.seeker_id`, but `access.seeker_id` stores `auth.uid()`. All four now compare `a.seeker_id = auth.uid()` directly. Do NOT revert this.

---

## Auth Architecture (current — v11)

**`AuthProvider` wraps the entire app** — it is mounted once inside `<Router>` and never remounts on navigation. This is critical. Do NOT move `AuthProvider` back inside individual routes or the seeker login race condition returns.

**`onAuthStateChange` uses `setTimeout(fn, 0)`** to defer `resolveUser` outside the Supabase auth lock. This prevents `AbortError: Lock was stolen` errors. Do NOT make the callback async or await inside it.

**`resolveUser` uses a version ref** (`resolveVersion`) instead of a resolving lock. Each call increments the version. Only the call whose version matches the current version at `finally` time sets `ready: true`. This handles rapid concurrent auth events correctly.

**`AuthContext` always loads both keeper and seeker data** for any logged-in user. A user can be a keeper, a seeker, or both. `userType` is set to `'keeper'` if a keeper row exists, `'seeker'` if only a seeker row exists. `connections` is always populated if seeker access rows exist, regardless of keeper status. This enables dual-role users (keeper who is also a seeker) to access both their collection and other collections they've been invited to.

**Login routing:**
- Keepers log in at `/auth` → routed to `/viewer` (or `/profile/setup` if incomplete)
- Seekers log in at `/auth` → routed to their gallery (one keeper) or `/seeker` dashboard (multiple keepers)
- Seekers can also log in at `/s/:slug` → routed to that specific gallery
- `/s/:slug` is for new seeker signup AND returning seeker login for a specific collection
- Keepers should NOT log in at `/s/:slug` — they have no access row and will get an error

**`AuthConfirm`** — currently uses polling (`supabase.auth.getUser()` in a loop). This needs to be rewritten to use context (`useAuth()`) instead of polling. It also routes based on the currently logged-in user, not the newly confirmed user — this is a known bug that causes the keeper to be routed to `/viewer` if they're logged in when a seeker confirms their email. Fix is in the todo list.

---

## File: `airtable.js`

Despite the name, this file is fully migrated to Supabase. It contains all data fetching functions (`fetchItems`, `fetchPeople`, `fetchStoryForItem`, `createItem`, `updateItem`, `deleteItem`, `createPerson`, `updatePerson`, `deletePerson`, `fetchItemImages`, `addItemImage`, `addPersonPhoto`, `deleteImage`, `replaceItemPrimaryImage`, `createStory`, `updateStory`) plus a module-level cache with 60-second TTL.

The file will be renamed to `supabaseData.js` or similar in a future cleanup pass. For now all imports reference `'../services/airtable'`.

⚠️ The module cache does not cache empty results (`if (result.length > 0) setCached(...)`). This was fixed in v11 to prevent poisoned cache from a failed or blocked fetch being served to subsequent calls in the same JS session.

---

## Known Active Bugs (as of v11)

**`AuthConfirm` routes to keeper view when keeper is logged in during seeker confirmation:**
If the keeper's browser is the one used to click a seeker confirmation link, `AuthConfirm` finds the keeper session and routes to `/viewer` instead of the seeker gallery. Root cause: `AuthConfirm` checks the currently logged-in user, not the newly confirmed user. Fix: rewrite `AuthConfirm` to use `useAuth()` context and check `userType` + `connections` after `ready` is true, rather than polling `supabase.auth.getUser()`.

**`resolveUser` firing multiple times per navigation:**
`onAuthStateChange` fires 2-3 times on some navigations (version numbers increment to 2, 3, sometimes higher). The version ref handles this correctly — only the last call sets `ready` — but it causes unnecessary Supabase queries. Not a functional bug but worth investigating. May be related to Supabase JS firing both `INITIAL_SESSION` and `SIGNED_IN` events on page load.

**Signup page flash before gallery:**
When a seeker logs in via `/auth` and gets routed to their gallery, the `AuthProvider` loading screen briefly flashes before the gallery renders. Root cause: `if (!initialized.current) setReady(false)` inside `resolveUser` sets ready to false on the second resolve call, causing a brief re-render of the loading screen. Fix: remove the `setReady(false)` call inside `resolveUser` — the loading screen should only show on initial mount, not on subsequent resolves.

**Safari seeker login — old UI served:**
During testing, a seeker on Safari saw old cached UI despite clearing site data. Not fully resolved. May be Safari's aggressive caching of the JS bundle. Test again with a fresh seeker signup in an incognito Safari window. If it persists, investigate Vercel cache headers for the JS bundle.

**400 errors on images in console:**
These are Cloudinary requests for broken/stale image URLs from test data. Not a code bug. Will go away when test data is deleted before friend testing.

**People photo management deferred:**
EditPerson has the photo management code (add extra photos, edit primary) but the PersonDetail page only shows the primary photo — no carousel for people yet. Deferred to design phase.

---

## What Went Wrong in Previous Sessions (honest notes for next Claude)

- Chased a "same browser" red herring for seeker confirmation — root cause was missing `emailRedirectTo`
- `AuthContext` `return null` while resolving caused blank pages — should have been a loading screen from the start
- Long back-and-forth on `getSession()` vs `onAuthStateChange` — correct answer is pure `onAuthStateChange`, no `getSession()` init
- `window.location.href` after login caused auth race on keeper side — fix was `navigate()`
- Duplicate Supabase user accounts from different sessions caused persistent auth failures
- Stale sessions in browser after deleting Supabase users — not a code bug, clear site data
- `create-seeker.js` had `connections` table reference instead of `access` — caused 500 on seeker signup
- `AddItemForm` modal not closing after save — `onSuccess` and `onClose` were both called and fighting each other
- Dynamic import of `createStory` in `AddItemForm` caused silent hang — replace with static import
- `stories` table was missing `ON DELETE CASCADE` on `item_id` — caused 409 when deleting items
- `PersonDetail.jsx` — find/replace left old JSX block in place alongside new block — always verify file after edits
- Told Michelle to delete Vercel deployments — Vercel doesn't allow this. Multiple deployments marked "Production" is normal history, not a problem. Only the latest is served.
- Went in circles on 400 image error — it was Cloudinary bad URLs from test data, not an RLS or code issue
- All four seeker RLS policies (items, people, stories, images) used `seekers.id` to match against `access.seeker_id`, but `access.seeker_id` stores `auth.uid()`. Fixed by updating all four policies to compare `a.seeker_id = auth.uid()` directly.
- `ready` was not included in the AuthContext Provider value object — components using `useAuth()` got `ready: undefined`, causing timing guards to fail silently
- Empty fetch results were being cached in the module cache, poisoning subsequent fetches in the same JS session
- `AuthProvider` was mounted inside individual routes — caused remount on every navigation, resetting all refs and state, creating auth race conditions. Fixed by moving `AuthProvider` to wrap the entire app inside `<Router>`
- Making `onAuthStateChange` callback async and awaiting `resolveUser` inside it caused `AbortError: Lock was stolen` — Supabase holds an auth lock during the callback. Fixed by using `setTimeout(fn, 0)` to defer `resolveUser` outside the lock
- Used `resolving` ref to prevent concurrent resolves — this permanently blocked the second `onAuthStateChange` event (SIGNED_IN after SIGNED_OUT) because the ref was set to true during the first call and the second call returned early. Fixed by replacing with a version counter that lets all calls run but only the last one sets `ready`
- Gave find/replace strings based on what I thought was in the file rather than what was actually uploaded — always write find strings from the uploaded file, never from memory

---

## Decisions Made (don't relitigate these)

- "Connections" is the name for the family map/directory (formerly Origins)
- "Who is this item connected to?" is the field label (formerly Who It's From / Owner)
- `access` is the Supabase table for seeker-to-keeper permissions (formerly `connections`)
- Every item must link to a person — no Unknown option — keeper selects themselves if source is unknown
- Multiple stories per item are allowed
- QR upload is desktop-only by design
- Seekers never interact with QR flow
- Design phase starts after core flow is solid — CSS changes come after e2e test passes
- Email provider (Resend) handles both confirmations and seeker notifications
- Coming soon items in seeker dropdown: Share — greyed placeholders
- Keeper is always one person, never a couple
- Collections are never merged — each keeper's collection is permanently isolated. A seeker with access to multiple collections sees them separately via the seeker dashboard. This is a product decision, not a technical limitation.
- Data fetching is per-component with module cache — do NOT move back to App.jsx
- Module cache chosen over React Query — appropriate for current scale
- Pronouns removed entirely
- `profile_complete` stored in Supabase keepers table — do NOT use localStorage
- Invite email sends directly via Resend — do NOT revert to mailto
- AuthConfirm does NOT create records — serverless functions do that at signup time
- Resend-Vercel integration manages `RESEND_API_KEY` — do not manually edit in Vercel
- `AuthProvider` wraps the entire app inside `<Router>` — do NOT move it back inside individual routes
- `onAuthStateChange` callback must NOT be async — use `setTimeout(fn, 0)` to defer `resolveUser`
- Keeper login uses `navigate('/viewer')` not `window.location.href`
- `connections` object in AuthContext is a map keyed by `keeper_slug` — includes `keeperId` for data fetching
- Serverless functions use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — no `VITE_` prefix
- Both keeper and seeker row creation go through serverless functions — do NOT revert to direct frontend inserts
- AuthContext uses pure `onAuthStateChange` with no `getSession()` init — do NOT add `getSession()` back
- `emailRedirectTo` must be passed explicitly in all `supabase.auth.signUp` calls
- `keepers.name` is the source of truth for keeper name everywhere — `First Last` only — synced via `updatePerson` when Self person is edited
- `keepers.self_person_id` points to the keeper's own people row — set by `create-keeper.js` at signup
- Images live in the `images` table — one primary (order=0) plus unlimited additional per item/person
- `notify-seekers.js` requires JWT auth — frontend passes `session.access_token` in Authorization header
- `people.name` is always `First Last` — middle and maiden stored in separate columns, assembled at render
- Maiden name displays with parentheses: `(Maiden)` — in sub-heading only, not in main heading
- Sub-heading on PersonDetail only appears if middle_name or maiden_name exist — never shown for First Last only
- Self person hides Relationship, Side, Years in EditPerson form
- X on extra photos in EditItemForm deletes immediately from Supabase — not deferred to Save
- `showRemoveBg={false}` passed to PhotoEditor when used for people photos
- `access.seeker_id` stores `auth.uid()` (the auth user UUID), not `seekers.id` — all RLS policies must compare against `auth.uid()` directly
- Landing page will have "Are you Keeping?" and "Are you Seeking?" buttons — both route to `/auth`, seeker button sets `?role=seeker` to show login-only tab with note about needing an invite for new signups
- Role switching mid-session is handled via header navigation, not re-login — keeper header shows "View [Name]'s Collection" links when `connections` is non-empty; seeker header shows "Switch to Keeper View" when user is also a keeper

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
- [x] Fix all four seeker RLS policies (items, people, stories, images)
- [x] Fix AuthProvider remount race condition
- [x] Fix Supabase auth lock contention (AbortError)
- [x] AuthContext dual-role support (keeper + seeker in same session)
- [ ] Fix AuthConfirm — rewrite to use context instead of polling, fix routing when keeper is logged in during seeker confirmation
- [ ] Fix signup page flash before gallery (remove `setReady(false)` inside resolveUser)
- [ ] Fix resolveUser firing multiple times per navigation
- [ ] End to end test — full keeper signup through seeker gallery (clean, no bugs)
- [ ] Seeker welcome page on first visit, gallery on return
- [ ] Landing page "Are you Keeping? / Are you Seeking?" buttons
- [ ] Keeper header "View [Name]'s Collection" link for dual-role users
- [ ] Seeker header "Switch to Keeper View" for dual-role users
- [ ] SeekerDashboard — wire up for multiple keeper collections
- [ ] Fix Safari seeker login — old UI caching issue
- [ ] Delete all test data before friend testing
- [ ] Verify seeker gallery header capitalization
- [ ] Drop legacy columns: people.photo, items.image_url, keepers.airtable_person_id
- [ ] Rename URLs: /directory → /connections, /s/:slug/origins → /s/:slug/connections
- [ ] Delete duplicate file: api/api/notify-seekers.js
- [ ] Typo recovery on signup — confirm email field on signup form + "wrong email?" re-entry flow on confirmation waiting screen
- [ ] Invite email copy — tell seekers to bookmark mykeepseek.com/auth as permanent login

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
- Fix AuthConfirm routing bug
- End to end test (clean pass)
- Landing page role buttons ("Are you Keeping? / Are you Seeking?")
- Seeker welcome page on first visit
- Keeper/seeker role switching via header nav
- SeekerDashboard wired up for multiple collections
- Fix Safari seeker login caching issue
- Image framing/card design (design phase)
- People page redesign (design phase) — includes photo carousel, photo editing for people
- Google/Apple/phone sign-in
- Address field for book export
- Book export
- Additional photo captions (images.caption column already exists)
- Seekers can share the link
- Multiple stories per item UI (data layer already supports it)
