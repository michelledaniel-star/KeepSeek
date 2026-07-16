# KeepSeek — Project Handoff v15
*Last updated: April 3, 2026*

---

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
- Number questions and lists
- Ask for files before touching them
- Diagnose before writing code

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
- DKIM verified ✅, SPF verified ✅, DMARC added to GoDaddy DNS April 2026 ✅
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
- DMARC TXT record added in GoDaddy April 2026: Name `_dmarc`, Value `v=DMARC1; p=none; rua=mailto:noreply@mykeepseek.com`

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

**Querying reserved words in SQL:**
`order` is a reserved word. Always quote it: `SELECT id, url, "order" FROM images ...`

---

## Supabase Tables (current — post-migration, v15)

- **keepers** — id, user_id (uuid), slug, email, name, self_person_id (uuid), profile_complete (bool, default false), created_at
- **seekers** — id, user_id (uuid), email, name, created_at
- **access** — id, seeker_id (uuid), keeper_slug, relationship, generation (integer), status, created_at
- **people** — id, keeper_id (uuid), name, middle_name (text, nullable), maiden_name (text, nullable), photo (text, legacy), relationship, side, generation (integer, default 0), location, birthdate, years, notes, entry_complete (bool, default false), no_photo (bool, default false), profile_visited (bool, default false), created_at
- **items** — id, keeper_id (uuid), person_id (uuid, nullable), name, description, status (default 'draft'), year, image_url (text, legacy), category, value, beneficiary, notes, entry_complete (bool, default false), created_at
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

## Orphan Person Trigger (v13, unchanged)

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

## Entry Completion System (v15)

Both `items` and `people` tables have an `entry_complete boolean DEFAULT false` column.

**Visual system:**
- Gallery images show at full opacity regardless of completion state — fading removed
- Black corner triangle on gallery image = `hasSeekers && status === 'draft'` (not yet shared with seekers)
- No triangle = complete and shared
- Trash icon appears on hover in gallery items (desktop only)

**Interaction:**
- Clicking any gallery item navigates to `/item/${id}` — EditItemForm no longer opens from gallery
- ItemDetail has a full-width "Complete Entry" button at the bottom that opens EditItemForm
- Clicking a person card in Connections navigates to `/person/${id}` — EditPerson no longer opens directly from Connections
- PersonDetail has Edit Profile button that opens EditPerson

**Setting entry_complete:**
- `EditItemForm`: Save Changes / Save As Is → `entry_complete = true`. Complete Later → `entry_complete = false`
- `EditPerson`: Save Changes → `entry_complete = true`. Save As Is → `entry_complete = false`. Complete Later → `entry_complete = false`
- `AddItemForm`: saves then navigates directly to `/item/${savedItem.id}` — no prompt screen

**`airtable.js`:**
- `fetchItems` maps `entry_complete` → `entryComplete`
- `fetchPeople` maps `entry_complete` → `entryComplete`, `no_photo` → `noPhoto`, `profile_visited` → `profileVisited`
- `updateItem` writes `entry_complete` when present in fields
- `updatePerson` writes `entry_complete` via `entryComplete`, `no_photo` via `noPhoto`, `profile_visited` via `profileVisited`
- `deleteItemAndOrphanCheck` — use instead of `deleteItem` everywhere deletion is triggered from the UI

---

## Relationship Display System (v15)

`getDisplayRelationship(relationship, side, partnerName)` lives in `src/services/utils.js`.

**Rule:** If `side === 'Partner Family'` and the relationship is not in the NO_INLAW set (Spouse/Partner, Friend, Other, Self, Partner):
- If `partnerName` is provided → return `"[partnerName]'s [relationship]"` (e.g. "Eric's Mother")
- If no `partnerName` → fall back to `"[relationship]-in-law"`

The partner is found by looking for `relationship === 'Partner'` or `relationship === 'Spouse / Partner'` in the people list. First name only is passed as `partnerName`.

This is applied at render time — the database stores the raw relationship and side separately. Nothing is stored with the partner name or "-in-law" appended.

`getDisplayRelationship` is imported and used in:
- `Origins.jsx` — PersonCard component, `partnerName` passed as a prop to every PersonCard instance
- `PersonDetail.jsx` — relationship line in header, `partnerName` derived from `people` state
- `ItemDetail.jsx` — owner relationship label, `partnerName` derived from `people` state
- `SeekerGallery.jsx` — via `getPersonalizedLabel` which accepts and passes `partnerName`
- `SeekerItemDetail.jsx` and `SeekerPersonDetail.jsx` — via `getPersonalizedLabel`

