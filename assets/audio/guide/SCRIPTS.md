# MindPulse — Voice Guide Scripts v2 (ElevenLabs, Premium)

Therapy-grade voice guide for the **Relax tab**. Two languages: **English + Hindi**.

> ✅ **STATUS: All Relax-tab clips are RECORDED and imported.** To re-record a clip,
> generate it in ElevenLabs and overwrite the file at the exact path — zero code changes.

- English → `assets/audio/guide/en/<clip>.mp3`
- Hindi → `assets/audio/guide/hi/<clip>.mp3`

Recorded structure (33 clips × 2 languages = 66 files):

```
breathing/   settle-in, breathe-in, hold, breathe-out, hold-empty, complete
calm-flow/   intro, complete          (long guided intro ~2.5 min; breathing/ cues start after it ends)
bedtime/     intro, complete          (+ breathing/ phase cues during the session)
bodyscan/    intro, head, neck, chest, arms, stomach, legs, complete
tension/     fists, shoulders, jaw, stomach, legs, toes, release, complete
grounding/   intro, see, touch, hear, smell, taste, complete
```

Playback rules implemented in the app: voice has priority (music ducks to ~30%
with a smooth fade while the voice speaks), phase cues never interrupt longer
guidance, and the app controls all timing — clips stay clean, no baked-in silence.

---

## Session personalities (read before recording each section)

| Session | Clips | Personality — how the voice should feel |
|---|---|---|
| Calm Flow | intro, then `breathing/` cues (5-5 rhythm) | Gentle companion — sitting beside you, no agenda |
| Box Breathing | `breathing/` cues | Calm coach — steady, quietly confident |
| Reset Wave | `breathing/` cues | Supportive therapist — warm, understanding |
| Bedtime Relaxation | `breathing/` cues | Bedtime storyteller — softest, slowest of all |
| Body Scan | `bodyscan/` | Soft body awareness — curious, never commanding |
| Muscle Release | `tension/` | Gentle instructor — clear, but kind |
| 5-4-3-2-1 Grounding | `grounding/` | Stable, reassuring guide — an anchor |

## ElevenLabs setup

| Setting | Value |
|---|---|
| Model | Eleven Multilingual v2 (or v3) |
| Voice | ONE calm, soft, low-pitch voice for BOTH languages (consistent brand) |
| Stability | 60–70% |
| Similarity | ~75% |
| Style | 0–10% |
| Speed | 0.85–0.95 (phase cues: 1.0) |
| Speaker boost | ON |

**Delivery rules (the premium-app secret):**

```
Never smile while speaking.
Never whisper.
Never sound sleepy.
Never sound excited.
Speak like you're sitting quietly beside one person.
```

**Technical rules:**

- Phase cues (`breathe-in`, `hold`, `breathe-out`, `hold-empty`) must be **≤ 1.5 seconds** — they fire every 3–5s inside the loop.
- Export: MP3, 44.1 kHz, 128 kbps+. Trim leading silence to ~0.2s. **Leave 0.8s of silence at the end** of every clip — transitions feel natural instead of abrupt.
- Keep loudness consistent across all clips.
- **Hindi tip:** if ElevenLabs mispronounces a Roman-Hindi word (English accent), regenerate that one line written in Devanagari — but still export it to the same `hi/` filename. The folder name is about the audience, not the input script.

---

## 1) Core breathing — `breathing/` (6 clips)

Used by the breathing sessions. Box Breathing / Reset Wave: `settle-in` intro after the
3-2-1 countdown, then per-phase cues. Bedtime: its own `bedtime/intro`, then the same cues.
Muscle Release also opens with `settle-in`. Calm Flow runs a 5-in / 5-out rhythm (no holds):
during its long intro the orb leads silently (cues never interrupt it), and once the intro
finishes the spoken in/out cues join the rhythm.

### `breathing/settle-in` (intro for Box / Reset Wave / Muscle Release)
- **EN:** Find a comfortable position. Relax your shoulders, and let your breathing settle.
- **HINDI:** Aaram se baith jayein. Kandhe dheele chhorein, aur saans ko sukoon se chalne dein.

