AddItemForm (v16 — major overhaul)
Located at src/components/AddItemForm.jsx. Steps 1–4.
What changed in v16
Step 1 — Multi-photo entry:

formData.image/imagePreview/imageUrl replaced with formData.images[] array
Each entry: { file, previewUrl, imageUrl } — index 0 is always primary
Photo grid shown after first photo added — thumbnail grid, 3 columns
First photo labeled "Main" with black border
Delete button (×) on hover for each photo
"Set main" button on hover for non-primary photos
If primary is deleted, keeper must designate new primary before proceeding
Multiple file selection supported (multiple attribute on file input)
QR photos append to array instead of replacing
handleDeleteImage(index) and handleSetPrimary(index) added
Upload loop in handleSubmit — uploads all images, saves extras to images table

Step 2 — Item name auto title-cases on keystroke. Category placeholder → "Choose from list".
Step 3 — Heading changed to "Who Is This From?"
Step 4 — Story step overhauled:

Format picker shows all three options (Write It / Voice Memo / Video) until one is chosen
Once chosen, other two disappear — chosen format shown as black pill label
Back button: if format chosen → clears format and returns to picker. If no format → goes to Step 3.
Story is required before Save is enabled — covers all three formats
showPromptsIntro state — controls one-time intro overlay
showPromptsTab state — controls Story Starters sliding tab
Picking a format triggers intro overlay (if not dismissed via localStorage keepseek_prompts_intro_seen)
Story Starters tab: fixed to bottom of screen, slides up/down, always visible once format chosen
allPrompts object — category-aware prompts, 5 per category, 10 categories
pb-24 on step container keeps content clear of the tab

PhotoEditor: Updated to use formData.images[0] instead of old formData.imagePreview.
After save: onSuccess(savedItem) → AddItemFormWrapper in App.jsx navigates to /item/${savedItem.id}. Keeper lands on ItemDetail to proof their entry. Do NOT re-add step 5 prompt.

EditItemForm (v16 — unsaved changes warning added)
Located at src/components/EditItemForm.jsx.
What changed in v16:

isDirty state — set to true on any field change via updateFormData()
showUnsavedWarning state — controls warning modal
updateFormData(updates) helper — replaces direct setFormData calls on all form fields, sets isDirty: true
isDirty resets to false in handleSave finally block
X button: if isDirty → shows warning. If clean → closes normally.
Warning modal has three options: "Save and close", "Discard changes", "Keep editing"
Tapping dark overlay behind warning dismisses it (keep editing)

⚠️ Save As Is and Save Changes both currently set entry_complete = true. Save As Is should set false. Minor known bug — not breaking.

EditPerson (v16 — unsaved changes warning added)
Located at src/components/EditPerson.jsx.
What changed in v16:

Same isDirty / showUnsavedWarning / updateFormData pattern as EditItemForm
All form field setFormData calls replaced with updateFormData
isDirty resets to false in handleSave finally block
X button triggers warning if dirty
Warning modal: "Save and close", "Discard changes", "Keep editing"


File: src/services/supabase.js (v16 — session persistence added)
jsimport { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'keepseek-auth',
    autoRefreshToken: true,
  }
});
persistSession: true — stores session in localStorage, survives browser close/reopen.
autoRefreshToken: true — silently renews JWT before expiry so users aren't kicked out mid-session.
User Sessions configuration (inactivity timeout, time-box) requires Supabase Pro plan — not currently configured.

AddPersonQuick (v15, unchanged in v16)

Field order: Name → Side → Relationship
All three fields required
Name field auto-capitalizes
After saving, onSuccess(newPerson) is called immediately and modal closes
New person is auto-selected in the item form's person dropdown
Do NOT re-add the post-save prompt screen.


