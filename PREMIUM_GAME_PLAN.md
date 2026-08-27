# 🎮 MindPulse — Premium Eye Game Plan

> **Date:** August 5, 2026 (v2 — gameplay depth pass: missions, events, finales, progression, story)
> **Status:** Research + design complete. Ready for approval, then implementation.
> **Companion docs:** `EYE_HEALTH_PRODUCT_PLAN.md` (safety/positioning) · `ENGAGEMENT_PLAN.md` (retention) · `CHALLENGES_PLAN.md` (streaks/XP)
> **Rule this plan follows:** the premium game is marketed as *visual attention & coordination*, never as eye-health improvement, eyesight training, or therapy (per EYE_HEALTH_PRODUCT_PLAN — dichoptic/"vision therapy" mechanics need clinician review and are out of scope here).

---

## Table of Contents

1. [Research — What Makes a Creative Vision Game](#1-research--what-makes-a-creative-vision-game)
2. [Design Constraints](#2-design-constraints)
3. [Three Creative Game Concepts](#3-three-creative-game-concepts)
4. [Recommendation & Rationale](#4-recommendation--rationale)
5. [Game Design Spec — Photon Chase](#5-game-design-spec--photon-chase)
6. [Making It a Pro Game (Premium Integration)](#6-making-it-a-pro-game-premium-integration)
7. [File-by-File Change List](#7-file-by-file-change-list)
8. [Build Phases & Effort](#8-build-phases--effort)
9. [Testing Plan](#9-testing-plan)

---

## 1. Research — What Makes a Creative Vision Game

### 1.1 What the market actually ships

| App | Example mechanics | Notes |
|---|---|---|
| **Eye Care Plus** (2M+ downloads, 4.6★) | 50+ structured eye workouts, saccade (gaze-snap) drills, smooth-pursuit tracking drills, accommodation (near/far) drills | Proven the category converts — but everything is workout-style, not game-style |
| **VisionUp** | Dynamic focus drills (objects zoom in/out), tracking drills | AI-guided workouts, utilitarian UI |
| **Blink Land** (AOA's app) | "Moistur-Eyes" (catch falling drops), "Ready Set Blink", "Screen Dodger" (endless runner), "Space It Out" (distance guessing), "Focus On Me" (blur → sharpen slider) | **Best reference: real mini-games, not workouts** — playful, short, habit-themed |
| **Lazy Eye Games / dichoptic apps** | Red-cyan anaglyph block games (each eye sees a different layer) | ⚠️ Requires glasses + clinician review — out of scope per product plan |

**Gap in the market:** almost every eye app uses *tap-the-target / matching* mechanics (which MindPulse already covers with Neon Cipher, Signal Ops, etc.). **Almost nobody builds a great smooth-pursuit tracking game** — continuously following a moving object — even though "track a moving dot" is the single most recognized eye-habit exercise. That's the creative white space.

### 1.2 What keeps people playing 1–3 minute daily sessions (retention research)

| Mechanic | Why it works | Rank |
|---|---|---|
| **Adaptive progressive difficulty** | Keeps the player in flow — too hard or too easy = instant churn | #1 (retention foundation) |
| **Streaks / habit triggers** | Loss aversion brings users back tomorrow | #2 (already have this — Challenges tab) |
| **Combo systems + time pressure** | Micro-bursts of dopamine make 60s feel action-packed | #3 |
| **Near-miss moments** | "I almost had it" drives instant replay | #4 |
| **Variable rewards** | Unpredictable bonuses = compulsive loops | #5 |
| **Meta-progression** | Performance rolls into a larger "journey" (Lumosity LPI-style) | #6 — MindPulse already has this (XP/levels) |
| **Mission structure** | Every run has a goal, an arc, and a payoff — "why am I playing?" | #7 — the depth layer this plan adds |

---

## 2. Design Constraints

1. **No overlap with existing games.** Already built: visual search + memory (Neon Cipher), near/far switching (Focus Sprint), multi-stage attention (Signal Ops), plus Pulse Switch, Path Lock, Peripheral Alert. The premium game must offer a **mechanic none of them have**.
2. **1–3 minute sessions**, one-thumb playable, portrait.
3. **Safety-first framing**: stop conditions (pain/blur/double vision → stop), never "train your eyesight", scores = game performance, not eye health.
4. **Accessibility is never gated**: reuse `useEyeGameAccessibility` (large targets, high contrast, reduced motion) + `useGameFeedbackPrefs` (sound/haptics) + shared `PauseOverlay`.
5. **Reuse the proven architecture**: pure engine in `src/utils` + jest tests, component in `src/components/eye/games/`, XP/levels via `useEyeGameProgress`, PB via `useGameRecord`.
6. **Must feel premium** — it's the flagship Pro selling point: neon visuals, smooth Reanimated motion, satisfying feedback, cosmetic rewards.

---

## 3. Three Creative Game Concepts

### Concept A — 🛰️ **Photon Chase** *(recommended)*
**The pitch:** a glowing energy core drifts through a shifting neon nebula along smooth, hypnotic curves. Hold your thumb anywhere — a **seeker drone** leads your finger (offset upward so it never hides the target) and must stay on the core. Stay locked → the core "charges"; drift off → charge drains. Each run is a mission: escort the core through hazards, collect energy rings, and escape through the portal before a randomized finale hits.

- **Mechanic:** smooth-pursuit tracking (continuous, not taps) — completely new to MindPulse, and the most iconic eye-habit exercise made fun
- **Novelty:** no competitor does this well; trails + glow via Reanimated/Skia look stunning
- **Skill ramp:** photon speed × path complexity (wide circles → tight figure-eights) × target size
- **Retention hooks built in:** lock-streak combos, randomized finales, missions, galaxy progression, cosmetic unlocks

### Concept B — 🧬 **Echo Trace**
**The pitch:** a sequence of nodes ignites across the screen, tracing a path through a constellation. The path fades — now **replay it from memory** before distractor nodes fade in and try to confuse you. Sequences grow each round.

- **Mechanic:** spatial sequence memory (Simon-style, but spatial/path-based)
- **Pros:** simple to build, proven retention
- **Cons:** overlaps conceptually with Neon Cipher's memory element; less visually "premium"

### Concept C — ⚡ **Twin Lanes**
**The pitch:** two independent neon tracks — left and right. Signals appear on either side; you must react to the **correct lane's** signal while ignoring decoys in the other. Divided attention under pressure.

- **Mechanic:** dual-task / divided attention + peripheral awareness
- **Pros:** genuinely different, trains divided attention
- **Cons:** most chaotic and hardest to make feel calm (conflicts with the app's anti-stress brand); risk of frustration

---

## 4. Recommendation & Rationale

**Build Concept A — Photon Chase.**

| Criterion | Photon Chase | Echo Trace | Twin Lanes |
|---|---|---|---|
| Distinct mechanic (no overlap) | ✅ Tracking — nothing like it exists | 🟡 overlaps Neon Cipher memory | ✅ |
| Feels premium / showcase-worthy | ✅✅ trails + glow | 🟡 | 🟡 |
| Fits calm brand | ✅ meditative + exciting | ✅ | ❌ frantic |
| One-thumb, low-frustration | ✅ proximity-based, forgiving | ✅ | 🟡 |
| Difficulty ramp clarity | ✅ speed/complexity/size | ✅ | 🟡 |
| Effort vs. payoff | ✅ worth it | 🟢 cheapest | 🟡 |

**Why "make it Pro" works here:** the free games are all *tap/match* games. Photon Chase's tracking mechanic is visibly, instantly different — a free user sees a locked card with a beautiful preview and understands exactly what they're missing. That's the ideal Pro hook.

---

## 5. Game Design Spec — Photon Chase

### 5.1 Core philosophy

> Photon Chase is **not** about chasing a moving dot.
>
> The player is **escorting a living energy core through dangerous space**.
>
> Tracking the photon remains the core mechanic, but every session gives the player a **mission, objectives, and meaningful decisions**.
>
> The game should feel like a **premium arcade experience built around smooth pursuit** — not an eye exercise.

### 5.2 Player fantasy (the emotional goal)

> The player should never think *"I'm following a dot."*
> They should think *"I'm protecting something valuable."*
>
> Every mechanic, animation, sound, mission, reward, and visual should reinforce that emotional goal.
>
> **Tracking is the mechanic. Protection is the fantasy. Progression is the reason to return tomorrow.**

### 5.3 Core gameplay loop

```
Mission Starts
      ↓
Escort Energy Core
      ↓
Avoid Hazards
      ↓
Collect Energy Rings
      ↓
Maintain Lock
      ↓
Complete Objectives
      ↓
Escape Through Portal
      ↓
Earn Rewards
      ↓
Unlock Next Sector
```

Every run now has a **beginning, middle, and end** — not an endless 60-second chase.

**Mechanics layer (unchanged from v1):**
1. Photon spawns on a smooth path (Lissajous/bezier loop seeded by `createSeededRandom`).
2. Player holds thumb; **seeker drone** floats ~90dp above the touch point (never under the finger).
3. On-target (within radius) → **lock meter** fills, score accumulates × combo multiplier.
4. Off-target → combo breaks, energy drains (soft signal, never hard-fail — matches Signal Ops' energy philosophy).
5. Path **evolves per round**: speed, path frequency, amplitude, target size — adaptive to last round's time-on-target.

### 5.4 Mission system

Every run begins with a **randomly selected mission** — the player always knows *why* they're playing:

- **Deliver the Energy Core to the Portal** — the classic escort
- **Stabilize the Nebula** — hold lock near volatile storm pockets
- **Repair Three Satellites** — reach and orbit each damaged satellite
- **Survive Solar Storm** — pure endurance under constant hazard pressure
- **Collect Five Energy Crystals** — route through off-path pickups
- **Escort Research Drone** — a slower secondary target to babysit

Mission completion awards **bonus XP and cosmetics**.

### 5.5 Gameplay events

One random event appears **every 15–20 seconds** (never overlapping). Events create variety **without changing the core mechanic**:

| Event | Effect |
|---|---|
| **Gravity Field** | Curves suddenly bend |
| **Asteroid Shower** | Temporary moving obstacles |
| **Warp Gate** | Shortcut worth bonus score |
| **Solar Wind** | Pushes the photon sideways |
| **EMP Zone** | Briefly reduces seeker sensitivity |
| **Energy Boost** | Temporary score multiplier |

### 5.6 Finale (replaces "Overdrive")

No more scripted "last 10 seconds, photon speeds up." Every run ends with a **random finale** — players never know which ending they'll get:

- **Black Hole Escape** — the core gets pulled in; you must break its gravity well
- **Meteor Storm** — dodge a closing wall of obstacles
- **Portal Collapse** — race a destabilizing portal to the exit
- **Solar Explosion** — a shockwave expands; stay ahead of it
- **Quantum Rift** — the path splits and recombines unpredictably

Each finale changes **visuals and gameplay** — and is the near-miss moment that begs for one more run.

### 5.7 Session modes & presets

| Mode | Duration | Pitch |
|---|---|---|
| **Drift** | 90s | Calm tracking, gentle paths |
| **Chase** | 60s | Faster paths, tighter targets *(score = PB)* |
| **Zen** | 120s | Slowest, largest targets, pure unwind |

Difficulty presets: `gentle → casual → sharp → elite` (same ladder language as Neon Cipher). Missions, events, and finales run in **all three modes** — Zen gets gentler variants.

### 5.8 Scoring & metrics

- **Score** = on-target time × combo multiplier (combo +1 every 1s locked, resets on miss) + event/mission bonuses
- **Energy**: 100 start, -18/miss, +4/s on-target (soft, floors at 0)
- **Rating 1–3★**: time-on-target ≥85% + energy ≥50 → 3★ (mirrors `computeMissionRating`)
- **Reported metrics**: score (Chase only), time-on-target %, best lock streak, max combo, path level reached, mission completed
- **PB**: `useGameRecord(user.uid, 'photon-chase')` — Chase mode only, like Neon Cipher's Time Attack

### 5.9 Galaxy progression (worlds)

One galaxy, six sectors — progression is about **new content, not just speed**:

```
Galaxy One
Training Sector
      ↓
Nebula Zone
      ↓
Crystal Asteroids
      ↓
Gravity Rift
      ↓
Dark Matter Core
      ↓
Quantum Space
```

Each world introduces:
- new **visuals** · new **soundtrack** · new **hazards** · new **particle effects**

Unlocking a new sector is the mid-run reward that makes each session feel like progress.

### 5.10 Risk vs reward — optional objectives

The player **chooses** whether to play it safe or take the risky path. Optional objectives are never required to complete the mission:

- **Collect a Rare Crystal** — sits off the safe route
- **Fly through a Warp Ring** — high score, easy to miss
- **Pass Near a Black Hole** — extreme gravity, extreme points
- **Escort a Damaged Drone** — slow, vulnerable, worth a lot

High risk pays out **XP, score, and cosmetics**. Missing them **never fails the mission** — the risk is always the player's call.

### 5.11 Permanent progression

Every level unlocks something. **Nothing affects gameplay; everything builds player identity:**

- Photon **colors**
- Nebula **themes**
- **Trails**
- **Energy bursts**
- **HUD skins**
- **Portal effects**
- **Titles**

This is the meta-progression that makes the *next* run feel worth it — layered on top of the existing XP/level system (`useEyeGameProgress`).

### 5.12 Daily missions

Daily objectives give a concrete reason to open the app tomorrow:

```
Daily Missions (rotating)
• Complete one Drift Mission
• Reach Combo x20
• Collect 10 Crystals
• Finish with 80 Energy
• Complete a run without losing lock

Rewards: XP · Coins · Cosmetics
Weekly missions unlock exclusive trails.
```

Wires directly into the existing Challenges/streak systems.

### 5.13 Story (lightweight)

Humanity runs on **living energy particles**. Space anomalies are destroying them. The player joins **Photon Command**, and every mission rescues another energy core.

Story is minimal, never interrupts gameplay, and gives the protection fantasy emotional stakes.

### 5.14 Visual identity & polish (premium bar)

| Element | Direction |
|---|---|
| **Photon** | Animated breathing light · energy wings · dynamic glow · core pulse |
| **Seeker** | Small premium drone · energy shield · magnetic trail |
| **Background** | Animated nebula · stars · dust · parallax · space storms |

- Neon trail with fade (Reanimated `withTiming`/`withSpring`, `interpolate` — matches Neon Cipher's glow language)
- Lock feedback: seeker-orbit ring contracts → "LOCKED" flash + haptic tick
- Cosmetic unlocks at XP milestones (existing `useEyeGameProgress` cosmetic system): trail colors/glow styles
- One-time tutorial overlay (persisted via AsyncStorage, `TUTORIAL_SEEN_KEY` pattern)
- **Everything should immediately look like MindPulse.**

### 5.15 Audio

- Calm ambient synth bed
- Soft **lock confirmation** tick
- **Combo evolution** sounds (pitch rises with the chain)
- **Portal activation** swell
- **Meteor warning** sting
- **Gravity hum** when near a field
- **Mission complete** fanfare

Every interaction produces satisfying feedback — sound/haptics gated by `useGameFeedbackPrefs`.

### 5.16 Safety & accessibility

- Setup + pause copy: "Stop if you notice pain, blur, or double vision." (matches Focus Switch)
- Never claims eyesight/vision-training benefits — copy frames it as *attention & coordination*
- `useEyeGameAccessibility`: large target, high contrast, reduced motion (slows photon, softens trails)
- `useGameFeedbackPrefs` + shared `PauseOverlay` (sound/haptics/a11y toggles)
- One-thumb proximity play = accessible by design; `useSessionLifecycle` auto-pauses on background
- Reduced-motion also **dampens events/finales** (no flashing shockwaves, gentler gravity bends)

---

## 6. Making It a Pro Game (Premium Integration)

The app already has **all** the premium plumbing — the `EyeActivity` type even has `isPremium` + `featureId` fields that no game uses yet. This is wiring, not invention.

### 6.1 Entitlement (`src/constants/entitlements.ts`)
```ts
// Add to FeatureId union:
| 'game_photon_chase'

// Add to ENTITLEMENTS:
game_photon_chase: 'pro',

// Add to FEATURE_NAMES / FEATURE_DESCRIPTIONS:
'Photon Chase' / 'A smooth-pursuit escort game. Guide the energy core through the nebula and complete your mission. Available with MindPulse Pro.'
```

### 6.2 Game registry (`src/constants/eyeRelax.ts`)
Add to `EYE_GAMES` (keep free games untouched):
```ts
{
  id: 'photon-chase',
  title: 'Photon Chase',
  subtitle: 'Escort the energy core through the nebula',
  durationSeconds: 90,
  description: 'A smooth-pursuit escort game — hold and follow the drifting energy core to keep your lock, complete your mission, and escape through the portal. Stop if you notice pain, blur, or double vision.',
  kind: 'game',
  emoji: '🛰️',
  isPremium: true,
  featureId: 'game_photon_chase',
  accent: PILLAR_COLORS.eye,
  route: ROUTES.appEyeGame('photon-chase'),
}
```

### 6.3 Locked card in the games list (`src/screens/app/EyeGamesScreen.tsx`)
Wrap each `GameCard` in the existing `PaywallGate` (same pattern as RelaxLibrary):
```tsx
{item.featureId ? (
  <PaywallGate key={item.id} featureId={item.featureId}>
    <GameCard … />
  </PaywallGate>
) : (
  <GameCard key={item.id} … />
)}
```
→ Free users see the card with a gold **PRO** badge; tapping opens the global `PaywallModal` with the Photon Chase pitch.

### 6.4 Route protection (`src/screens/app/eye-game/[id].tsx`) — **important**
UI gating alone is bypassable via deep links. In `EyeGameScreen`:
- Read `const { isPremium } = useSubscription()`.
- If `activity.isPremium && !isPremium` → render the locked card (reuse `PaywallGate`'s locked-card style) instead of `GameView`.
- Also add `case 'photon-chase'` to `GameView`'s switch → `<PhotonChase … />` with the same props contract (`running`, `onGameEnd`, `onSession`, `pauseRequest`, `onRoundActiveChange`, `onSetupActionChange`).

### 6.5 Records & XP
- `src/services/gameRecords.ts`: extend `GameId` → `'focus-sprint' | 'neon-cipher' | 'signal-ops' | 'photon-chase'`
- `EyeGamesScreen`: add `const photonChase = useGameRecord(user?.uid, 'photon-chase')` + `recordsByGameId` + `anyRecordExists` (per the existing "no hooks in a loop" pattern)
- XP/levels: log completed rounds through the same path the other games use (`useEyeGameProgress` / `eyeGameProgress` service) — premium game feeds the shared Level/XP hero for free.

### 6.6 Paywall feature list
- `PaywallModal` shows the game's `FEATURE_DESCRIPTIONS` line automatically when opened with `featureId='game_photon_chase'`.
- Analytics event: `premium_game_card_viewed` / `premium_game_started` via the existing `analytics.ts` helper.

### 6.7 (Future, not v1) Gating experiment
If conversion data later supports it, add a "1 free round / day" tease (free users play one Drift mission daily, then locked) — keep for a post-launch A/B; v1 ships the consistent locked-card pattern.

---

## 7. File-by-File Change List

| # | File | Change |
|---|---|---|
| 1 | `src/utils/photonChaseEngine.ts` | **New** — pure engine: seeded path generation, on-target math, combo/energy/score reducers, difficulty presets, round config, mission/event/finale state machines |
| 2 | `src/utils/photonChaseContent.ts` | **New** — content config: missions, events, finales, galaxy sectors, permanent unlocks, daily missions (data-driven, seeded pickers) |
| 3 | `src/utils/__tests__/photonChaseEngine.test.ts` | **New** — jest suite (see §9) |
| 4 | `src/components/eye/games/PhotonChase.tsx` | **New** — component: setup / tutorial / countdown / active, mission HUD + objectives, event overlays, finale sequence, shared hooks, `PauseOverlay`, `onSetupActionChange` sticky CTA |
| 5 | `src/components/eye/games/PhotonChaseTrail.tsx` | **New** — animated trail + photon (breathing light/energy wings) + seeker drone (Reanimated; Skia optional for glow) |
| 6 | `src/components/eye/games/PhotonChaseTutorial.tsx` | **New** — one-time tutorial overlay (mission + lock + seeker explainer) |
| 7 | `src/constants/entitlements.ts` | Add `game_photon_chase` to FeatureId / ENTITLEMENTS / FEATURE_NAMES / FEATURE_DESCRIPTIONS |
| 8 | `src/constants/eyeRelax.ts` | Add Photon Chase entry to `EYE_GAMES` |
| 9 | `src/services/gameRecords.ts` | Extend `GameId` union |
| 10 | `src/screens/app/EyeGamesScreen.tsx` | Wrap cards in `PaywallGate`; add `useGameRecord` + lookup |
| 11 | `src/screens/app/eye-game/[id].tsx` | `case 'photon-chase'` in `GameView` + premium route guard |
| 12 | `src/services/analytics.ts` | Add `premium_game_*` events (optional but recommended) |

> No changes needed to `PaywallGate`, `PaywallModal`, `useEyeGameProgress`, `PauseOverlay`, or the a11y hooks — they're all reused as-is.
>
> **Scope note:** the mission/event/finale/content systems live in two pure files (engine + content config) so they stay fully jest-testable and content can be tuned/expanded without touching gameplay code.

---

## 8. Build Phases & Effort

The build order is now **fun-first**: the game has to feel good before any progression or monetization is added.

| Phase | Work | Effort |
|---|---|---|
| **1. Prototype** | Engine core (path gen, on-target, combo/energy/score) + minimal playable loop + jest tests | ~half day |
| **2. Fun testing** | Internal playtest gate — tune speed, forgiveness, lock radius. **Nothing ships further until this feels fun.** | ~half day |
| **3. Gameplay events** | Event system (gravity, asteroids, warp, solar wind, EMP, boost) | ~half day |
| **4. Mission system** | Mission templates + finale selection + HUD objective tracking | ~half day |
| **5. Progression** | Galaxy sectors, permanent unlocks, daily missions hooks, story framing | ~half day |
| **6. Rewards** | XP/coins/cosmetics wiring, mission reward payouts | ~half day |
| **7. Premium integration** | entitlements, EYE_GAMES entry, `PaywallGate` wrap, route guard, GameId, records/XP hookup | ~half day |
| **8. Visual polish** | Nebula/parallax, photon/seeker identity, audio pass, reduced-motion damping | ~half day |
| **9. Launch QA** | Full test suite, code review, locked → paywall → subscribe → play walkthrough, accessibility pass | ~half day |
| **Total** | | **~4–4.5 days** |

> **Trim path (if schedule demands):** the core loop + premium wiring ships first (Phases 1–2 + 7 ≈ 1.5 days). Events, missions, finales, and worlds can land in a fast-follow content update via `photonChaseContent.ts` without touching gameplay or premium code.

---

## 9. Testing Plan

**Unit (jest, pure engine):**
- Path generation: seeded → deterministic given same seed; path stays within arena bounds
- On-target math: distance threshold at boundaries (just-inside = locked, just-outside = miss)
- Combo: increments per second locked, resets on miss; bestCombo tracked
- Energy: drain on miss, regen on-target, floors at 0, never hard-fails
- Rating: ≥85% on-target + ≥50 energy → 3★; boundary cases
- Difficulty ramp: speed/complexity/size escalate per round; reduced-motion preset slows paths
- Mission/event/finale selection: seeded → deterministic; exactly one event per window; finale varies across runs; event/finale *never* fires during the opening countdown
- World progression: sector unlock gating is correct and monotonic
- Optional objectives: reward payouts correct; missing an optional objective never fails the mission
- Daily missions: rotation list is complete; completion detection (combo x20, 10 crystals, 80 energy, no-lock-loss) works
- PB comparison: `isNewBest` logic (reuse pattern from other engines)

**Integration / manual:**
- Free user: locked PRO card in list → tap → paywall → back; deep-link to `/eye-game/photon-chase` → still locked (route guard)
- Pro user: full session in all 3 modes across several missions/finales, pause/resume, exit-confirm, XP + PB recorded
- Event/finale visual stress: no overlapping events, no event during countdown, reduced-motion dampens finale flashes
- Accessibility: large target, high contrast, reduced motion, sound/haptics off
- Run `npm test` + `npm run lint` before merge

---

## Summary

**Build Photon Chase** — a smooth-pursuit escort game (a mechanic no existing MindPulse game and almost no competitor has), wrapped in a premium arcade experience: every run is a mission with objectives, random events, a randomized finale, and a sector to unlock. Research-backed retention mechanics (adaptive difficulty, combos, near-miss finales, missions, daily objectives, galaxy + cosmetic progression) keep players returning, while the protection fantasy gives the game emotional stakes. Wired into the existing Pro infrastructure with ~4–4.5 days of work, it's the strongest possible flagship for the Pro subscription: visually distinct, calm-but-exciting, and impossible to confuse with the free tap/match games.

---

*Created by Buffy (Codebuff AI) on August 5, 2026. v2 incorporates a gameplay-depth review pass: mission system, gameplay events, randomized finales, galaxy progression, risk-vs-reward, permanent progression, daily missions, story, and expanded visual/audio direction. Research sources: App Store listings & reviews for Eye Care Plus / VisionUp / Blink Land; retention-mechanics literature on micro-session casual games & brain-training apps (Lumosity, Elevate, Peak); AOA digital-eye-strain guidance.*