### Phase cues (≤ 1.5s each — short, rhythm-first)

#### `breathing/breathe-in`
- **EN:** Inhale…
- **HINDI:** Saans lo…

#### `breathing/hold`
- **EN:** Hold…
- **HINDI:** Roko…

#### `breathing/breathe-out`
- **EN:** Exhale…
- **HINDI:** Chhodo…

#### `breathing/hold-empty` (box breathing, 2nd hold — same word, slightly softer take)
- **EN:** Hold…
- **HINDI:** Roko…

### `breathing/complete`

**EN:**
> And… we're done…
>
> Notice how you feel… right now…
>
> A little lighter… a little calmer…
>
> Take this feeling with you.

**HINDI:**
> Aur… ho gaya…
>
> Mehsoos karo… abhi kaisa lag raha hai…
>
> Thoda halka… thoda shaant…
>
> Is ehsaas ko apne saath le jao.

---

## 2) Body Scan — `bodyscan/` (8 clips)

Personality: soft body awareness. Invite, never command. ~70s of silence follows each zone clip,
so these can breathe (10–20s each).

### `bodyscan/intro`

**EN:**
> Let's take a slow journey… through your body…
>
> Lie down… or sit… whatever feels right…
>
> Close your eyes… if that's comfortable…
>
> Take one deep breath…
>
> And as you breathe out…
>
> let the day… fall away.

**HINDI:**
> Chalo… apne body ke saath ek dheema safar shuru karte hain…
>
> Let jao… ya baith jao… jo bhi aasaan lage…
>
> Chaaho to… aankhen band kar lo…
>
> Ek gehri saans lo…
>
> Aur jab saans chhodo…
>
> to pura din… peeche chhod do.

### `bodyscan/head`

**EN:**
> Gently… bring your attention to your face…
>
> Notice your forehead…
>
> If you're holding anything there…
>
> let it soften…
>
> Your eyes… resting…
>
> And your jaw…
>
> allow it to loosen…
>
> without forcing anything.

**HINDI:**
> Dheere se… apna dhyan chehre par lao…
>
> Apne maathe ko notice karo…
>
> Agar wahan koi tension hai…
>
> to use narm hone do…
>
> Aankhen… aaram mein…
>
> Aur jabda…
>
> use khud hi dheela hone do…
>
> bina koi zor lagaye.

### `bodyscan/neck`

**EN:**
> Now… drift down to your neck… and shoulders…
>
> This is where we carry so much…
>
> Notice the weight there…
>
> And with your next breath out…
>
> let your shoulders drop…
>
> Heavy… and loose.

**HINDI:**
> Ab… dheere se gardan aur kandhon par aao…
>
> Yahin hum sabse zyada bojh uthate hain…
>
> Us bojh ko mehsoos karo…
>
> Aur agli saans chhodte hue…
>
> kandhon ko girne do…
>
> Bhaari… aur dheele.

### `bodyscan/chest`

**EN:**
> Notice your chest…
>
> Rising…
>
> And falling…
>
> With every breath…
>
> You don't need to change anything…
>
> Just watch it… soften…
>
> a little more… each time.

**HINDI:**
> Apne seene ko notice karo…
>
> Uthta hua…
>
> Girta hua…
>
> Har saans ke saath…
>
> Kuch badalna nahi hai…
>
> Bas dekho… kaise ye narm hota jaata hai…
>
> har baar… thoda aur.

### `bodyscan/arms`

**EN:**
> Now your arms…
>
> From your shoulders…
>
> slowly down… to your fingertips…
>
> Let them grow heavy…
>
> Warm…
>
> As if they're sinking… into the surface beneath you.

**HINDI:**
> Ab tumhari baahein…
>
> Kandhon se…
>
> dheere dheere… ungliyon tak…
>
> Unhe bhaari hone do…
>
> Garm…
>
> Jaise wo neeche… dhans rahi hon.

