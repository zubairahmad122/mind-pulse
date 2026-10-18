# Well Mode — Play Store Screenshot Guide

Practical, step-by-step guide to capturing the 8 phone screenshots for the
Play Store listing. Pairs with the "Focus Timer & Screen Breaks" positioning
already live on the listing copy, website, and in-app onboarding — each shot
below shows exactly the feature that story promises.

---

## 1) Technical requirements (verified against Play Console's current rules)

| Requirement | Value |
|---|---|
| Count | 2 minimum, **8 maximum** |
| Format | JPEG or 24-bit PNG (no alpha/transparency) |
| Dimensions | Between 320px and 3840px on each side |
| Aspect ratio cap | Longer side can't exceed **2×** the shorter side |
| **Recommended portrait size** | **1080 × 1920 (9:16)** — Google's own stated minimum for the portrait recommendation |

**Why target exactly 1080×1920:** many current flagship phones screenshot at
taller ratios (1080×2400, 1080×2340 — roughly 20:9), which *exceeds* the 2×
aspect-ratio cap above (2400/1080 ≈ 2.22). Don't just grab whatever your test
device produces natively — capture or crop to 1080×1920 so every screenshot
is safely inside Play Console's own rule and matches their recommendation.

---

## 2) Before you start capturing

- Fresh-ish state helps: a very new account looks less staged than a
  years-old streak, but a **completely empty/zero state looks broken** —
  do a few real sessions first (one eye exercise, one relax session, one
  short focus block) so the hero cards and weekly charts have real,
  non-zero data to show.
- Full battery icon, Wi-Fi on, no incoming notifications mid-capture —
  clear the status bar of anything distracting before each shot.
- Use **adb** for clean, no-chrome-bar captures instead of the device's own
  screenshot button (avoids the notification shade peeking in, matches
  exact pixel dimensions):
  ```bash
  adb shell screencap -p /sdcard/shot.png
  adb pull /sdcard/shot.png ./screenshots/01-focus.png
  ```
- Alternatively, an Android Studio emulator set to a Pixel profile at
  1080×1920 gives you exact, consistent dimensions across all 8 shots
  without any cropping step.

---

## 3) The 8-shot list

One real benefit per shot — reuses the "one image, one benefit" screenshot
format already validated in the research plan (`TARGET_USER_RESEARCH.md`).

### 1 — Focus timer start
**Navigate:** Home tab → Featured card → FOCUS segment → tap **Start Focus**
(or Home tab → `Start Focusing` hero CTA on a fresh account) → the Focus
Block screen with a duration selected (25 min reads cleanest).
**Caption:** *"Focus on your next task"*

### 2 — Screen break / reset
**Navigate:** Home tab → Featured card → BALANCE segment → **Take a Reset**
→ pick **Eye Break** from the reset sheet → capture mid-countdown (not at
0 seconds — somewhere around 10–15s looks more "alive").
**Caption:** *"Take a screen break"*

### 3 — Weekly progress
**Navigate:** Screen Balance → **View Weekly Trends** (or Home → Weekly
Wellness row). Capture the Weekly Trends screen with the 7-day chart and
daily-average line populated (needs a few days of real/simulated usage).
**Caption:** *"See your progress"*

### 4 — Eye Care
**Navigate:** Eye tab (bottom nav). Capture the "Today's Eye Care" hero +
Quick Actions row at the top — the most information-dense, confident shot
for this pillar.
**Caption:** *"Guided eye exercises, built in"*

### 5 — Sleep
**Navigate:** Sleep tab → Tonight segment (default). Capture the sleep
dial with bedtime/wake time set and the smart alarm toggle visible.
**Caption:** *"Track sleep, wake up smarter"*

### 6 — Relax / breathing
**Navigate:** Relax tab → start any breathing session (Box Breathing or
Calm Flow) → capture mid-session, while the breathing orb animation is
visible with an "Inhale"/"Exhale" cue on screen.
**Caption:** *"Guided breathing in English & Hindi/Urdu"*

### 7 — Mind games
**Navigate:** Mind tab (bottom nav, labeled "Mind"). Capture the "Today's
Mind Pick" hero + Your Games grid.
**Caption:** *"Keep your mind sharp"*

### 8 — Weekly Trends (full picture)
**Navigate:** Screen Balance → Weekly Trends screen, scrolled to show both
the 7-day chart *and* the Focus/Offline/Resets summary row together.
**Caption:** *"One simple weekly picture"*

---

## 4) Captions — baked-in text or plain screenshots?

Two valid approaches:

- **Plain screenshots** (fastest): upload exactly what you captured, no
  added text. Perfectly acceptable, and what Play Console expects by
  default.
- **Captioned screenshots** (more polish, more conversion-tested): overlay
  each caption from the list above as large text above or below the
  device frame, matching the research doc's finding that today's listing
  underconverts partly because of "chhota text aur bohat si details"
  (small text, too much detail) — a bold, short caption outside the UI
  itself reads far more clearly at thumbnail size in search results than
  relying on in-app text alone.

If you want captioned versions, any free tool works — Figma, Canva, or
even a simple HTML template rendered to PNG — device frame + screenshot +
one bold caption line, nothing more.

---

## 5) Uploading

Play Console → your app → **Grow users → Store presence → Store listing**
→ **Phone screenshots** → drag in the 8 files in the order above (order
matters — #1 is what search results show first).





npx -y rea-agents@latest setup --client claude_code