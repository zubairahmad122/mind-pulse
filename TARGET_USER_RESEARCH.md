# 🎯 Well Mode — Target User Research & Acquisition Plan

> **Date:** August 29, 2026
> **Purpose:** Identify exactly who needs Well Mode, why, and where to find them —
> distinct from [MARKETING_PLAN.md](./MARKETING_PLAN.md) (the 90-day channel/content
> calendar) and [PRODUCT_REVIEW.md](./PRODUCT_REVIEW.md) (general product audit).
> This doc exists because those were written **before** the free/pro split and
> ads landed (commit `9957c16`, Aug 28 2026) — the monetization shape changes
> who the *best-fit* user actually is.

---

## 1. What Well Mode actually is today

Three pillars, one app, bilingual (English + Hindi/Urdu voice):

| Pillar | Free tier | Pro-gated |
|---|---|---|
| 👁️ Eye | 20-20-20 reminders, Eye Reset (7-step CVS protocol), games levels 1-5 | Game levels 6+ (MathGap/TimeFlow/PatternShift/Schulte) |
| 😴 Sleep | Fixed-time alarm, 8 basic ringtones, tracking, history | Smart Stage wake-window alarm, 6 elaborate ringtones, Gemini weekly narrative report |
| 🧘 Mind | Guided breathing/relax sessions, journal, mood check-ins | (mostly free — differentiation is Eye/Sleep) |
| Everywhere | Banner/interstitial ads via AdMob (UMP consent-gated) | Ad-free |

**Implication for targeting:** free users are the volume/ad-revenue base and the
trial funnel; Pro users are people who specifically want *precision* (smart
wake alarm, deeper reports, harder game levels) — i.e., people already sold on
the habit, upgrading for depth, not people being sold the habit itself. That
means acquisition messaging should sell the **free tier's core relief**
(20-20-20 reminders, Eye Reset, basic alarm, breathing) — Pro is a retention/
monetization layer, not the hook.

---

## 2. Target user segments — ranked by fit

Ranked by **acute pain × willingness to act × reachability**, not just market size.

### Tier 1 — Primary (build acquisition around these)

| Persona | Who | Acute trigger | Why Well Mode specifically | Reachable how |
|---|---|---|---|---|
| **The Strained Knowledge Worker** | 25-40, desk job, 8+ hrs/day screens, WFH or hybrid | Eyes burn/blur by 3-4pm; searches "why do my eyes hurt after screen" at that exact moment | Only app pairing *enforced* break reminders with an actual guided protocol (Eye Reset), not just a timer | Google/App Store search intent (high), r/eyestrain, r/WFH, productivity Twitter/YouTube |
| **The Exam-Season Student** | 16-24, South Asia-heavy, cramming on phone/laptop | Screen fatigue + anxiety + broken sleep during exams, all three at once | Only app that solves eye strain **and** sleep **and** stress in one place — students won't install 3 apps | Instagram/TikTok study creators, WhatsApp study groups, campus subreddits, exam-season timing (align content calendar to exam months) |
| **Hindi/Urdu-first wellness seeker** | Any of the above, India/Pakistan, prefers native-language guidance | Existing wellness apps (Calm, Headspace) are English-only and feel foreign | **Structural moat** — 84 professionally recorded Hindi/Urdu clips is not a checkbox translation, it's a real product | Indian/Pakistani wellness YouTube, Hindi ASO keywords (near-zero competition per MARKETING_PLAN.md §ASO), WhatsApp-native sharing culture |

### Tier 2 — Secondary (opportunistic, not primary spend)

| Persona | Why they fit | Caveat |
|---|---|---|
| **Meditation-app switcher** | Wants something more "active" than passive breathing content | Smaller wedge — Calm/Headspace have brand lock-in; win on eye+sleep, not meditation quality alone |
| **New/expecting parent** | Disrupted sleep, needs *short* sessions, no time for 20-min meditations | Every session in the app is already ≤10 min — good fit, but low ad/content budget efficiency to target narrowly |
| **Diagnosed CVS (Computer Vision Syndrome) patient** | Told by an optometrist to "take breaks" with no tool to enforce it | High intent, small absolute pool — good for SEO long-tail, not paid spend |

### Explicitly not the target (don't build funnels for these)

- People wanting clinical vision therapy / eyesight correction — the app is
  explicitly comfort/habit-focused, not a medical device (see
  [EYE_HEALTH_PRODUCT_PLAN.md](./EYE_HEALTH_PRODUCT_PLAN.md)). Marketing that
  implies "fix your eyesight" invites both churn (unmet expectation) and
  regulatory risk.