Auth Architecture (v12, unchanged)
AuthProvider wraps the entire app — mounted once inside <Router>. Do NOT move inside individual routes.
onAuthStateChange uses setTimeout(fn, 0) to defer resolveUser outside the Supabase auth lock. Do NOT make async or await inside it.
onAuthStateChange filters TOKEN_REFRESHED and PASSWORD_RECOVERY — these do not change who the user is. Do NOT remove this filter.
resolveUser does NOT call setReady(false) — once ready is true it never goes back to false until logout.
resolveUser uses a version ref (resolveVersion). Each call increments the version. Only the call whose version matches at finally time sets ready: true.
AuthContext always loads both keeper and seeker data. userType = 'keeper' if keeper row exists, 'seeker' if only seeker row exists. connections always populated if seeker access rows exist.
AuthConfirm uses useAuth() context — no polling. Renders loading screen until ready, then routes based on userType and connections.
Login routing:

Keepers → /auth → /viewer (or /profile/setup if incomplete)
Seekers → /auth → gallery (one keeper) or /seeker dashboard (multiple)
Seekers can also log in at /s/:slug → that specific gallery
Keepers should NOT log in at /s/:slug

AuthPage seeker mode — /auth?role=seeker hides Create Account tab and "Don't have an account?" link.

Item Status Logic
New items default to 'public' if no confirmed seekers exist, 'draft' if confirmed seekers exist.
AddItemForm calls setDefaultStatus() on mount. Checks access rows for this keeper's slug. If confirmed seekers exist → 'draft'. If not → 'public'.
"Share with Seekers" banner — appears in ItemGrid when hasSeekers is true and draftCount > 0. Clicking calls /api/notify-seekers. After success, invalidates cache and refetches items. Banner clears when draftCount drops to 0.

File: airtable.js (v15, unchanged in v16)
Despite the name, fully migrated to Supabase. Contains all data fetching and mutation functions plus a module-level cache with 60-second TTL. Exports invalidateCache(key). All mutating functions call invalidateCache automatically.
Will be renamed supabaseData.js in a future cleanup pass.
⚠️ Cache does not store empty results — prevents poisoned cache from failed fetches.

File: src/services/utils.js (v15, unchanged in v16)
Contains getDisplayRelationship(relationship, side, partnerName). Import from here — do not duplicate logic elsewhere.

File: api/notify-seekers.js (v15, unchanged in v16)
Working correctly as of April 2026. Confirmed via Vercel function logs.
Flow:

Verifies JWT auth from Authorization header
Finds keeper by user_id + keeperSlug
Finds all draft items for keeper
Publishes them (flips to public)
Finds seekers via access table (queries by user_id, NOT id)
Sends email to each seeker via Resend

⚠️ Queries seekers table using .in('user_id', seekerIds). Do NOT revert to .in('id', seekerIds).
Early returns (all return 200): no draft items found, no access rows found, no seekers found. These are not errors.
"No outgoing requests" in Vercel logs means the function hit an early return before reaching Resend. Most common cause: no items were in draft status at the time. Always verify draft item count before diagnosing.

File: api/create-seeker.js (v12, unchanged)
Handles duplicate signups — checks for existing seekers row before inserting, checks for existing access row before inserting. Same email can accept invitations from multiple keepers without errors.
⚠️ KNOWN CRITICAL BUG: A seeker invited by a second keeper does not receive the invitation email. The access row is created but the email is never sent. Root cause not yet diagnosed — needs investigation in create-seeker.js and the invite flow. Do NOT close this until end-to-end tested with two separate keeper accounts inviting the same seeker email.

Landing Page (v12, unchanged)

Split layout: Keeping left, Seeking right, vertical border divider. Mobile stacks vertically.
"Start Keeping" → /auth
"Start Seeking" → modal explaining invitation-only. Modal has "Log In" → /auth?role=seeker and "Back"


SeekerHeader (v15, unchanged in v16)
Logout navigates to / (landing page) — not /s/${slug}. This allows a seeker to log back in as a keeper from the landing page.

SeekerDashboard (v12, unchanged)
Uses useAuth() context. Fetches keeper names from keepers table using slugs from connections. Falls back to slug-derived name if fetch fails.

Origins.jsx (v15, unchanged in v16)

