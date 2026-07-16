# KeepSeek — Session Handover

**Date:** July 16, 2026
**Session focus:** Recovering and finishing Stage 1 of the QuestionFlow talk-to-text redesign; Stage 2 (real transcription) not yet started.
**Prior context:** `KeepSeek_Handoff_v19.md` (July 15) remains authoritative for the broader project — Supabase schema, routes, the signup-hang fix, and the still-open v18 Before Launch backlog. This document covers only what happened in this session and what to do next.

---

## 1. Executive Summary

KeepSeek is a private family heritage app where a keeper catalogs heirlooms with photos and stories, which invited family members ("seekers") can browse. This session set out to wire real AI transcription into the new swipe-card Add Item flow (`QuestionFlow.jsx`), but discovered that flow — built in a July 8 session — never survived a computer migration (no git, manual-copy workflow). Most of this session went to recovering that lost work, fixing three real bugs surfaced by testing it fresh, and then a scope change: swipe/drag was removed entirely in favor of buttons-only, for accessibility with an older user base. Real transcription wiring (the original goal) has not yet begun.

---

## 2. Current State & Progress

### Fully completed this session
- **Recovered `QuestionFlow.jsx` and the `/flow-test` route in `App.jsx`**, both lost when the project moved to a new Mac (no version control — see Open Issues). Recovered verbatim from July 8 conversation history, not rebuilt from scratch.
- **Fixed a mouse-drag tracking bug**: dragging with a mouse lost tracking whenever the cursor left the card's bounding box (touch doesn't have this problem). Fixed by tracking mouse movement on `window` instead of just the card element. *(Superseded — see below; this code has since been removed entirely.)*
- **Fixed an animation bug**: a successful swipe swapped question content immediately at the mouse's release position instead of letting the card finish sliding off-screen first, causing a visible "bump and bounce." Fixed with an exit-then-swap sequence (`suppressTransitionRef` pattern). *(This animation approach is retained — see below.)*
- **Diagnosed a "tilt from the bottom of the screen" bug** as macOS Safari/Chrome's native two-finger trackpad "swipe to go back" gesture firing alongside the custom drag code, not a bug in the app's own logic. Mitigated with `overscroll-contain` and `touch-pan-y` CSS. This mitigation reduces but does not guarantee elimination of the browser's native gesture in all browser/OS versions.
- **Final decision, executed:** remove all swipe/drag gesture code from `QuestionFlow.jsx` entirely — on every device, not just desktop. Reasoning: KeepSeek's users skew older, they already have to tap a mic button to record, and a second tappable button (Skip/Next) is more reliable and more consistent than requiring a gesture on some devices and not others. A phone-only "swipe discoverability hint" (wiggle animation + fading text) was previewed in chat but was **not built into the file** — it became moot once swipe was removed entirely. Treat it as abandoned, not pending.
- **Buttons still trigger a slide animation**: tapping Skip or Next animates the card fully off-screen (using `window.innerWidth` so it clears any screen size), then the next question appears already centered — preserving the "swipe-like" feel without requiring a gesture.
- **OpenAI API account created** (key named `keepseek-transcription`, Default project, no separate project needed). The user has the raw key value; it was deliberately never pasted into chat.

### Architectural / design decisions made this session
- Swipe/drag is **out** as an interaction, permanently, on all devices. Do not reintroduce it without explicit request — this was a deliberate accessibility call, not a shortcut.
- Buttons must always produce the animated slide transition (not an instant content swap) — this is a locked visual requirement, independent of the gesture decision above.
- Whisper transcription must be called from a server-side function (matching the existing `api/upload-session.js` pattern), never directly from the browser — the OpenAI key must never be exposed client-side.
- Full-file swaps were used instead of find/replace for the final `QuestionFlow.jsx` change, per the user's own stated rule: when edits are scattered across many non-contiguous parts of a file, delivering a complete new file is preferred over patch instructions.

### Files created, modified, or deleted
| File | Status | Notes |
|---|---|---|
| `src/components/QuestionFlow.jsx` | **Recreated, then rewritten twice more, final version delivered** | Only the final buttons-only version (below) should be used. Intermediate drag-based versions from earlier in this session are superseded — do not resurrect them. |
| `src/App.jsx` | **Modified once** | Added `import QuestionFlow from './components/QuestionFlow'`, a `FlowTestWrapper` function (feeds 4 sample questions: name, owner, story, beneficiary), and the `/flow-test` route (inside `Protected`, same as `/add`). No further changes needed — the buttons-only `QuestionFlow` has the same props interface (`questions`, `onComplete`, `onCancel`), so this file does not need to change again for that reason. |
| Nothing was deleted. No Supabase, Airtable/`airtable.js`, or Cloudinary changes this session. | | |

**Current exact state of `QuestionFlow.jsx`:** one question per full-screen card, progress dots, mic button (real recording via `MediaRecorder`), a textarea showing a **stub placeholder transcript** after recording stops, and Skip/Next buttons that animate the card off-screen before advancing. No swipe, no drag, no touch/mouse pointer handling of any kind remains in the file.