### `bodyscan/stomach`

**EN:**
> Bring your attention… to your stomach…
>
> If it feels tight… that's okay…
>
> Just breathe… into that space…
>
> And let each breath out…
>
> soften it… a little more.

**HINDI:**
> Apna dhyan… pet par lao…
>
> Agar wahan khinchav hai… koi baat nahi…
>
> Bas us jagah mein… saans lo…
>
> Aur har baar saans chhodte hue…
>
> use thoda aur… narm hone do.

### `bodyscan/legs`

**EN:**
> And finally… your legs…
>
> Your thighs… your knees…
>
> your calves… all the way to your feet…
>
> Let everything go…
>
> Your whole body… is resting now…
>
> There's nothing left to hold.

**HINDI:**
> Aur aakhir mein… tumhari taangein…
>
> Jaanghein… ghutne…
>
> pindliyaan… aur pair tak…
>
> Sab kuch chhod do…
>
> Ab tumhara pura body… aaram mein hai…
>
> Ab kuch pakadna baaki nahi.

### `bodyscan/complete`

**EN:**
> Stay here… for a moment…
>
> Your body is calm…
>
> Your mind… is quiet…
>
> And whenever you're ready…
>
> let your eyes open… slowly…
>
> No rush.

**HINDI:**
> Ek pal… yahin ruko…
>
> Tumhara body shaant hai…
>
> Mann… halka hai…
>
> Aur jab tum ready ho…
>
> dheere se aankhen kholo…
>
> Koi jaldi nahi.

---

## 3) Muscle Release — `tension/` (8 clips)

Personality: gentle instructor. Zone clips: clear, slightly firmer (user must ACT).
`release` clip: melt back into softness — the contrast IS the therapy.

### `tension/fists`

**EN:**
> Let's start with your hands…
>
> Make two fists… and squeeze…
>
> Tighter…
>
> Feel the tension building…
>
> Hold it there.

**HINDI:**
> Chalo… haathon se shuru karte hain…
>
> Mutthiyaan band karo… aur dabao…
>
> Aur zor se…
>
> Tension ko mehsoos karo…
>
> Aur roko.

### `tension/shoulders`

**EN:**
> Now your shoulders…
>
> Lift them up… toward your ears…
>
> Squeeze…
>
> Hold that tightness…
>
> Just a little longer.

**HINDI:**
> Ab kandhe…
>
> Unhe upar uthao… kaanon ki taraf…
>
> Dabao…
>
> Us kasaav ko roko…
>
> Bas thodi der aur.

### `tension/jaw`

**EN:**
> Now… gently clench your jaw…
>
> Feel the muscles tighten…
>
> Hold…
>
> Notice where the tension sits.

**HINDI:**
> Ab… jabde ko halke se bheencho…
>
> Muscles ko kasta hua mehsoos karo…
>
> Roko…
>
> Dekho tension kahan baithi hai.

### `tension/stomach`

**EN:**
> Tighten your stomach…
>
> Pull it in…
>
> Hold it firm…
>
> Feel that strength.

**HINDI:**
> Pet ko kaso…
>
> Andar kheencho…
>
> Roko…
>
> Us zor ko mehsoos karo.

### `tension/legs`

**EN:**
> Now your legs…
>
> Press your thighs… and calves… tight…
>
> Hold…
>
> Feel the tension… all the way down.

**HINDI:**
> Ab taangein…
>
> Jaanghon aur pindliyon ko… kas lo…
>
> Roko…
>
> Neeche tak tension mehsoos karo.

### `tension/toes`

**EN:**
> And finally… your toes…
>
> Curl them… squeeze…
>
> Hold…
>
> Almost there.

**HINDI:**
> Aur aakhir mein… pair ki ungliyaan…
>
> Unhe modo… dabao…
>
> Roko…
>
> Bas thoda aur.

### `tension/release` — plays after EVERY zone (record with real softness)