partnerName computed from people list: partners[0]?.name.split(' ')[0] || null
PersonCard component accepts partnerName prop
partnerName passed to every PersonCard instance


SeekerPersonDetail.jsx / SeekerItemDetail.jsx (v15, unchanged in v16)
Both derive partnerName and pass as sixth argument to getPersonalizedLabel.

Known Active Bugs (as of v16)
🔴 CRITICAL — Seeker invited by two keepers doesn't receive second invite:
The access row is created but no invitation email is sent for the second keeper. Root cause unknown — needs diagnosis in create-seeker.js. End-to-end test: create two keeper accounts, invite the same seeker email from both, verify both emails arrive.
🟡 EditItemForm — Save As Is identical to Save Changes:
Both set entry_complete = true. Save As Is should set false. Minor — not breaking.
🟡 Image upload timeout:
Item disappears if keeper goes idle at the story step, even after photo and info were entered. Person record survives. Root cause: everything is held in component state until Save — if session state is lost during idle, unsaved data is gone. Investigate whether extending session persistence (done in v16) resolves this, or whether an earlier draft save is needed.
🟡 iPhone 12 horizontal scroll:
Nav requires horizontal scrolling on small screens. Audit fixed-width containers. Nav should use flex-wrap or stack vertically. Test on 375px viewport minimum.
🟡 Post-login redirect lands on blank state:
After re-login, user lands on blank state instead of their content. Fix: redirect to dashboard with existing content visible after login.
🟡 DuckDuckGo/privacy browser blocks signup:
Email verification blocked on privacy browsers. Add browser warning at signup: "For best results use Safari, Chrome, or Firefox."
🟡 Safari seeker login — old UI served (low priority):
May be Safari caching the JS bundle. Test with fresh seeker signup in incognito Safari. If it persists, investigate Vercel cache headers.

Open Todo (priority order)
Critical bugs:

Seeker invited by two keepers doesn't receive second invite — investigate create-seeker.js
Image upload timeout — item lost if user goes idle at story step
iPhone 12 horizontal scroll
Post-login blank state redirect
DuckDuckGo browser signup warning

Features:
6. ItemDetail bottom bar: rename "Complete Entry" → "Complete or Edit Entry"
7. Multiple photos per person — PersonPhotoModal data layer supports it, needs browsable UI in PersonDetail
8. Photo edit options (brightness, remove background) earlier — during Step 1 photo add, not just in edit flow
9. Voice to text — story input option alongside Write It / Voice Memo / Video
10. Gallery incomplete entry indicator — smart prompt for items missing stories
11. Onboarding checklist — first-run only: Add item → Add person → Share
12. Categories editable by keeper
13. Back button on seeker item detail pages
14. Image lightbox on item detail — keeper and seeker views
15. Friends section header in Connections → "No Relation"
16. Seeker welcome page on first visit, gallery on return
17. Seeker multi-account switcher in header dropdown
Deferred:
18. Google/Apple sign-in
19. Book export — PDF first, then Blurb API
20. Additional photo captions (images.caption column already exists)
21. Multiple stories per item UI (data layer already supports it)
22. Typo recovery on signup — confirm email field + "wrong email?" re-entry flow
23. Seekers can share the gallery link

What Went Wrong in Previous Sessions (honest notes for next Claude)