`getPersonalizedLabel(storedRelationship, storedGeneration, seekerGeneration, side, keeperName, partnerName)` is exported from `SeekerGallery.jsx` and imported by `SeekerItemDetail.jsx` and `SeekerPersonDetail.jsx`.

Do NOT duplicate this logic elsewhere. Always import from `src/services/utils.js`.

---

## Person Photo System (v15)

### Overview
All person photos live in the `images` table with `person_id` set and `item_id` null. `order = 0` is always the primary photo shown as the profile photo everywhere. `order > 0` are additional photos shown in PersonDetail with arrow navigation.

`fetchPeople` maps the `order=0` image to `person.photo` and all images to `person.photos[]`.

### PersonPhotoModal (v15 — complete rewrite)
Single place where all person photo management happens. Located at `src/components/PersonPhotoModal.jsx`. Opens as a modal over any page.

**Props:**
- `person` — person object
- `onClose` — called when modal is dismissed without saving
- `onSuccess` — called after any successful save
- `navigateOnSave` (bool, default false) — when true, navigates to `/person/${person.id}` after saving instead of calling `onSuccess`

**Behavior — no existing photos:**
- Shows upload/QR picker (desktop: two-panel upload left / QR right; mobile: stacked)
- "No photo available" button sets `no_photo = true`
- Saving calls `addPersonPhoto` — first photo always gets `order=0` naturally

**Behavior — has existing photos ("Manage Photos"):**
- Grid of all photos, 3 columns
- Current primary has "PROFILE" label overlay and black border
- Tap any non-primary photo → teal border + checkmark overlay (selected state)
- Tap again to deselect (toggle)
- When selected: "Set as Profile Photo" button (black) + "Cancel" text button appear
- "Set as Profile Photo" calls `setPersonPrimaryPhoto` and closes via `onSuccess`
- Delete button (×) on each photo — calls `deleteImage`, reloads grid, stays open
- "+ Add a new photo" button → shows upload/QR picker
- After saving new photo → grid reloads, stays open (keeper can then tap to set as primary)
- "Done" button at bottom → closes via `onSuccess`
- "No photo available" only shown when no existing photos

**QR polling:** Polls `/api/upload-session` every 2 seconds when QR is active. Sets preview when image arrives.

### Where PersonPhotoModal opens from
- `PersonDetail.jsx` — camera icon when no photo; "Add Photo" / "Manage Photos" button in EditPerson
- `ItemDetail.jsx` — camera icon on owner avatar (navigateOnSave={true})
- `Origins.jsx` — camera icon on PersonCard when no photo
- `EditPerson.jsx` — "Add Photo" / "Manage Photos" button (EditPerson has NO photo logic of its own)

### Photo states for a person
- `person.photo` exists → show photo (square, `rounded`, `w-48 h-48 md:w-64 md:h-64` on PersonDetail)
- `person.noPhoto === true` → show initials permanently, no prompt
- Neither → show camera icon (teal circle with dashed ring) — tapping opens PersonPhotoModal

### airtable.js photo functions for people
- `addPersonPhoto(personId, url, keeperId)` — adds photo at next available order. First photo gets order=0.
- `addPersonPhotoAsPrimary(personId, url, keeperId)` — adds new photo at order=0, demotes existing primary to order=1. Exists but not currently used in PersonPhotoModal flow.
- `setPersonPrimaryPhoto(personId, imageId, keeperId)` — sets chosen image to order=0, demotes current primary to order=1.

---

## Item Photo System (v15)

All item photos live in the `images` table with `item_id` set and `person_id` null. `order=0` is the primary/main photo. `order>0` are additional photos.

`fetchItems` maps `order=0` to `item.image` and all images to `item.images[]`.

### airtable.js photo functions for items
- `addItemImage(itemId, url, keeperId)` — adds at next available order
- `replaceItemPrimaryImage(itemId, url, keeperId)` — replaces order=0 image
- `deleteImage(imageId, keeperId)` — deletes any image by id

### EditItemForm photo UI (v15)
"Replace Main Photo" section replaced with two-panel upload/QR picker matching PersonPhotoModal style:
- Desktop: upload from computer (left) / Use Phone Camera QR (right)
- Mobile: stacked buttons
- QR polling state and session management added
- Shows current primary as preview above the picker
- New preview shown with "Remove" link before saving

---

## EditPerson (v15 — complete overhaul)

Located at `src/components/EditPerson.jsx`.