**EN:**
> And… let go…
>
> Release everything…
>
> Feel the warmth… spreading…
>
> as the tension melts… away.

**HINDI:**
> Aur… chhod do…
>
> Sab kuch jaane do…
>
> Garmahat ko mehsoos karo… phailte hue…
>
> jaise tension… pighal rahi ho.

### `tension/complete`

**EN:**
> Beautiful…
>
> Your muscles are soft now… relaxed…
>
> Stay with this feeling… for a moment…
>
> This is what letting go… feels like.

**HINDI:**
> Bahut khoob…
>
> Tumhare muscles ab narm hain… relaxed…
>
> Is ehsaas ke saath… ek pal ruko…
>
> Chhod dena… aisa hi mehsoos hota hai.

---

## 4) 5-4-3-2-1 Grounding — `grounding/` (7 clips)

Personality: stable, reassuring anchor. Slowest, steadiest delivery of all sections.
(No "you are safe" — we ground the user in the present instead.)

### `grounding/intro`

**EN:**
> Let's come back… to right now…
>
> This is a simple exercise…
>
> Five things you see… four you can touch…
>
> three you hear… two you smell… one you taste…
>
> Take a slow breath…
>
> And let's begin.

**HINDI:**
> Chalo… wapas is pal mein aate hain…
>
> Ye ek aasaan exercise hai…
>
> Paanch cheezein jo tum dekh sakte ho… chaar jo chhoo sakte ho…
>
> teen jo sun sakte ho… do jo soongh sakte ho… ek jiska swad le sakte ho…
>
> Ek dheemi saans lo…
>
> Aur shuru karte hain.

### `grounding/see`

**EN:**
> Look around you… slowly…
>
> And find five things… you can see…
>
> Their colors… their shapes…
>
> Take your time… with each one.

**HINDI:**
> Apne aas paas dekho… dheere se…
>
> Aur paanch cheezein dhoondo… jo tum dekh sakte ho…
>
> Unke rang… unki shapes…
>
> Har ek ke saath… waqt lo.

### `grounding/touch`

**EN:**
> Now… four things you can touch…
>
> Maybe your clothes… the surface beneath you…
>
> Notice how they feel…
>
> Rough… smooth… warm… cool.

**HINDI:**
> Ab… chaar cheezein jo tum chhoo sakte ho…
>
> Shayad tumhare kapde… ya neeche ki surface…
>
> Mehsoos karo… kaisi lagti hain…
>
> Khurduri… mulayam… garm… thandi.

### `grounding/hear`

**EN:**
> Now listen…
>
> Three sounds… around you…
>
> Some close… some far away…
>
> Just notice them… as they come.

**HINDI:**
> Ab suno…
>
> Teen aawaazein… apne aas paas…
>
> Kuch paas ki… kuch door ki…
>
> Bas unhe notice karo… jaise wo aati hain.

### `grounding/smell`

**EN:**
> Two things… you can smell…
>
> Breathe in… slowly…
>
> If nothing comes… that's okay…
>
> Just notice the air.

**HINDI:**
> Do cheezein… jinki khushboo tum le sakte ho…
>
> Dheere se… saans andar lo…
>
> Agar kuch na mile… koi baat nahi…
>
> Bas hawa ko mehsoos karo.

### `grounding/taste`

**EN:**
> And one thing… you can taste…
>
> Notice it… fully…
>
> Stay with it… for a moment.

**HINDI:**
> Aur ek cheez… jiska swad tum mehsoos kar sakte ho…
>
> Use puri tarah… notice karo…
>
> Ek pal… uske saath raho.

### `grounding/complete`

**EN:**
> Notice this moment…
>
> Notice your breathing…
>
> You are here…
>
> Right now…
>
> Take one more slow breath…
>
> Well done.

**HINDI:**
> Is pal ko mehsoos karo…
>
> Apni saans ko mehsoos karo…
>
> Tum yahaan ho…
>
> Bilkul abhi…
>
> Ek aur dheemi saans lo…
>
> Bahut khoob.

