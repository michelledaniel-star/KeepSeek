# KeepSeek Master Todo

**Last updated:** April 24, 2026
**Maintained by:** Michelle (update in place between sessions)

Working document. Check items off as completed. Add notes inline. Priority tags: **[P1]** = next up, **[P2]** = important but not blocking, **[P3]** = eventually, **[?]** = unresolved decision needed before work can start.

---

## KeepSeek Flow (product work on the live app)

### In flight — next up
- [ ] **[P1] Session A — Data layer for two-line labels** (see v22 handoff)
  - Supabase migration: add `related_via` and `qualifiers` columns to `people` table
  - Update `airtable.js`: fetchPeople / createPerson / updatePerson read/write new fields
  - Rewrite `utils.js` with `composeLabels` function; keep `getDisplayRelationship` as wrapper
  - Stopping point: app runs identically to today, safe to deploy
- [ ] **[P1] Session B — EditPerson redesign + Husband/Wife/Partner split**
  - Build new Connection Detail Information form (per v22)
  - Split relationship dropdown: Husband / Wife / Partner as three options
  - Reconcile AddPersonQuick to use same dropdown
  - Qualifier checkboxes + Great stepper + live preview
  - Conditional `related_via` dropdown (only when Side = Partner Family)
  - Delete warning with named dependents
  - "Coming Soon" greyed placeholder for story section
- [ ] **[P1] Session C — Two-line label rollout**
  - Update Origins.jsx to render two-line labels
  - Update all seeker display components (SeekerGallery, SeekerOrigins, SeekerPersonDetail, SeekerItemDetail, PersonDetail, ItemDetail)
  - Remove `partnerName` prop-drilling hack in Origins

