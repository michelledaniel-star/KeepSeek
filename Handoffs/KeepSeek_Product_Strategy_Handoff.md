# KeepSeek Product Strategy Handoff
*Last updated: March 27, 2026*

---

## What KeepSeek Is

A private family heritage platform where **keepers** catalog heirloom items with photos, stories, and context, and **seekers** (invited family members) browse the collection. The core emotional pitch: *"I wish I had a video of my great-grandmother talking about the quilt she made."* KeepSeek makes that possible for future generations.

**Live at:** mykeepseek.com  
**Stack:** React + Vite + Tailwind, Supabase, Cloudinary, Resend, Vercel  
**Codebase:** keepseek-unified-fixed-2

---

## The Founder

Michelle is a 58-year-old graphic designer and photographer learning React. She is the sole developer. She works on a Mac, deploys via Vercel, and uses Claude as her primary technical collaborator. She is direct, exacting, and pushes back when things move too fast or skip root causes. She needs this product to generate $80K/year in passive income.

**Working rules:**
- Ask for files before touching them
- Diagnose before writing code
- Give exact find/replace pairs, never downloadable files
- Never patch — find the root cause
- Always run `npm run build` before deploying

---

## Current Product Status

Core infrastructure is built and mostly stable:
- Keeper signup, profile, item management
- Seeker invitation via email, seeker gallery
- Cloudinary image storage
- Supabase auth and database
- Collections (formerly Categories) organizing items
- Connections (formerly Origins/Directory) — family relationships
- Mobile Add Item flow
- "Complete Entry" flow partially implemented (EditItemForm → EditPerson)

**Known open bugs:**
- "Share with Seekers" banner not clearing reliably
- "Unknown" person option causing UUID error
- Safari seeker login caching issue

**Known open features:**
- Aunt/Uncle relationship options in seeker signup
- Invite email copy updates
- Email delivery speed investigation
- QR code upload for people photos
- Seeker welcome page on first visit

---

## The Two Products (Decided This Session)

### Product 1: KeepSeek (current — finish first)
Structured catalog. Keeper documents items systematically. Seekers browse. Full feature set. Target user: motivated keeper age 45-65 willing to spend time organizing a collection.

**Priority:** Finish and launch before building anything new. "Finished enough" means: keeper can sign up, add items, invite seekers, and someone can take their money.

### Product 2: Capture App (future — do not build yet)
Capture-first, friction-free. A link is sent to an elderly family member. They open it, camera is on, they talk, they stop, done. No login, no form, no account. The keeper gets the recording. Organization happens after the fact by the keeper, not the person being recorded.

**Key feature:** On-screen guided prompts fade in during recording — *"What is this object?" / "Who did it belong to?" / "What's the story?"* — replacing forms with guided conversation. The transcript contains all structured data automatically.

**Do not build this yet.** Document the idea and return to it after KeepSeek has paying users.

### Product 3: Young Moms Version (future concept)
Chatbooks-style integration for capturing baby milestones and early family memories. Different market, different urgency, different willingness to pay. Keep the idea documented. Do not build yet.

---

## The Permanence Problem (Core to the Product)

Every competitor ignores this. KeepSeek should address it honestly and make it a competitive advantage.

**The problem:** Digital archives disappear when companies shut down. QR codes in printed books become dead links. Families should not have to trust KeepSeek to survive 50 years.

**The honest answer:** Three layers of redundancy.

1. **The printed book** — physical, permanent, requires no technology to read in 200 years
2. **The downloadable archive** — ZIP file with all photos, videos as MP4, transcripts as text files, and an offline HTML viewer. Families store it themselves in Google Drive, iCloud, USB drives. KeepSeek facilitates creation but doesn't have to be the permanent host.
3. **Optional cloud backup** — Amazon Glacier for long-term cold storage at ~$0.004/GB/month. A $50 one-time payment covers 100+ years of storage costs for a typical family collection.

**The brand position:** *"We help you build a family archive that outlives us."* Export is always available, no paywalls on export, families own their own permanence.

---

## Export — Decided This Session

### Book Export (primary revenue product)

**Format:** Blurb 10x10 square (handles landscape and portrait images equally, premium quality, coffee table feel)  
**Also:** 8.5x11 PDF for home/copy shop printing (different layout template, same content)  
**These are two separate templates** — not a resize of the same file

**Book contents:**
- Cover page with collage (system picks best photos, keeper can swap before ordering)
- Table of contents based on Collections
- One item per page: photo + story/transcript + item details
- People/family members section
- QR codes with transcripts (see QR section below)

**Print-on-demand:** Blurb API integration. Keeper clicks "order book," chooses hardcover vs softcover, sees price based on page count, pays, book ships directly. KeepSeek marks up the price. Roughly $20-30 margin per book.

**Build order:**
1. PDF download first (validates layout, fastest to ship)
2. Blurb API integration second (revenue)
3. Downloadable archive ZIP third (permanence)
4. Optional Glacier backup fourth (premium tier, after paying users exist)

### Downloadable Archive

ZIP file containing:
- All photos
- All videos as MP4
- All transcripts as .txt files
- Offline HTML viewer (works without internet, no KeepSeek required)

### Blurb Technical Requirements
- 0.5 inch minimum margins
- 300 DPI minimum for images
- "Safe zone" inside margins for critical content
- Warn keeper at upload time if image resolution is too low for print quality

---

## Video and Transcription — Decided This Session

### Input methods (all three feed the same story field)
- Type directly
- Voice recording (AI transcribes)
- Video recording (AI transcribes, video stored separately)

The printed page shows the transcript regardless of how it was captured. The QR code is how the video survives into print.