---

## 5) Bonus — `breathing/well-done` (NOT NEEDED — do not record)

This was for the old TTS-based stress screens, which were removed; the Stress tab's
breathe modes now open the Relax player. No file exists and no code references it.

---

## 6) Eye section — `eyes/`

### ✅ Eye Reset (`/cvs-protocol`) — RECORDED & WIRED (9 × 2 = 18 files)

`eyes/reset-intro` (session intro, plays over calibration), `reset-circle`,
`reset-square`, `reset-triangle`, `reset-ninedot`, `reset-quick`,
`reset-nearfar`, `reset-shift` (one per exercise, plays as it starts), and
`reset-complete` (done screen). en + hi.

> Clinical status: the existing recordings are not clinically approved. Do not
> re-record or market them as reviewed until the copy and sign-off checklist in
> `docs/EYE_RESET_AUDIO_CLINICAL_REVIEW.md` has been completed.

### ⏳ Games — NOT YET RECORDED

Personality: calm coach — short, unhurried, one breath per line.

### Follow the Dot (`/eye-game/comet-trace`)

#### `eyes/comet-intro`
- **EN:** Hold your finger on the comet… and let your eyes follow it smoothly. This is rest, not a race.
- **HINDI:** Ungli comet par rakho… aur aankhon ko aaram se uske peeche jaane do. Ye aaram hai, race nahi.

#### `eyes/comet-rest`
- **EN:** Well done… now look away from the screen. Focus on something far for a few moments.
- **HINDI:** Shabash… ab screen se nazar hatao. Kuch der door kisi cheez par focus karo.

### Focus Switch (`/eye-game/focus-sprint`)

#### `eyes/focus-intro`
- **EN:** Lock your focus on the near or far target before the timer runs out.
- **HINDI:** Timer khatam hone se pehle near ya far target par focus jamao.

#### `eyes/focus-near` (short cue, ≤1s)
- **EN:** Near…
- **HINDI:** Paas…

#### `eyes/focus-far` (short cue, ≤1s)
- **EN:** Far…
- **HINDI:** Door…

### Target Tap (`/eye-game/saccade-sniper`)

#### `eyes/target-intro`
- **EN:** Tap the glowing targets as fast as you can. Move only your eyes — keep your head still.
- **HINDI:** Chamakte targets ko jald se jald tap karo. Sirf aankhein hilao — sar sabit rakho.

### Both Eyes Together (`/eye-game/dichoptic-reaction`)

#### `eyes/dichoptic-intro`
- **EN:** Put on your red and cyan glasses… and tap only the targets that match the active color.
- **HINDI:** Apne red aur cyan glasses pehno… aur sirf active color se milte targets ko tap karo.

### Eye Break (`/eye-break`) — optional

#### `eyes/break-lookaway`
- **EN:** Look away from the screen… find something twenty feet away… and rest your eyes there.
- **HINDI:** Screen se nazar hatao… koi door ki cheez dhoondo… aur wahin aankhon ko aaram do.

---

## Checklist

- [ ] Pick ONE multilingual voice, lock the settings above
- [ ] Generate 2–3 TEST clips first (breathe-in + complete, both languages) → listen in the app → then batch the rest
- [x] §1 core breathing (6 × 2 = 12 files) — makes all 4 Relax breathing sessions fully voiced
- [x] §2 Body Scan (16), §3 Muscle Release (16), §4 Grounding (14)
- [x] calm-flow + bedtime intros/completes (8)
- ~~§5 stress-screen bonus~~ — obsolete, TTS stress screens removed
- [x] §6 Eye Reset (9 × 2 = 18 files) — recorded & wired
- [ ] §6 game intros + focus cues (7 × 2 = 14 files)
- [ ] Every clip: ~0.2s silence at start, **0.8s at end**, consistent loudness
- [ ] Overwrite placeholders at `en/` and `hi/` with EXACT same filenames
- [ ] Restart with `npx expo start -c` so new assets bundle
