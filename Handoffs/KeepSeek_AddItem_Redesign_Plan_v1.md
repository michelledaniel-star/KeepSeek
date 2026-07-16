# KeepSeek — Add Item Redesign: Concrete Plan (v1)

**Date:** July 16, 2026
**Status:** Planning complete, not yet built. Nothing in this document has been coded.
**Supersedes:** The 4-step `AddItemForm.jsx` wizard as the primary way to add an item. `QuestionFlow.jsx` and real transcription (shipped this session) become building blocks inside this new design rather than a separate preview.

---

## 1. Why this exists

The current `/add` flow is a locked, linear, 4-step wizard (photos → name/category → who it's from → tell the story) and nothing is saved to the real database until all 4 steps are finished. For KeepSeek's actual users — often older, often overwhelmed, sometimes going through a box of a deceased or aging relative's belongings — this creates two real problems: too many forced decisions in a row, and a genuine, justified fear that stopping partway means losing the work, since until now it truly wasn't saved anywhere but a local browser draft.

The redesign's non-negotiable core goal, stated by Michelle and repeated here so it doesn't drift: **the app must never add to someone's overwhelm.** No one should ever feel locked into a process, forced through steps in a fixed order, or afraid that stopping halfway (to cry, to rest, to come back tomorrow) means anything is lost.

---

## 2. What's already true and doesn't need to change

This matters because it means the redesign is smaller than it looks — most of the foundation already exists, just unused:

- The `items` table in Supabase already allows every field except `id` to be empty. `name`, `category`, `person_id`, `image_url` are all nullable. A photo-only item is already a legal row.
- An `entry_complete` boolean column already exists on `items` (defaults to `false`) and is already used successfully for the same purpose on the `people` table (`EditPerson.jsx`). No migration needed.
- `EditItemForm.jsx` (reached today from an item's detail page) already supports everything "come back and finish this later" needs: adding photos incrementally, editing name/category/owner/story independently of each other, and a working "Complete Later" save path. This is the same proven pattern already live for people.
- `ItemDetail.jsx` already renders gracefully with missing fields — description, value, beneficiary, story, owner are all conditionally shown, nothing breaks if they're absent.
- `Categories.jsx` already buckets items with no category under "Uncategorized."
- Real transcription is done and confirmed working live (Chrome, Safari, DuckDuckGo — laptop, phone, PC) via `api/transcribe.js` and `QuestionFlow.jsx`.

What's actually missing is the front door: a fast, low-friction way to *create* an item in the first place, and a way to see at a glance which items still need finishing.

---

## 3. The new Add Item experience

### 3.1 One screen, not two flows

Fast Flow and Easy Flow are not two separate places in the app. They're one continuous camera-first screen. Fast is the default rhythm; "tell the story now" is just one more button, always available, per item. Switching between them costs one tap, not a navigation change — because under the hood, there is no mode switch happening.

### 3.2 The shooting rhythm (Fast)

The screen has camera/shutter controls pinned at the top, always in the same place:

- **Take photo** — adds a shot to whatever item is currently "open." Someone can take as many angles/close-ups as they want (e.g., several angles of a cedar chest plus close-ups of the hardware) before moving on.
- **Next Item** — closes out the current item's photo group and starts a new one. This is the *only* mechanism needed to answer "if someone takes 100 photos across 40 items, how does the system know the grouping?" — the boundary is marked by the same physical action the person is already taking (walking to the next object), not guessed after the fact or sorted from memory later. Confirmed this matches how Michelle would actually move through a room.
- **Tell the story now** — always visible, per item. Drops into recording for *this* item only (see 3.4), then returns to the Fast rhythm afterward. This is "Easy Flow," just not named or navigated to separately.

The moment "Next Item" is tapped, that item is a real, saved row in the database — not a local draft. That's what actually kills the "did I lose this" fear, not a UI reassurance message.

### 3.3 The live gallery, same screen

Below the fixed camera controls, a real gallery grid (2–3 columns, reusing the existing gallery component/pattern) grows as items are completed. New items appear at the **top** of the grid — matching the sort order the gallery already uses everywhere else (newest first) — so the most common follow-up action, "one more shot of the thing I just did," requires no scrolling at all.

Tapping any thumbnail in this grid — the one just added, or one from 20 minutes ago — opens a lightweight way to add another photo to that item without losing the shooting rhythm. This is also the answer to "what if they want to add a photo to something they've already moved on from": there's no separate mechanism needed, it's the same grid, always visible, always tappable.

Known, acceptable tradeoff: after 40+ items the grid is long, and finding one specific earlier item means scrolling. This is the same amount of scrolling the permanent gallery already requires elsewhere in the app — not new complexity, just the existing pattern surfacing earlier.

### 3.4 Telling the story (Fast or Easy, same behavior)

Whenever someone moves into recording a story for an item — whether via the "tell the story now" button mid-Fast-Flow, via a full Easy session, or later during finishing — the behavior is identical:

- Recording starts immediately, with that item's **first-taken photo** already shown on screen, so there's something to look at while talking.
- A quiet, non-blocking "pick a different photo first" option is available but never forced — no modal asking them to decide before they can proceed. Forcing that choice every time is exactly the repetitive friction we're trying to remove.
- Story-starter prompts (the category-specific question suggestions already built for the old wizard) remain fully optional — visible if wanted, ignorable if not.
- Recording and transcription reuse what was just shipped: real mic capture, real Whisper transcription via `/api/transcribe`, editable text if transcription fails or they'd rather type.

### 3.5 Photo review and culling — one screen, three possible doors in

A single full-screen photo review pattern replaces the current small, hover-only 3-column grid controls in `AddItemForm.jsx` (which, confirmed, don't even work on a touchscreen today — `group-hover:opacity-100` requires a mouse hover that doesn't exist on mobile). The new pattern mirrors the phone's native Photos app, which nobody has to learn because everyone already knows it: a grid to browse, tap a photo to see it full-screen and large, a filmstrip of tiny thumbnails at the bottom to move between shots without leaving full-screen.

Two actions live on this screen: **Set as Main** (the one photo that represents the item in the gallery) and **Remove** (discard entirely). The currently-chosen Main is marked clearly in the filmstrip so it's never ambiguous mid-review.

This same screen is reachable at three different moments, and mandatory at none of them, because editing/culling timing genuinely varies by person:

1. Immediately after taking a photo (or a few), for someone who wants to sort as they go.
2. At the "Next Item" boundary, before moving to the next object.
3. Later, during "finishing" an entry — on a laptop, in comfort, for someone who'd rather batch it all at the end.

### 3.6 Upload economics (real cost fix, not just future-proofing)

Confirmed as a live bug, not a hypothetical: `AddItemForm.jsx`'s current `handleImageChange` uploads every selected photo to Cloudinary immediately, before anyone picks a favorite or deletes rejects. Someone taking 15 shots to get 1 good one is already paying (in Michelle's Cloudinary usage) for all 15, today.

New behavior for both Fast and Easy: photos stay as local, zero-cost previews until explicitly kept via the review screen (3.5). Only the kept/Main photo(s) actually upload. This applies uniformly — no separate rule needed for Fast vs. Easy.

### 3.7 Gallery display for incomplete items

Item tiles with no saved story render at reduced opacity **and** carry a small visible text label (e.g., "Needs a story") — not opacity alone, since a subtle brightness difference isn't a reliable signal for users with limited vision, which matters given who this app is for. This is genuinely new work: the existing gallery only distinguishes "draft" (not yet shared with seekers) via a corner ribbon, which is a completely different concept from "this entry isn't finished yet."

---

## 4. Explicitly out of scope for this build (tracked separately, not forgotten)

- **Photo editing** (crop, brightness, background removal) — `PhotoEditor.jsx` already exists but has broken controls (flagged in the old v18 backlog). Left out of the new flows entirely for now rather than fixed and included. Tracked as its own task.
- **Captions on extra (non-main) photos** — real, plausible feature, deliberately parked to keep the first build focused on the core rhythm.
- **Broader photo-quality guidance** (helping someone actually take a *good* photo — lighting, framing, tutorial) — named directly by Michelle as "the weakest part of the final product" and a bigger issue to solve later. Not part of this build.
- **Old v18/v19 backlog**, not yet triaged against this redesign: iPhone 12 horizontal scroll, editing a person/connection after creation, re-login navigation dead-end. The "Complete Entry" button rename is confirmed still live (`ItemDetail.jsx` line 349) and is small enough to do anytime, independent of this redesign.
- **No version control on the project.** Given the size of this redesign, this is the moment to set up even a bare-bones local git repo (`git init`, commit as you go, no GitHub account required) — this exact gap already cost one full rebuild of `QuestionFlow.jsx` earlier this month.

---

## 5. Suggested build order

1. Confirm/adjust the item-creation service call so a new item can be created from a single photo plus minimal data (mostly already possible via existing `createItem`).
2. Build the full-screen-plus-filmstrip photo review component first — both Fast and Easy depend on it, and it also replaces the currently-broken touch controls in the old wizard.
3. Build the unified camera screen: shutter, Next Item (grouping), Tell-the-story-now, and the live gallery-under-camera with newest-first ordering.
4. Wire the story-telling moment to the existing transcription pipeline plus first-photo-shown-while-recording plus optional prompts.
5. Add the "Needs a story" dimmed-plus-labeled state to the gallery.
6. Route the new screen in as the real `/add` experience; retire the old 4-step wizard once the new flow is confirmed working.
7. End-to-end live test pass across devices, same rigor as the transcription test (multiple browsers, phone and desktop).

---

## 6. Open items still needing a decision before or during build

- Exact wording/visual treatment for the "Needs a story" label.
- Whether the lightweight "add another photo" interaction (tapping an item in the live gallery mid-session) opens a small overlay or the fuller edit view — leaning toward a quick overlay to preserve shooting flow, not yet finalized.
- Whether to physically remove `AddItemForm.jsx` and `/flow-test` once the new flow ships, or leave them dormant for a period as a fallback.