**What changed in v15:**
- All photo logic removed entirely — photos handled exclusively via PersonPhotoModal
- Single "Manage Photos" / "Add Photo" button opens PersonPhotoModal inline
- `handleSave(complete)` saves biographical data only — throws on error so callbacks only fire on success
- Save As Is → `entryComplete: false`, calls `onSuccess`
- Save Changes → `entryComplete: true`, calls `onSuccess`
- Complete Later → `entryComplete: false`, calls `onCompleteLater`
- Self person hides Relationship, Side, Years fields (unchanged)
- Unused imports removed: `uploadImage`, `PhotoEditor`, `supabase`, `fetchItemImages`, `addPersonPhoto`, `deleteImage`

**Props:**
- `person` — person object
- `onClose` — X button, no save
- `onSuccess` — Save As Is or Save Changes
- `onCompleteLater` — Complete Later button

**`onCompleteLater` is wired in:**
- `PersonDetail.jsx` — closes modal and calls `loadData()`
- `Origins.jsx` — closes modal and calls `loadPeople()`

---

## PersonDetail (v15)

- Back button using `navigate(-1)` ✅
- `people` state stored — used for `partnerName` lookup
- `partnerName` computed before return: `people.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0] || null`
- Person photo is square (`rounded` not `rounded-full`), `w-48 h-48 md:w-64 md:h-64`
- Relationship subhead: relationship label only — no side prefix
- Second line: years, birthdate, location
- Button label: "Complete [FirstName]'s profile" (black, white type) on first visit; "Edit Profile" on return
- `profile_visited` set to true silently on first load via `useEffect`
- `onCompleteLater` wired to EditPerson

---

## AddPersonQuick (v15)

- Field order: Name → Side → Relationship
- All three fields required
- Side placeholder reads "Side *"
- Relationship placeholder reads "Relationship *"
- General error message: "Please fill in all required fields."
- Name field auto-capitalizes via `onChange` handler: `e.target.value.replace(/\b\w/g, c => c.toUpperCase())`
- CSS `textTransform: 'capitalize'` removed — data itself is now correctly capitalized
- After saving, `onSuccess(newPerson)` is called immediately and modal closes
- New person is auto-selected in the item form's person dropdown

Do NOT re-add the post-save prompt screen.

---

## AddItemForm Flow (v15, unchanged from v14)

Steps 1–4. Step 5 removed entirely.

After save: `onSuccess(savedItem)` → `AddItemFormWrapper` in `App.jsx` navigates to `/item/${savedItem.id}`. Keeper lands on ItemDetail to proof their entry.

Do NOT re-add the step 5 prompt.

---

## Auth Architecture (v12, unchanged)

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

**"Share with Seekers" banner** — appears in `ItemGrid` when `hasSeekers` is true and `draftCount > 0`. Clicking calls `/api/notify-seekers`. After success, invalidates cache and refetches items. Banner clears when draftCount drops to 0.

---

## File: `airtable.js` (v15)

Despite the name, fully migrated to Supabase. Contains all data fetching and mutation functions plus a module-level cache with 60-second TTL. Exports `invalidateCache(key)`. All mutating functions call `invalidateCache` automatically.

Will be renamed `supabaseData.js` in a future cleanup pass.

⚠️ Cache does not store empty results — prevents poisoned cache from failed fetches.

**New functions added in v15:**
- `setPersonPrimaryPhoto(personId, imageId, keeperId)` — sets chosen image to order=0, demotes current primary to order=1
- `addPersonPhotoAsPrimary(personId, url, keeperId)` — adds new photo at order=0, demotes existing primary (exists, not currently used in PersonPhotoModal flow)

---

## File: `src/services/utils.js` (v15)

Contains `getDisplayRelationship(relationship, side, partnerName)`. Import from here — do not duplicate logic elsewhere.

Signature changed in v15 to accept optional `partnerName` third parameter.

---

## File: `api/notify-seekers.js` (v15)

Working correctly as of April 2026. Confirmed via Vercel function logs.

Flow:
1. Verifies JWT auth from Authorization header
2. Finds keeper by user_id + keeperSlug
3. Finds all draft items for keeper
4. Publishes them (flips to public)
5. Finds seekers via access table (queries by `user_id`, NOT `id`)
6. Sends email to each seeker via Resend

⚠️ Queries `seekers` table using `.in('user_id', seekerIds)`. Do NOT revert to `.in('id', seekerIds)`.

Early returns (all return 200): no draft items found, no access rows found, no seekers found. These are not errors — they are correct behavior when those conditions exist.