**Important:** `/flow-test` is still a **preview-only route**. The real, live Add Item flow at `/add` still uses the old `AddItemForm.jsx`, unrelated to `QuestionFlow`. Promoting `QuestionFlow` to be the actual Add Item experience has not happened and was not discussed this session.

---

## 3. Open Issues & Blockers

- **Real transcription (Stage 2) has not been built.** This was the original goal of the session and got deferred by the recovery/debugging work above. In `QuestionFlow.jsx`, `startRecording`'s `MediaRecorder` already collects audio into a `chunks` array via `ondataavailable`, but `onstop` never assembles or sends that audio anywhere — it just sets a hardcoded placeholder string. That is exactly where Stage 2 picks up.
- **Unconfirmed: was the OpenAI key actually added to Vercel?** The user was walked through adding `OPENAI_API_KEY` as an environment variable (all three environments: Production, Preview, Development) in the Vercel dashboard, but this was never confirmed back in chat. Verify before assuming it's in place.
- **Unverified assumption:** the audio format `MediaRecorder` produces will differ by browser (commonly `audio/webm` in Chrome, `audio/mp4` in Safari) with no explicit `mimeType` set in the current code. Whisper's API accepts multiple formats, but the future transcription serverless function needs to handle whatever format actually arrives — this hasn't been tested end-to-end.
- **No version control on this project.** The root cause of this entire session's rework: the project is copied manually between machines with no git. This already caused one real loss of working code (`QuestionFlow.jsx` and the `/flow-test` route from the July 8 session). It was flagged to the user as a real risk worth a free private GitHub repo, but explicitly parked — not acted on this session. Recommend surfacing this again if it comes up naturally, but it is not an active task.
- **Unrelated, still-open backlog from v18/v19** (untouched this session, carried forward as-is): iPhone 12 horizontal scroll (unverified), editing a person/connection after creation (discoverability), re-login navigation dead-end, hiding broken photo-edit controls (brightness/remove-background), renaming the "Complete Entry" button.

---

## 4. Immediate Next Steps

1. **Confirm the OpenAI key is actually in Vercel's environment variables** before writing any transcription code — ask the user directly, or have them check Vercel → Project → Settings → Environment Variables for `OPENAI_API_KEY`.
2. **Have the user do one clean end-to-end test of the current buttons-only `QuestionFlow.jsx`** at `mykeepseek.com/flow-test` (replace file, `vercel --prod`, hard refresh) — this exact final version has not yet been confirmed working live; the session ended right after delivering it.
3. **Build Stage 2 — real transcription:**
   - Create a new serverless function (e.g. `api/transcribe.js`), following the existing `api/upload-session.js` pattern, that accepts the recorded audio and calls the OpenAI Whisper API server-side.
   - In `QuestionFlow.jsx`, update the `onstop` handler to assemble the collected `chunks` into a `Blob`, `POST` it to the new endpoint, and replace the stub `setTranscript(...)` line with the real returned transcript text.
   - Test across Chrome and Safari specifically, given the MIME-type assumption noted above.
4. **Decide when/how to promote `QuestionFlow` from `/flow-test` preview to the real `/add` route**, replacing `AddItemForm.jsx` — not started, not scoped yet.
5. **Pick up the still-open v18/v19 Before Launch backlog** (listed above) — independent of this session's work, still waiting.

---

## 5. Technical Context Checklist

- **Stack:** React + Vite, Supabase (data/auth, accessed via `src/services/airtable.js` despite the legacy name), Cloudinary (images), Vercel (hosting/deploy).
- **Machine/environment:** Mac Studio, project at `/Users/PrettyBaby/Desktop/keepseek-unified-icloud`. No local dev server in this workflow — testing happens on the live deployed site.
- **Deploy command:** `vercel --prod`. If the CLI login token expires, run `vercel login` and select the existing KeepSeek project.
- **Before any auth-flow testing:** run `localStorage.clear()` in the browser console first, to avoid stale/ghost sessions.
- **Test route for this work:** `mykeepseek.com/flow-test` — requires login (wrapped in the same `Protected` component as `/add`), shows 4 sample questions, and ends with a JavaScript `alert()` popup showing captured answers as JSON — it does not save anything to Supabase yet.
- **Design system tokens used in `QuestionFlow.jsx`:** `font-heading` (italic, for the question prompt), `font-subhead` (buttons), `font-body` (textarea), teal accent `#669999`.
- **OpenAI/Whisper specifics:** account created under Default project (no dedicated project needed for a single use case); Whisper transcription costs approximately $0.006 per minute of audio.
- **Debugging tools used this session worth knowing about:** `ffmpeg`/`ffprobe` were used server-side to extract and tile frames from screen-recording videos the user uploaded, to visually diagnose animation bugs from stills rather than guessing — worth reusing if another visual/animation bug needs diagnosing from a video in a future session.