- Serious insomnia/clinical sleep disorder sufferers — smart alarm ≠ treatment.
  Route this language toward "better mornings," not "cures insomnia."

---

## 3. Where to actually find them (concrete, not generic)

For each Tier 1 persona, the channel that matches **where the pain is being
expressed right now**, not just "post on social media":

**Strained Knowledge Worker**
- Search intent: ASO on "eye strain relief," "computer vision syndrome,"
  "screen break reminder" (already scoped in MARKETING_PLAN.md §ASO — low
  competition, execute it).
- Communities: r/eyestrain, r/WFH, r/digitalminimalism — answer real questions
  first, mention the app second.
- Timing hook: push content in Jan (new year desk-job resolutions) and
  Sept/Oct (back-to-office season).

**Exam-Season Student**
- Instagram/TikTok "study with me" and productivity creators (South Asia +
  global) — pitch as "the app that keeps you from wrecking your eyes/sleep
  during finals," not a generic wellness app.
- Campus-adjacent subreddits and Indian/Pakistani student WhatsApp/Telegram
  study groups — highest organic share velocity of any channel available.
- Time content drops around known exam windows, not evenly through the year.

**Hindi/Urdu-first seeker**
- Indian/Pakistani wellness & lifestyle YouTube/Instagram creators — pitch:
  "the first wellness app that actually sounds native, not translated."
- Hindi ASO keywords from MARKETING_PLAN.md (`aankhon ki exercise`, `neend ka
  tracker`, `tanao se nijaat`) — near-zero paid competition today; this is the
  cheapest CPI available to the app and should be first-dollar priority, not
  an afterthought.
- WhatsApp is the dominant sharing surface in this market — make sure the
  referral/share flow produces a WhatsApp-friendly link/preview.

---

## 4. Validate before spending budget

Cheap, fast checks to confirm which persona actually converts — do these
**before** committing the paid budget tiers in MARKETING_PLAN.md §Paid
Acquisition:

1. **Landing page A/B**: run 3 landing page variants (Knowledge Worker /
   Student / Hindi-first) with the same $50-100 of traffic each via Meta or
   Google. Compare install-intent click rate, not just traffic.
2. **ASO listing test**: submit two Play Store short descriptions (one led
   with "eye strain," one led with "sleep + eye + stress in one app") and
   compare store-listing conversion in Play Console's experiments.
3. **Reddit/community response**: post genuinely helpful (non-promotional)
   content in r/eyestrain and a Hindi-language wellness space; compare
   engagement and DM-driven installs.
4. **Free-tier funnel check**: since Pro is a depth upgrade not the initial
   hook, confirm which free feature (Eye Reset vs. basic alarm vs. breathing)
   drives the most Day-1 return — that's the feature to lead with in all
   creative, regardless of which persona it's aimed at.

Only after these 4 signals come back should paid budget scale past the
"Minimal Viable Budget" tier in MARKETING_PLAN.md.

---

## 5. 30-day action plan

| Week | Action | Owner | Output |
|---|---|---|---|
| 1 | Ship the 3 landing page variants + Hindi ASO keyword set live | Marketing/Dev | Live pages + updated Play listing |
| 1 | Identify and join 5 target communities (r/eyestrain, r/WFH, 2 Hindi wellness spaces, 1 student-focused) — observe, don't post yet | Marketing | Community shortlist with posting norms noted |
| 2 | Run the $50-100/variant landing page test | Marketing | Click-through data per persona |
| 2 | Publish first genuinely useful post in 2 communities (no pitch, just help) | Marketing | Baseline engagement data |
| 3 | Compare Week 2 data → pick the **one** primary persona to lead all creative with for the next 60 days | Founder | Decision + updated messaging brief |
| 3 | Reach out to 5 micro-influencers matching the winning persona (reuse template in MARKETING_PLAN.md §Influencer) | Marketing | 5 outreach emails sent |
| 4 | Turn winning landing page + ASO copy into the permanent App Store / Play Store listing | Marketing | Updated live listing |
| 4 | Retro: which channel produced the cheapest real install, not just cheapest click | Founder | Documented CAC-by-channel, feeds MARKETING_PLAN.md budget decisions |

---

## Bottom line

Don't spread spend across all three Tier 1 personas evenly. The Hindi/Urdu
angle is the only one with near-zero paid competition today (per existing ASO
research) — it should get first-dollar priority even though the Knowledge
Worker persona is the largest pool. Use the 30-day plan above to confirm that
with real data before locking in the 90-day budget in MARKETING_PLAN.md.