"No outgoing requests" in Vercel logs means the function hit an early return before reaching Resend. Most common cause: no items were in draft status at the time. Always verify draft item count before diagnosing.

---

## File: `api/create-seeker.js` (v12, unchanged)

Handles duplicate signups — checks for existing `seekers` row before inserting, checks for existing `access` row before inserting. Same email can accept invitations from multiple keepers without errors.

---

## Landing Page (v12, unchanged)

- Split layout: Keeping left, Seeking right, vertical border divider. Mobile stacks vertically.
- "Start Keeping" → `/auth`
- "Start Seeking" → modal explaining invitation-only. Modal has "Log In" → `/auth?role=seeker` and "Back"

---

## SeekerHeader (v15)

Logout navigates to `/` (landing page) — not `/s/${slug}`. This allows a seeker to log back in as a keeper from the landing page.

Both desktop dropdown logout and mobile menu logout call `handleLogout` which:
1. Closes dropdown and mobile menu
2. Signs out via `supabase.auth.signOut()`
3. Navigates to `/`

---

## SeekerDashboard (v12, unchanged)

Uses `useAuth()` context. Fetches keeper names from `keepers` table using slugs from `connections`. Falls back to slug-derived name if fetch fails.

---

## Origins.jsx (v15)

- `partnerName` computed from people list: `partners[0]?.name.split(' ')[0] || null`
- `PersonCard` component accepts `partnerName` prop
- `partnerName` passed to every `PersonCard` instance (keeper/partners section, renderTwoColumn, renderCentered, friends section)
- `PersonCard` passes `partnerName` to `getDisplayRelationship`

---

## SeekerPersonDetail.jsx (v15)

- `allPeople` state added to store full people list from `loadData`
- `partnerName` derived from `allPeople` before computing `personalizedLabel`
- `getPersonalizedLabel` called with `partnerName` as sixth argument

---

## SeekerItemDetail.jsx (v15)

- `partnerName` derived from `people` list inside `loadData`
- `getPersonalizedLabel` called with `partnerName` as sixth argument

---

## Known Active Bugs (as of v15)

**EditItemForm — Save As Is identical to Save Changes:**
Both set `entry_complete = true`. Save As Is should set `false`. Minor — not breaking.

**Safari seeker login — old UI served (low priority):**
Seeker on Safari saw old cached UI despite clearing site data. May be Safari caching the JS bundle. Test with fresh seeker signup in incognito Safari. If it persists, investigate Vercel cache headers.

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
- [x] Gallery corner triangle = unshared draft (fading removed)
- [x] All gallery clicks go to ItemDetail — EditItemForm no longer opens from gallery
- [x] Trash can on gallery hover (desktop)
- [x] Complete Entry button full width at bottom of ItemDetail
- [x] AddItemForm saves and navigates to ItemDetail — step 5 prompt removed
- [x] AddPersonQuick saves and closes immediately — prompt removed
- [x] getDisplayRelationship utility — partner name labels across all keeper and seeker views
- [x] AddPersonQuick field order: Name → Side → Relationship
- [x] AddPersonQuick all fields required, general error message
- [x] AddPersonQuick name auto-capitalizes correctly in database
- [x] Add no_photo column to people table
- [x] Add profile_visited column to people table
- [x] PersonPhotoModal — full rewrite with photo grid, primary selection, delete, QR
- [x] EditPerson full overhaul — photo section removed, PersonPhotoModal integrated, Save As Is vs Save Changes distinct, Complete Later wired
- [x] setPersonPrimaryPhoto and addPersonPhotoAsPrimary in airtable.js
- [x] Person photo is square on PersonDetail
- [x] Person photo size increased on PersonDetail
- [x] PersonDetail back button
- [x] PersonDetail relationship subhead — no side prefix, birthdate/location on second line
- [x] PersonDetail "Complete [name]'s profile" button — black with white type
- [x] ItemDetail "Tap to add photo" opens PersonPhotoModal
- [x] EditItemForm main photo — upload/QR two-panel picker
- [x] Seeker logout goes to landing page
- [x] Partner Family labels → "[Partner's name]'s [Relationship]" not "-in-law"
- [x] Fix Share with Seekers banner — confirmed working April 2026
- [x] DMARC record added to GoDaddy for email deliverability
- [x] notify-seekers.js confirmed working end-to-end (Vercel logs April 2026)
- [ ] EditItemForm — Save As Is should set entry_complete = false not true
- [ ] Back button on seeker item detail pages
- [ ] Images enlargeable on item detail page (lightbox) — keeper and seeker views
- [ ] Friends section header in Connections → "No Relation"
- [ ] Seeker welcome page on first visit, gallery on return
- [ ] End to end test — full keeper signup through seeker gallery (clean, no bugs)
- [ ] Delete all test data before friend testing

