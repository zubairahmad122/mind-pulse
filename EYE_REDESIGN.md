# Eye Reset — Premium Experience Redesign Plan

Goal: Calm / Headspace / Apple Fitness+ level ki immersive wellness experience —
**exercise logic, durations, paths, sequence bilkul unchanged.** Sirf presentation.

Status legend: ✅ shipped · 🔨 to build · 💤 later (assets/scope)

---

## 1) UX Redesign Plan — phases

| Phase | Kya | Items |
|---|---|---|
| ✅ Done | Foundation | Eyes-pillar theme, glass surfaces, lucide icons, animated hero, benefits, rich exercise list, sticky CTA, calibration beat, voice guidance (9 clips × 2 lang), Exercise X of 7 + progress bar, rotating coach tips, animated countdown, interstitial transitions, pause menu, completion screen, haptics |
| 🔨 **Phase 1 — Flow completion** | Missing flow pieces | 3-2-1 countdown after calibration · Next-exercise preview in player bottom · 20-20-20 Recovery screen after last exercise · Completion stats (streak, weekly, total minutes) |
| 🔨 **Phase 2 — Alive backgrounds** | Immersion | Player mein ParticleField (Relax se reuse) · breathing ambient glow · landing timeline connector animation |
| 🔨 **Phase 3 — Target life** | Motion | Breathing halo on FocusDot · particle trail (2-3 fading dots, CometTrace TailDot pattern reuse) · eased start/stop |
| 💤 Phase 4 | Assets | Transition chime + completion bell · optional ambient sounds (Relax ke ocean/rain/forest tracks reuse) |
| 💤 Phase 5 | System | Reduce Motion support · speed setting (Easy/Normal/Fast) |

---

## 2) Information Architecture

```
Eye Tab (EyeRelaxScreen)
└── Eye Reset (/cvs-protocol)
    ├── Landing        — hero + info + timeline + benefits + CTA   ✅ (timeline 🔨)
    ├── Preparation    — voice intro + 4 lines + 3-2-1             ✅ (3-2-1 🔨)
    ├── Player ×7      — header progress / target / coach / controls ✅ (preview 🔨)
    │   └── Interstitial — ✓ Great → Next                          ✅
    ├── Recovery       — 20-20-20 look-away                        🔨
    └── Completion     — celebration + stats + Continue            ✅ (stats 🔨)
```

## 3) Component Hierarchy

```
CVSProtocolScreen
├── PillarProvider(eyes) > AmbientBackground          ✅
├── Header: back · "Exercise N of 7" · dots · bar     ✅
├── <AnimatedEyeHero/>                                 ✅
├── <ExerciseTimeline/>       — landing, animated      🔨 new
├── <PrepCountdown/>          — 3·2·1 overlay          🔨 new
├── <StepCountdownRing> + <LottieGuide/StepGuide>      ✅ (halo/trail 🔨 inside guides)
├── <CoachTip/> rotating                               ✅
├── <NextUpChip/>             — bottom preview         🔨 new
├── <Interstitial/>                                    ✅
├── <RecoveryScreen/>         — 20-20-20               🔨 new
└── <CompletionStats/>                                 🔨 extend
```

## 4) Landing Screen ✅ + 🔨

Shipped: animated breathing eye (3s glow-pulse + float), title/subtitle,
"3 min 30 sec · 7 exercises · No equipment", glass exercise list (icon +
name + one-liner + duration), benefits checks, pinned START SESSION.

🔨 Remaining:
- **Animated timeline**: list rows ke beech vertical connector line jo
  screen-entry par upar se neeche draw ho (600ms, staggered row fade 60ms/row)
- "Visual Guidance" chip meta row mein add

## 5) Preparation ✅ + 🔨

Shipped: calibration beat (voice intro ~20s ke saath, 3 coaching lines).

🔨 Remaining — **3-2-1 countdown**: intro `onDone` ke baad seedha exercise ki
jagah 3 → 2 → 1 → Begin (har digit 700ms, scale 1.2→1 + fade, light haptic per
digit). Total +2.8s. Phir `startActive()`.

## 6) Player ✅ + 🔨

Shipped: title + coach line (3s fade), ring + guide center, animated
countdown + "sec remaining", rotating tips, labeled Pause/Skip, pause menu.

🔨 Remaining:
- **NextUpChip** (bottom-right, controls ke oopar): `Next: Square Tracking`
  — chhota glass pill, exercise ke aakhri 10s mein fade-in
- Background: `<ParticleField/>` (Relax component reuse, musicId='forest'
  jaisa subtle set) + ambient glow breathing (15s cycle, scale 1.0→1.02)

## 7) Transition Flow ✅

Fade-out 400ms → interstitial (✓ Great/encouragement · X complete · Next: Y)
~1.2s → fade-in 450ms. Voice next-clip 1.1s delay par land hoti hai. Total
~2.0s — brief ke 700–1000ms se lamba is liye ke voice bridge karti hai; theek hai.

