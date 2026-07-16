# KeepSeek — Project Handoff v14

## The Product

KeepSeek is a private family heritage platform. A keeper catalogs family heirloom items with photos, stories, and provenance. Seekers (the keeper's family) receive invitation links and browse the collection with personalized relationship labels.

The keeper is always one person — never a couple. The thrust of KeepSeek is the stories behind the things, not the things themselves. A person record without an attached item is invalid data and contradicts the product's mission. Each keeper's collection is fully isolated — multiple keepers can have accounts and never see each other's data.

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
Note: `DELETE FROM items` now auto-deletes all non-Self people via the orphan trigger before the `DELETE FROM people` line runs. The people delete line will only clean up Self person records. This is correct behavior — do not skip either line.

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

## Supabase Tables (current — post-migration, v14)

- **keepers** — id, user_id (uuid), slug, email, name, self_person_id (uuid), profile_complete (bool, default false), created_at
- **seekers** — id, user_id (uuid), email, name, created_at
- **access** — id, seeker_id (uuid), keeper_slug, relationship, generation (integer), status, created_at
- **people** — id, keeper_id (uuid), name, middle_name (text, nullable), maiden_name (text, nullable), photo (text, legacy), relationship, side, generation (integer, default 0), location, birthdate, years, notes, entry_complete (bool, default false), no_photo (bool, default false), profile_visited (bool, default false), created_at
- **items** — id, keeper_id (uuid), person_id (uuid, nullable), name, description, status (default 'draft'), year, image_url (text, legacy), category, value, beneficiary, notes, entry_complete (bool, default false), created_at
- **stories** — id, item_id (uuid), story_type, text_content, media_url, created_at
- **images** — id, item_id (uuid, nullable), person_id (uuid, nullable), url, order (integer, default 0), caption (text, nullable), created_at

⚠️ `people.photo` and `items.image_url` still exist as legacy columns but are no longer written to. Drop in a future cleanup pass.
⚠️ `keepers.airtable_person_id` still exists as a legacy column. Drop in a future cleanup pass.

### New columns added in v14
- `people.no_photo` — boolean, default false. Set to true when keeper consciously marks "no photo available." When true, initials show permanently and the add-photo prompt never appears.
- `people.profile_visited` — boolean, default false. Set to true the first time PersonDetail loads for that person. Controls the Edit Profile button label — false shows "Add details to [Name]'s profile", true shows "Edit Profile".

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

## Orphan Person Trigger (v13)

A PostgreSQL trigger enforces the product rule that a person without items is invalid data.

```sql
CREATE OR REPLACE FUNCTION delete_orphan_person()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.person_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM items
      WHERE person_id = OLD.person_id
    ) THEN
      DELETE FROM people
      WHERE id = OLD.person_id
      AND relationship != 'Self';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_orphan_person_after_item_delete
AFTER DELETE ON items
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_person();
```

This fires at the database level regardless of whether deletion comes from the app, a serverless function, or the Supabase editor. The Self person guard prevents the keeper's own record from being deleted.

`deleteItemAndOrphanCheck()` in `airtable.js` mirrors this logic at the application level for cases where the trigger may not fire (e.g. item had `person_id = NULL`). Both exist intentionally.

---

## Entry Completion System (v14)

Both `items` and `people` tables have an `entry_complete boolean DEFAULT false` column.

**Visual system (updated v14):**
- Gallery images show at full opacity regardless of completion state — fading removed
- Black corner triangle on gallery image = `hasSeekers && status === 'draft'` (not yet shared with seekers)
- No triangle = complete and shared
- Trash, pencil, and camera icons appear on hover in bottom-right corner of gallery items (desktop only)

**Interaction (updated v14):**
- Clicking any gallery item navigates to `/item/${id}` — EditItemForm no longer opens from gallery
- ItemDetail has a full-width "Complete Entry" button at the bottom that opens EditItemForm
- Clicking a person card in Connections navigates to `/person/${id}` — EditPerson no longer opens directly from Connections
- PersonDetail has Edit Profile button that opens EditPerson

**Setting entry_complete:**
- `EditItemForm`: Save Changes / Save As Is → `entry_complete = true`. Complete Later → `entry_complete = false`
- `EditPerson`: Save Changes / Save As Is → `entry_complete = true`. Complete Later → `entry_complete = false`
- `AddItemForm`: saves then navigates directly to `/item/${savedItem.id}` — no prompt screen

**`airtable.js`:**
- `fetchItems` maps `entry_complete` → `entryComplete`
- `fetchPeople` maps `entry_complete` → `entryComplete`, `no_photo` → `noPhoto`, `profile_visited` → `profileVisited`
- `updateItem` writes `entry_complete` when present in fields
- `updatePerson` writes `entry_complete` via `entryComplete`, `no_photo` via `noPhoto`, `profile_visited` via `profileVisited`
- `deleteItemAndOrphanCheck` — use instead of `deleteItem` everywhere deletion is triggered from the UI

---

## Relationship Display System (v14)

A shared utility function `getDisplayRelationship(relationship, side)` lives in `src/services/utils.js`.

**Rule:** If `side === 'Partner Family'` and the relationship is not Spouse/Partner, Friend, Other, or Self — append "-in-law" to the relationship label. Example: Mother + Partner Family → "Mother-in-law".

This is applied at render time — the database stores the raw relationship and side separately. Nothing is stored with "-in-law" appended.

`getDisplayRelationship` is imported and used in:
- `Origins.jsx` — PersonCard relationship label
- `PersonDetail.jsx` — relationship line in header
- `ItemDetail.jsx` — owner relationship label
- `SeekerGallery.jsx` — via `getPersonalizedLabel` which calls it internally
- `SeekerItemDetail.jsx` and `SeekerPersonDetail.jsx` — via `getPersonalizedLabel`

Do NOT duplicate this logic elsewhere. Always import from `src/services/utils.js`.

---

## Person Photo System (v14)

### PersonPhotoModal component
New standalone component at `src/components/PersonPhotoModal.jsx`. Opens as a modal over any page. Handles:
- Full photo picker: camera/upload/QR on desktop, camera/upload on mobile
- No background removal (showRemoveBg is always false for people)
- "No photo available" button — sets `no_photo = true` on the person record
- `navigateOnSave` prop (bool, default false) — when true, navigates to `/person/${person.id}` after saving instead of calling `onSuccess`

### Photo states for a person
- `person.photo` exists → show photo
- `person.noPhoto === true` → show initials permanently, no prompt
- Neither → show camera icon (teal circle with camera SVG, dashed ring border) — tapping opens PersonPhotoModal

### Where photo tap targets appear
- `Origins.jsx` — PersonCard avatar when no photo and not noPhoto
- `ItemDetail.jsx` — owner avatar in provenance section
- `EditItemForm.jsx` — small "Add a photo of [name]" link below owner select when owner has no photo
- `PersonDetail.jsx` — avatar in person header

### After photo saved
- From `ItemDetail.jsx` — `navigateOnSave={true}` — goes to `/person/${person.id}`
- From `Origins.jsx`, `EditItemForm.jsx`, `PersonDetail.jsx` — calls `onSuccess` and reloads data in place

---

## AddItemForm Flow (v14)

Steps 1–4 unchanged. Step 5 (the "Add Details Now / I'll Come Back to It" prompt) has been removed entirely.

After save: `onSuccess(savedItem)` is called with the new item. `AddItemFormWrapper` in `App.jsx` navigates to `/item/${savedItem.id}`. The keeper lands on ItemDetail to proof their entry.

Do NOT re-add the step 5 prompt. The flow is intentionally: add → save → ItemDetail.

---

## AddPersonQuick Flow (v14)

The post-save prompt ("Add Details Now / I'll Come Back to It") has been removed. After saving, `onSuccess(newPerson)` is called immediately and the modal closes. The new person is auto-selected in the item form's person dropdown.

Do NOT re-add the prompt screen.

---

## PersonDetail (v14)

### Edit Profile button label
- First visit (`profile_visited === false`) → button reads "Add details to [FirstName]'s profile"
- Subsequent visits (`profile_visited === true`) → button reads "Edit Profile"
- `profile_visited` is set to true in a `useEffect` that fires after person data loads, only when `profile_visited` is currently false. This is a silent background write — no UI change triggered.

### Camera icon placeholder
When a person has no photo and `noPhoto` is false, the avatar area shows a teal circle with a dashed ring and a camera icon instead of initials. Tapping it opens `PersonPhotoModal`. When `noPhoto` is true, initials show instead.

---

## Auth Architecture (current — v12, unchanged)

**`AuthProvider` wraps the entire app** — mounted once inside `<Router>`. Do NOT move inside individual routes.

**`onAuthStateChange` uses `setTimeout(fn, 0)`** to defer `resolveUser` outside the Supabase auth lock. Do NOT make async or await inside it.

**`onAuthStateChange` filters `TOKEN_REFRESHED` and `PASSWORD_RECOVERY`** — these do not change who the user is. Do NOT remove this filter.

**`resolveUser` does NOT call `setReady(false)`** — once `ready` is true it never goes back to false until logout.

**`resolveUser` uses a version ref** (`resolveVersion`). Each call increments the version. Only the call whose version matches at `finally` time sets `ready: true`.

**`AuthContext` always loads both keeper and seeker data.** `userType` = `'keeper'` if keeper row exists, `'seeker'` if only seeker row exists. `connections` always populated if seeker access rows exist.

**`AuthConfirm` uses `useAuth()` context** — no polling. Renders loading screen until `ready`, then routes based on `userType` and `connections`.

**Login routing:**
- Keepers → `/auth` → `/viewer` (or `/profile/setup` if incomplete)
- Seekers → `/auth` → gallery (one keeper) or `/seeker` dashboard (multiple)
- Seekers can also log in at `/s/:slug` → that specific gallery
- Keepers should NOT log in at `/s/:slug`

**`AuthPage` seeker mode** — `/auth?role=seeker` hides Create Account tab and "Don't have an account?" link.

---

## Item Status Logic

**New items default to `'public'` if no confirmed seekers exist, `'draft'` if confirmed seekers exist.**

`AddItemForm` calls `setDefaultStatus()` on mount. Checks `access` rows for this keeper's slug. If confirmed seekers exist → `'draft'`. If not → `'public'`.

**"Share with Seekers" banner** — appears in `ItemGrid` when `hasSeekers` is true and `draftCount > 0`. Clicking calls `/api/notify-seekers`.

---

## File: `airtable.js`

Despite the name, fully migrated to Supabase. Contains all data fetching and mutation functions plus a module-level cache with 60-second TTL. Exports `invalidateCache(key)`. All mutating functions call `invalidateCache` automatically.

Will be renamed `supabaseData.js` in a future cleanup pass.

⚠️ Cache does not store empty results — prevents poisoned cache from failed fetches.

---

## File: `src/services/utils.js` (new in v14)

Contains `getDisplayRelationship(relationship, side)`. Import from here — do not duplicate logic elsewhere.

---

## Landing Page (v12, unchanged)

- Split layout: Keeping left, Seeking right, vertical border divider. Mobile stacks vertically.
- "Start Keeping" → `/auth`
- "Start Seeking" → modal explaining invitation-only. Modal has "Log In" → `/auth?role=seeker` and "Back"

---

## create-seeker.js (v12, unchanged)

Handles duplicate signups — checks for existing `seekers` row before inserting, checks for existing `access` row before inserting. Same email can accept invitations from multiple keepers without errors.

---

## notify-seekers.js (v12, unchanged)

⚠️ Was querying `seekers` table by `id` instead of `user_id`. Fixed to `.in('user_id', seekerIds)`. Do NOT revert to `.in('id', seekerIds)`.

---

## SeekerDashboard (v12, unchanged)

Uses `useAuth()` context. Fetches keeper names from `keepers` table using slugs from `connections`. Falls back to slug-derived name if fetch fails.

---

## Known Active Bugs (as of v14)

**Safari seeker login — old UI served:**
Seeker on Safari saw old cached UI despite clearing site data. May be Safari caching the JS bundle. Test with fresh seeker signup in incognito Safari. If it persists, investigate Vercel cache headers.

**EditPerson — Complete Later does nothing:**
Clicking "Complete Later" saves but the modal doesn't close. `onCompleteLater` callback is not passed in most places that open EditPerson. Full EditPerson overhaul is pinned — do not patch this individually.

**EditPerson — Save As Is and Save Changes are identical:**
Both call the same function with the same arguments. Part of the pinned EditPerson overhaul.

**Share with Seekers banner:**
notify-seekers not publishing items correctly. Check Vercel function logs.

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
- [x] Fix "Unknown" person option — removed, person selection is required
- [x] Fix "Done" button white screen in EditItemForm — EditPerson import was missing
- [x] Fix "Complete Later" going to white screen — now navigates to gallery
- [x] Add entry_complete to items table
- [x] Add entry_complete to people table
- [x] Orphan person trigger in Supabase
- [x] deleteItemAndOrphanCheck function in airtable.js
- [x] EditItemForm completion system — Save Changes / Save As Is / Complete Later buttons
- [x] EditPerson completion system — Save Changes / Save As Is / Complete Later buttons
- [x] Gallery corner triangle = unshared (fading removed)
- [x] All gallery clicks go to ItemDetail — EditItemForm no longer opens from gallery
- [x] Trash can on gallery hover (desktop)
- [x] Complete Entry button full width at bottom of ItemDetail
- [x] AddItemForm saves and navigates to ItemDetail — step 5 prompt removed
- [x] AddPersonQuick saves and closes immediately — prompt removed
- [x] getDisplayRelationship utility — in-law labels across all keeper and seeker views
- [x] AddPersonQuick field order: Name → Side → Relationship
- [x] Add no_photo column to people table
- [x] Add profile_visited column to people table
- [x] PersonPhotoModal — standalone photo picker for people
- [x] Camera icon placeholder on person avatars when no photo and not noPhoto
- [x] "No photo available" option in PersonPhotoModal sets no_photo = true
- [x] PersonDetail — Edit Profile button label changes on first visit
- [x] PersonDetail — camera icon tap target opens PersonPhotoModal
- [x] ItemDetail — camera icon on owner avatar opens PersonPhotoModal, navigates to PersonDetail on save
- [x] EditItemForm — "Add a photo of [name]" link when owner has no photo
- [x] Origins — camera icon tap target on person cards opens PersonPhotoModal
- [ ] EditPerson full overhaul — Complete Later wiring, Save As Is vs Save Changes distinction, photo picker upgrade, field order
- [ ] Fix "Share with Seekers" banner — notify-seekers not publishing items (check Vercel logs)
- [ ] End to end test — full keeper signup through seeker gallery (clean, no bugs)
- [ ] Seeker welcome page on first visit, gallery on return
- [ ] Fix Safari seeker login — old UI caching issue
- [ ] Delete all test data before friend testing

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
- Entry completion system (items + people) ✅
- Orphan person trigger ✅
- Gallery and item flow overhaul ✅
- Relationship in-law display system ✅
- Person photo system (PersonPhotoModal, no_photo, profile_visited) ✅
- EditPerson full overhaul (Complete Later, buttons, photo picker, field order)
- Fix Share with Seekers banner
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
- Typo recovery on signup — confirm email field + "wrong email?" re-entry flow
- Invite email copy — tell seekers to bookmark mykeepseek.com/auth
- Change invite acceptance email CTA to "Create Account"
- Change signup form final button to "Confirm Account"
- Email delivery speed — investigate Resend or add "this can take a few minutes" message
- Add Aunt/Uncle to seeker signup relationship dropdown
- Change "+ Add" button label to "+ Add New Item"

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
- Assumed Supabase UI table view was accurate — it can be filtered/cached. Always verify with SQL
- `EditPerson` used in `ItemDetail.jsx` but never imported — caused white screen on Done button
- Gave find/replace instructions referencing wrong file multiple times in same session — always read the uploaded file before writing find strings
- `useAuth` import dropped from `EditItemForm` when import line was replaced — always verify full import line
- Gave find/replace with a typo (`tracking-widests`) that didn't match the file — always copy strings exactly from the uploaded file
- Spent multiple exchanges solving flow problems that were symptoms of a deeper UX mismatch — step back and look at the full picture before proposing solutions

---

## Decisions Made (don't relitigate these)

- "Connections" is the name for the family map/directory (formerly Origins)
- `access` is the Supabase table for seeker-to-keeper permissions
- Every item must link to a person — no Unknown option — keeper selects themselves if source is unknown
- A person without any items attached is invalid data — orphan trigger enforces this at database level
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
- Black corner tag = draft and hasSeekers — independent of entry_complete
- Entry complete is set by conscious keeper action (Save Changes / Save As Is) — not calculated from field presence
- Gallery images are never faded — fading system removed in v14
- All gallery item clicks go to ItemDetail — EditItemForm never opens directly from gallery
- Trash can on gallery is desktop hover only
- EditItemForm title is "Complete Item Information"
- Complete Entry button is full width at the bottom of ItemDetail, outside the two-column grid
- `deleteItemAndOrphanCheck` must be used instead of `deleteItem` everywhere deletion is triggered from the UI
- `no_photo` boolean on people table — do NOT use sentinel strings or legacy photo column for this
- `profile_visited` boolean on people table — controls Edit Profile button label only, not completion state
- In-law labels are assembled at render time from relationship + side — never stored in the database
- `getDisplayRelationship` lives in `src/services/utils.js` — do not duplicate this logic
- PersonPhotoModal is a standalone component — photo management is separate from biographical editing
- AddItemForm step 5 prompt is gone — do not re-add it
- AddPersonQuick post-save prompt is gone — do not re-add it
- After adding an item, keeper goes to ItemDetail to proof it — not to the gallery