Chased a "same browser" red herring for seeker confirmation — root cause was missing emailRedirectTo
AuthContext return null while resolving caused blank pages — should have been a loading screen
Long back-and-forth on getSession() vs onAuthStateChange — correct answer is pure onAuthStateChange
window.location.href after login caused auth race — fix was navigate()
Duplicate Supabase user accounts from different sessions caused persistent auth failures
Stale sessions in browser after deleting Supabase users — not a code bug, clear site data
create-seeker.js had connections table reference instead of access — caused 500 on seeker signup
AddItemForm modal not closing after save — onSuccess and onClose fighting each other
Dynamic import of createStory in AddItemForm caused silent hang — use static import
stories table missing ON DELETE CASCADE on item_id — caused 409 when deleting items
PersonDetail.jsx — find/replace left old JSX block in place — always verify file after edits
Told Michelle to delete Vercel deployments — not possible, multiple "Production" entries is normal
Went in circles on 400 image error — was Cloudinary bad URLs from test data, not a code issue
All four seeker RLS policies used seekers.id instead of auth.uid() — fixed in v11
ready not included in AuthContext Provider value — caused timing guards to fail silently
Empty fetch results were being cached — fixed to prevent poisoned cache
AuthProvider mounted inside individual routes — caused remount race conditions
onAuthStateChange callback made async — caused AbortError: Lock was stolen
Used resolving ref instead of version counter — permanently blocked second auth event
Gave find/replace strings from memory instead of uploaded file — always write from the actual file
Assumed people table was empty based on Supabase UI — always verify with SQL
items_person_id_fkey was NO ACTION — blocked deletion of people with items. Changed to SET NULL in v12
notify-seekers.js queried seekers by id instead of user_id — no emails sent. Fixed in v12
Items defaulting to draft made seeker gallery empty — fixed with setDefaultStatus() in AddItemForm
Assumed Supabase UI table view was accurate — it can be filtered/cached. Always verify with SQL
EditPerson used in ItemDetail.jsx but never imported — caused white screen on Done button
Gave find/replace instructions referencing wrong file multiple times in same session — always read the uploaded file before writing find strings
useAuth import dropped from EditItemForm when import line was replaced — always verify full import line
Gave find/replace with a typo (tracking-widests) that didn't match the file — always copy strings exactly from the uploaded file
Spent multiple exchanges solving flow problems that were symptoms of a deeper UX mismatch — step back and look at the full picture before proposing solutions
Assumed "No outgoing requests" in Vercel meant notify-seekers wasn't reaching Resend — was an earlier invocation with no draft items. Always check draft item count before diagnosing
Wrote find/replace for PersonDetail relationship span before checking current file state — file already had a different version of that line. Caused confusion. Always upload and read before writing
Proposed "Make this your profile photo?" banner after adding new photo to PersonPhotoModal — ambiguous in context of a photo grid, reverted. Simpler: stay on grid, let keeper tap to set primary
addPersonPhotoAsPrimary added to airtable.js but ended up not used in final PersonPhotoModal flow — do not remove, may be useful later
Diagnosed notify-seekers as broken when it was actually working — banner clearing and items publishing correctly, email sending confirmed. Spent multiple exchanges on a non-bug
Attempted large multi-step find/replace across sessions without re-reading the uploaded file each time — caused stale string mismatches and wasted exchanges. Always re-read before writing any find string.
Download button in claude.ai is unreliable for large files — always give code as copy/paste blocks in chat, never rely on file download


Decisions Made (do not relitigate)