---## Todo / Pinned Features (in priority order)



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
- Relationship display system — partner name labels ✅
- Person photo system — PersonPhotoModal full rewrite ✅
- EditPerson full overhaul ✅
- Share with Seekers banner — confirmed working ✅
- Email deliverability — DMARC added ✅
- Seeker logout → landing page ✅
- EditItemForm Save As Is / Save Changes distinction (minor)
- Back button on seeker item detail pages
- Image lightbox on item detail (keeper + seeker)
- Friends section header → "No Relation" in Connections
- Seeker welcome page on first visit
- End to end test (clean pass)
- Google/Apple/phone sign-in
- Address field for book export
- Book export — PDF first, then Blurb API
- Additional photo captions (images.caption column already exists)
- Seekers can share the link
- Multiple stories per item UI (data layer already supports it)
- Typo recovery on signup — confirm email field + "wrong email?" re-entry flow
- Change signup form final button to "Confirm Account"
- IMMEDATE BIG FIX. A SEEKER INVITED BY TWO SEPARATE KEEPERS DOES NOT GET AN INVITE FOR THE SECCOND ACCOUNT
-Item name needs to be title Cap automatically
- Change first item in AddItem categories list to: Choose from list
- need to have categories editable
- THE SUB HEAD ON ANNE JONE'S, MY SISTER, SEEKER SIDE THAT SHOULD SAY, "FROM YOUR GRANDMOTHER IDA MAE BOCK" SAID "FROM YOUR ANNE JONES'S GRANDMOTHER"
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
- Assumed "No outgoing requests" in Vercel meant notify-seekers wasn't reaching Resend — was an earlier invocation with no draft items. Always check draft item count before diagnosing
- Wrote find/replace for PersonDetail relationship span before checking current file state — file already had a different version of that line. Caused confusion. Always upload and read before writing
- Proposed "Make this your profile photo?" banner after adding new photo to PersonPhotoModal — ambiguous in context of a photo grid, reverted. Simpler: stay on grid, let keeper tap to set primary
- `addPersonPhotoAsPrimary` added to airtable.js but ended up not used in final PersonPhotoModal flow — do not remove, may be useful later
- Diagnosed notify-seekers as broken when it was actually working — banner clearing and items publishing correctly, email sending confirmed. Spent multiple exchanges on a non-bug

---

## Decisions Made (do not relitigate)

- "Connections" is the name for the family map/directory (formerly Origins)
- `access` is the Supabase table for seeker-to-keeper permissions
- Every item must link to a person — no Unknown option — keeper selects themselves if source is unknown
- A person without any items attached is invalid data — orphan trigger enforces this at database level
- Multiple stories per item are allowed
- QR upload is desktop-only by design
- Seekers never interact with QR flow
- Design phase starts after core flow is solid
- Email provider (Resend) handles both confirmations and seeker notifications
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
- Entry complete is set by conscious keeper action — not calculated from field presence
- Gallery images are never faded — fading system removed in v14
- All gallery item clicks go to ItemDetail — EditItemForm never opens directly from gallery
- Trash can on gallery is desktop hover only
- EditItemForm title is "Complete Item Information"
- Complete Entry button is full width at the bottom of ItemDetail, outside the two-column grid
- `deleteItemAndOrphanCheck` must be used instead of `deleteItem` everywhere deletion is triggered from the UI
- `no_photo` boolean on people table — do NOT use sentinel strings or legacy photo column for this
- `profile_visited` boolean on people table — controls Edit Profile button label only, not completion state
- Partner Family relationship labels use partner's first name, not "-in-law" — stored raw in DB, assembled at render
- `getDisplayRelationship` takes three params: relationship, side, partnerName — import from utils.js only
- PersonPhotoModal is the single place for all person photo management — EditPerson has no photo logic
- `order=0` is always the primary photo for both people and items — never use any other field for this
- Person photos on PersonDetail are square (`rounded` not `rounded-full`)
- Seeker logout goes to `/` landing page — not seeker login
- AddPersonQuick requires all three fields (Name, Side, Relationship)
- AddItemForm step 5 prompt is gone — do not re-add it
- AddPersonQuick post-save prompt is gone — do not re-add it
- After adding an item, keeper goes to ItemDetail to proof it — not to the gallery
- After adding a new photo in PersonPhotoModal, modal stays open on the grid — keeper taps to set as primary if desired