### Transcription
Use **AssemblyAI** or **Whisper** for auto-transcription. Cost: ~$0.65/hour of audio (~6 cents for a 5-minute video). Transcript is editable by keeper after generation — they fix proper nouns, family names, place names. Transcript on printed page is always human-reviewed, never raw AI output.

### File size and limits

**Per video:** 5-minute hard cap (~150-250MB at compressed mobile quality)  
**Per collection:** Tiered by plan (free: 1GB, paid: 10GB — natural upsell lever)  
**Format:** Accept MOV/MP4/HEVC, transcode everything to MP4 via Cloudinary on upload

**Countdown indicator** (on Michelle's todo list): Show as soft warning, not hard cutoff.
- Green: 0–90 seconds
- Amber: 90–150 seconds  
- Red: 150+ seconds with note that longer stories may not fully print

**Text limit on printed page:** ~250-350 words fits comfortably under a photo on a 10x10 page. If transcript exceeds limit, keeper sees: *"Your story is 520 words. The printed page fits 300. Edit it down, or use the full version in the digital collection only."* Book shows truncated version with note directing to digital collection for full story.

### Seekers and uploads
Seekers cannot upload or record anything in the current product. If a seeker wants to become a contributor, they create their own keeper account. This boundary is intentional — do not let it creep.

---

## QR Codes — Decided This Session

**QR codes are ugly by default.** They can be styled — rounded dots, center logo, brand colors. Design a KeepSeek-branded QR code before putting any in printed books.

**Alternative:** A short memorable URL printed elegantly (*keepseek.com/the-daniels*) does the same job and may be cleaner.

### What the QR code(s) point to

**One QR code on the inside cover** linking to the family's live KeepSeek collection (keepseek.com/the-daniels). Seekers land on the familiar gallery and browse everything. The existing gallery and Collections structure already functions as a table of contents — no new feature needed.

**Optional per-item QR codes** on each item page linking directly to that item's video. Simple, direct — grandmother turns to the quilt page, scans, watches the video.

### The permanence issue with QR codes
QR codes in printed books point to URLs. If KeepSeek shuts down, those URLs die. 

**Solution:** Also generate a QR code pointing to the family's own Google Drive archive. KeepSeek generates the QR code from a URL the keeper pastes in — the family uploads their archive ZIP to Google Drive, makes the folder public, pastes the link, KeepSeek wraps it in a QR code for the book. KeepSeek facilitates but doesn't host the destination.

**Instruction copy matters as much as the feature.** The Google Drive flow has 4-5 steps that are obvious to a developer and completely foreign to a 70-year-old. Plain language instructions with screenshots are required.

---

## Monetization — Decided This Session

### Primary revenue: Book sales
Print-on-demand via Blurb. $20-30 margin per book. Pricing slides based on hardcover vs softcover and page count. Families buy multiple copies, buy at holidays, buy when a grandparent dies. No subscription churn on physical products.

**Comparable:** To hit $40K from books alone = ~1,500-2,000 books sold. Achievable without massive subscriber base.

### Secondary revenue: Freemium subscription
- Free: up to 25 items
- Paid: unlimited items, more storage, higher video limits
- Price: $8-12/month or $60-80/year
- The item cap creates natural urgency mid-catalog

### Future: Estate/Probate B2B
Estate attorneys, senior living facilities, estate sale companies. White-label or referral version. One attorney with 50 clients at $20/referral = $1,000/year from one contact. Do not pursue until product has real consumer traction.

### Future: Gifting
"Give your parent the gift of documenting their collection." Gift cards or gifted subscriptions. Mother's Day and Christmas are obvious moments. Solves the urgency problem — someone buys it for a person who'd never do it themselves.

---

## What Has Not Been Decided Yet

- Exact free vs. paid feature line (decide after real user feedback)
- Whether to offer the Glacier permanent backup as a paid tier
- Page layout design for the book (Michelle will design this — she is the graphic designer)
- Exact Blurb API integration timeline
- Whether individual item QR codes are included in the first book export or added later

---

## Immediate Next Steps (In Order)

1. **Get 10 real users** — not friends being polite. Post in Facebook groups for estate planning, genealogy, senior caregiving. *"Does anyone feel like they're losing family stories attached to objects?"* Do this before building anything new.

2. **Finish the known open bugs** — Share with Seekers banner, Unknown person UUID error, Safari caching issue.

3. **Finish Complete Entry flow** — EditItemForm → EditPerson with auto-save.

4. **Define free vs. paid line** — even a rough decision unblocks everything downstream.

5. **Design the book page layout** — Michelle designs this, not a developer task. One item per page. Story/transcript below or beside photo. Decide transcript placement before writing export code.

6. **Build PDF export** — validates layout before investing in Blurb integration.

7. **Build Blurb integration** — revenue.

---

## Decisions Made (Do Not Relitigate)

- Square format (10x10) for Blurb — handles landscape and portrait equally
- 8.5x11 for home PDF — standard, prints anywhere
- One item per page in the book
- Collage cover (system picks, keeper can swap)
- Table of contents based on Collections (already built)
- Seekers cannot upload or record — they create a keeper account if they want to contribute
- Capture app is a separate future product, not a KeepSeek feature
- Video transcripts are always keeper-reviewed before printing
- Soft time warnings, not hard recording cutoffs
- One QR code on inside cover pointing to live collection (plus optional per-item)
- QR codes can point to family-owned Google Drive, not just KeepSeek
- AssemblyAI or Whisper for transcription (~6 cents per 5-minute video)
- 5-minute hard cap per video
- The book is a curated highlight; the digital collection is the full archive