### Known bugs
- [ ] **[P2] Duplicate seeker signup silently ignored by Supabase** — seeker who already has an account can't receive confirmation email when invited by a second keeper. Fix involves `api/create-seeker.js`. Deprioritized during current testing.
- [ ] **[P2] Items can be saved without a story attached** — add validation
- [ ] **[P2] Save button not disabled when keeper picks video/voice mode without recording** — UI fix
- [ ] **[P3] `SeekerOrigins.jsx` `ready` guard missing** — becomes moot after Session C ships, can be deleted
- [ ] **[P4]  EditItem: Edits to the story made here did not save
- [ ] **[P5]` EditItem: Paragraph returns made in story did not populate when I edited via  Replace Story
- [ ] **[P6]  AddItem: No way to have paragraph returns
- [ ] **[P7]  Accidentally added the same person twice. Need to stop that at beginning of second add
- [ ] **[P8]  Connections on phone expecially, the edit person and edit photo is really hard to nevegate. no decisive enough
- [ ] **[P9] Make Account tab/page
- [ ] **[P9] removed background image does not save/brightness doesn't do anything
- [ ] **[P9] Add micro optionn in photo
- [ ] **[P9] need to be able to pick more than one photo from photo library
- [ ] **[P9] edit layout of keeper profile detail
- [ ] **[P9] Add Item: why is there an upload from files option when it can be chosen in the menu with photo library and take photo
- [ ] **[P9] add item theres no way to change main photo 
- [ ] **[P9] Itam added from keeper profile did not save, it was in galleryy but not under the keepers photo in the profile
- [ ] **[P9]should be able to review vidoe recording from the add item form
- [ ] **[P9] take "no photo available' off the list of options in Add a photo of a connection in the Complete Item infomraion form and remrove upload from files on the first window of that add a photo form
- [ ] **[P9] Complete item information, the added image of who is came from should show up on the form after it's been added
- [ ] **[P9]   Complete item information: combine the take or upload photo for the main photo and the add photo option
- [ ] **[P9] Coomplete or Edit entry should be a floating bar, not at the bottom. At the bottom should be save and save takes the user back to the gallery  


### Planned features (after Sessions A/B/C)
- [ ] **[P2] Person stories** — text + voice + video on person records (same component as item stories). Requires stories table schema extension to support `person_id` as foreign key alongside `item_id`. Placeholder lives in EditPerson after Session B.
- [ ] **[P2] AI transcription via OpenAI Whisper API** — applies to story/description fields only. Keepers record in-browser, review transcript before saving. Whisper chosen over AssemblyAI for accuracy on proper nouns, lower cost, simpler architecture. Not yet implemented — waiting on relevant component files.
- [ ] **[P3] Keeper's own "Self" card suppression** — don't render "Self" label on Alice's own card (cosmetic, from v22)

---

## Housekeeping

- [ ] **[P3] Rename `airtable.js` to something accurate** — it's all Supabase now. Every future Claude gets confused. Candidates: `db.js`, `supabase.js`, `data.js`. Touches every import across the codebase — mechanical but tedious.
- [ ] **[?] Deprecated files cleanup** — any components/utilities no longer referenced after Session C ships should be removed rather than left as dead code

---

## Marketing / SEO

- [ ] **[?] [P2] Where does the blog live?** Three options still open:
  - React app (inside the codebase — more integrated but touches the codebase)
  - Subdomain static site (recommended by past Claude — doesn't touch React app)
  - Substack (least effort, least control)
  - **Decision needed before any blog work starts**
- [ ] **[?] [P2] Authentic heirloom photography** — identified as a differentiator. Do you have access to real heirloom photos (yours, family members', or friends willing to lend)? Stock imagery undermines credibility in this niche.
- [ ] **[?] [P2] Newsletter platform pick** — no current candidate. Mailchimp, Substack, Beehiiv, ConvertKit, Buttondown are the usual options. Decision blocks newsletter signup wiring.
- [ ] **[P3] Launch blog once blog-location is decided** — compounding SEO returns expected over multi-year horizon given low niche competition

---

## Book Export (long-range feature)

- [ ] **[P3] Research competitors** — Chatbooks, Artifact Uprising, Blurb BookWright (layout engines, pricing models, customization UX)
- [ ] **[P3] Plan white-glove pilot** — manual premium service first: keeper requests book, Michelle lays it out manually in InDesign or similar, prints via Blurb/similar. Goal: learn real content patterns before automating.
- [ ] **[P3] Address field on keeper profile** — needed for book shipping. Small but required before book export ships.
- [ ] **[P3] Move to semi-automated** (human review of generated layout)
- [ ] **[P3] Move to full automation** — flexible content-driven layout engine, not fixed templates

---

## "Make My Own KeepSeek" (demo / marketing site)

- [ ] **[?] Scope this out** — what does this actually mean? Interactive landing page demo? Template for other keepers to see what the app produces? Standalone marketing site? Decide before building.

---

## Strategic / Long-term

- [ ] **[?] [P2] Post-keeper-death seeker access model** — family subscription transfer is the recommended starting approach. Needs product decision: does access auto-transfer to a named successor? Do seekers get read-only archive access without keeper? Does the account freeze? Etc.
- [ ] **[P3] Connect to Keeper (seeker linking)** — Alice's sister wants to link her own keeper account to Alice's, so their seekers see both collections under one family. Listed as coming-soon placeholder in seeker dropdown currently.
- [ ] **[P3] Seekers can share invitation links** — currently only keepers can invite. Listed as coming-soon placeholder.
- [ ] **[P3] Google / Apple / phone sign-in** — currently email+password only

---

## Design / Learning

- [ ] **[P2] Learn Figma** — Michelle's coming from Illustrator/print. Priority because EditPerson redesign will benefit from proper mockups rather than hand-drawn sketches.
- [ ] **[P3] Image framing / card design pass** — was a pinned todo from v3. Current UI is functional placeholder. Revisit after flow is solid (Sessions A/B/C complete).

---

## Pre-launch (from v3, needs audit)

These may already be done — Michelle to verify/strike through as appropriate.

- [ ] Resend DNS verification for mykeepseek.com
- [ ] Supabase email confirmations on/off decision (currently OFF per v22)
- [ ] Connect mykeepseek.com to Vercel for custom app URL (currently `everheld-site.vercel.app`)
- [ ] Delete all test data in Airtable/Supabase before real user testing
- [ ] Seeker notifications when new items published (requires email provider wiring)
- [ ] Replace "Open in Email" invite flow with direct sending via Resend

---

## Done (archive — delete or keep for reference)

Move completed items here with date completed. Helps future Claude sessions see what's been tried.

- ✅ (April 2026) Two-line label system designed — v20/v21/v22 handoff sequence
- ✅ (earlier) Mobile keeper Add Item flow
- ✅ (earlier) Keeper profile setup page
- ✅ (earlier) Data fetching architecture refactor (per-component with module cache)
- ✅ (earlier) Supabase migration from Airtable for core tables

---

## Parking Lot (ideas, not commitments)

Stuff that came up in conversation but hasn't been committed to. Review periodically — move to a category above if it becomes real, or delete if it doesn't hold up.

- Additional photo captions on items
- Seeker dashboard fully wired (exists at `/seeker` but not linked meaningfully)
- Pronouns field proper implementation (currently stored as `pronouns:she` in Extra Notes as temporary workaround — may already be resolved in later versions, verify)
- Seeker welcome message reading actual keeper pronouns (related to above)