## 8-9) Animation Specs & Motion Timing

| Element | Spec |
|---|---|
| Hero pulse | 3000ms/direction, inOut(sin), glow 0.22→0.5, float −5px ✅ |
| Countdown digit | key-remount FadeIn 240ms ✅ |
| Coach line | in 400ms, hold 3200ms, out 600ms ✅ |
| Interstitial | FadeIn 350 / FadeOut 300 ✅ |
| 3-2-1 digits | 700ms each: scale 1.2→1 spring d=14, opacity 0→1→0 🔨 |
| Timeline draw | 600ms height-grow, rows stagger 60ms 🔨 |
| Target halo | 2400ms breathing, scale 1→1.15, opacity 0.35→0.6 🔨 |
| Trail dots | 3 dots, alpha 0.45/0.28/0.14, follow at 60/120/180ms lag 🔨 |
| Recovery countdown | 20→0, digit crossfade 300ms, ring sweep linear 🔨 |
| Ambient glow breathe | 15s cycle, scale ±2%, opacity ±0.05 🔨 |

Rule: kuch bhi instant appear nahi hota — minimum 200ms fade.

## 10) Typography (existing tokens, applied)

| Role | Spec |
|---|---|
| Hero title | 27/900, ls 0.3 |
| Screen title | 21/800 |
| Body/subtitle | 14.5/400 secondary |
| Meta/chips | 12.5/600 tertiary, ls 0.3 |
| Countdown number | 24/800 accent |
| Micro-tips | 12/500 white-42% |
| Buttons | 14/800 uppercase ls 1.5 (GradientCTA) |

## 11) Color Palette ✅

- Pillar: accent `#22d3ee`, CTA gradient `#5eead4→#06b6d4`, text-on-CTA `#03212c`
- Per-exercise soft accents: `#7dd3fc` `#a5b4fc` `#6ee7b7` `#fcd34d` `#fde68a` `#fda4af` `#5eead4`
- Surfaces: glass `rgba(255,255,255,0.045)`, borders `0.08–0.14`
- Success `#6ee7b7`, danger `#e24b4a` — semantic only

## 12) Spacing

4-pt grid. Screen padding 16, card padding 14–16, section gap 14–16,
control gap 40, hero → info 4–6, list row 10 vertical. Touch targets ≥44px ✅.

## 13) RN Implementation Notes

- Reanimated only (already); repeating loops `withRepeat(withSequence(...))`
- Particle/trail: reuse `ParticleField` + CometTrace `TailDot` (shared values,
  no setState per frame)
- 3-2-1 + Recovery: new phases in existing `Phase` union — timers via
  `interstitialTimersRef` (already cleaned on unmount)
- Stats: `useEyeProgress` already exposes streak; weekly/total minutes needs
  small extension of eyeProgressPersistence

## 14) Accessibility 💤→🔨

- `useReducedMotion()` (reanimated) → hero/particles/halo static, fades only
- `allowFontScaling` default rehne do; test at 1.3×
- `accessibilityLabel` on Pause/Skip/Start; announce exercise change via
  `AccessibilityInfo.announceForAccessibility(step.title)`
- Contrast: tips white-42% → high-contrast mode mein 70%

## 15) Micro-interactions

✅ CTA press-scale (GradientCTA spring), countdown fade, tip rotation,
haptic per phase. 🔨 Buttons: pause/skip press-scale 0.94 spring; NextUpChip
slide-up entry; benefit checks staggered FadeIn on landing.

## 16) Haptics ✅

Start = selection · exercise complete = Light impact · speed-ups = Light/Medium ·
session complete = Success notification. Rule: per event ek hi haptic.

## 17) Sounds 💤 (assets chahiye)

3 files: `transition-chime.mp3` (~1s, -18LUFS), `complete-bell.mp3` (~2s),
optional `recovery-waves.mp3`. Wiring: `useAudioGuide` bypass — simple
`expo-audio` one-shots, voice ko duck na karein. Ambient: Relax ke
BREATHING_MUSIC tracks reuse + mute toggle player header mein.

## 18) Extra Premium Ideas

1. **Session ring on Eye tab** — aaj ka eye-care progress (Apple ring style)
2. **Streak flame micro-animation** completion par (already tracked)
3. **Time-aware greeting** — subah "Start your eyes fresh", raat "Unwind your eyes"
4. **Post-session mood tap** — "How do your eyes feel?" (Relax completion pattern reuse)
5. **Weekly eye report card** — Report tab integration
6. **Dynamic island-style mini timer** agar user beech mein app switch kare (future)

---

## Recommended build order

1. **Phase 1** (flow: 3-2-1, NextUp chip, 20-20-20 Recovery, completion stats) — sabse zyada felt value
2. **Phase 2** (backgrounds alive)
3. **Phase 3** (target halo + trail)
4. Phase 4-5 assets/system ke saath