"Connections" is the name for the family map/directory (formerly Origins)
access is the Supabase table for seeker-to-keeper permissions
Every item must link to a person — no Unknown option — keeper selects themselves if source is unknown
A person without any items attached is invalid data — orphan trigger enforces this at database level
The orphan trigger is intentional — do NOT remove it to allow free-floating people
Multiple stories per item are allowed
QR upload is desktop-only by design
Seekers never interact with QR flow
Design phase starts after core flow is solid
Email provider (Resend) handles both confirmations and seeker notifications
Keeper is always one person, never a couple
Collections are never merged — permanently isolated
Data fetching is per-component with module cache — do NOT move back to App.jsx
Module cache chosen over React Query — appropriate for current scale
Pronouns removed entirely
profile_complete stored in Supabase keepers table — do NOT use localStorage
Invite email sends directly via Resend — do NOT revert to mailto
AuthConfirm does NOT create records — serverless functions do that at signup time
Resend-Vercel integration manages RESEND_API_KEY — do not manually edit in Vercel
AuthProvider wraps the entire app inside <Router> — do NOT move inside individual routes
onAuthStateChange callback must NOT be async — use setTimeout(fn, 0) to defer resolveUser
Keeper login uses navigate('/viewer') not window.location.href
connections object in AuthContext is a map keyed by keeper_slug — includes keeperId
Serverless functions use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — no VITE_ prefix
Both keeper and seeker row creation go through serverless functions — do NOT revert to direct frontend inserts
AuthContext uses pure onAuthStateChange with no getSession() init — do NOT add getSession() back
emailRedirectTo must be passed explicitly in all supabase.auth.signUp calls
keepers.name is source of truth for keeper name — First Last only — synced via updatePerson
keepers.self_person_id points to the keeper's own people row — set by create-keeper.js at signup
Images live in the images table — one primary (order=0) plus unlimited additional per item/person
notify-seekers.js requires JWT auth — frontend passes session.access_token in Authorization header
people.name is always First Last — middle and maiden stored separately, assembled at render
Maiden name displays with parentheses: (Maiden) — in sub-heading only
Sub-heading on PersonDetail only appears if middle_name or maiden_name exist
Self person hides Relationship, Side, Years in EditPerson form
X on extra photos in EditItemForm deletes immediately from Supabase — not deferred to Save
showRemoveBg={false} passed to PhotoEditor when used for people photos
access.seeker_id stores auth.uid() — all RLS policies must compare against auth.uid() directly
Seeker button on landing page opens a modal — not a direct route to /auth
No combined accounts — seeker and keeper accounts are always separate
New items default to public until a seeker confirms their account, then default to draft
Black corner tag = draft and hasSeekers — independent of entry_complete
Entry complete is set by conscious keeper action — not calculated from field presence
Gallery images are never faded — fading system removed in v14
All gallery item clicks go to ItemDetail — EditItemForm never opens directly from gallery
Trash can on gallery is desktop hover only
EditItemForm title is "Complete Item Information"
Complete Entry button is full width at the bottom of ItemDetail, outside the two-column grid
deleteItemAndOrphanCheck must be used instead of deleteItem everywhere deletion is triggered from the UI
no_photo boolean on people table — do NOT use sentinel strings or legacy photo column for this
profile_visited boolean on people table — controls Edit Profile button label only, not completion state
Partner Family relationship labels use partner's first name, not "-in-law" — stored raw in DB, assembled at render
getDisplayRelationship takes three params: relationship, side, partnerName — import from utils.js only
PersonPhotoModal is the single place for all person photo management — EditPerson has no photo logic
order=0 is always the primary photo for both people and items — never use any other field for this
Person photos on PersonDetail are square (rounded not rounded-full)
Seeker logout goes to / landing page — not seeker login
AddPersonQuick requires all three fields (Name, Side, Relationship)
AddItemForm step 5 prompt is gone — do not re-add it
AddPersonQuick post-save prompt is gone — do not re-add it
After adding an item, keeper goes to ItemDetail to proof it — not to the gallery
After adding a new photo in PersonPhotoModal, modal stays open on the grid — keeper taps to set as primary if desired
Story Starters tab is always visible once a format is chosen in AddItemForm — do not remove it
Format picker in AddItemForm hides other options once one is chosen — Back clears the choice, does not go to Step 3
Unsaved changes warning covers X button and dark overlay tap in both EditItemForm and Ed
AddItemForm: photos now upload to Cloudinary on add, not at save. Whole entry autosaves to localStorage (keepseek_additem_draft) and offers Resume on reopen. Cleared on successful save.
Known follow-ups deliberately deferred: orphaned Cloudinary images from abandoned entries (tolerate at current scale; cleanup pass or Cloudinary auto-expire later); in-progress voice/video recordings and a photo mid-upload aren't covered by the draft.

Safari, first load of brand-new account: 'loading' hung once, recovered on re-login, not reproduced in Chrome or on retry. Suspect first-paint/fetch race or transient 400 on images. Watch for repeat reports." 
#3, iPhone horizontal scroll is fixed
"make 'keepsake' the consistent term across UI — text only, watch for code-dependent uses of 'item'" 
when new user makes an account and goes to the first page the add item in the upper right corner should not ber there. just the 'add your first keepsake' in the center. The additem in the corner only shows after an item is in the gallery