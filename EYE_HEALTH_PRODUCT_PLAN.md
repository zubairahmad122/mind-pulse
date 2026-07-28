# MindPulse Eye Health Product Plan

## Implementation status

Started July 25, 2026.

- [x] Rename the user-facing score to Eye Comfort & Habits.
- [x] Replace the clearest cure, prevention, muscle-strength, and eyesight-protection claims in active UI copy.
- [x] Add stop conditions and professional-care guidance to Eye Reset.
- [x] Preserve and reuse the existing English and Urdu/Hindi recorded audio-guide system.
- [x] Reframe game scores as game performance rather than eye-health measurements.
- [x] Add persistent game XP, levels, and completed-round progress.
- [x] Apply the same progression rewards to the premium red/cyan coordination game.
- [x] Add meaningful, non-medical game level titles and visible next milestones.
- [x] Add optional cosmetic badge rewards for later game milestones.
- [ ] Clinically review and re-record Eye Reset audio whose spoken wording still contains older exercise claims.
- [x] Add optional before/after eye-comfort check-ins to Eye Reset.
- [x] Persist Eye Reset comfort outcomes locally with signed-in cloud backup.
- [x] Add a seven-day eye-comfort summary with session outcomes and safety-aware trend messaging.
- [x] Expand the summary into a personalized weekly report with reminder, symptom, and manually reported screen-habit data.
- [x] Add eye comfort and reminder follow-through to the main weekly report.
- [x] Add one safety-aware weekly habit recommendation from comfort and reminder data.
- [x] Add an optional symptom check-in with non-diagnostic escalation guidance.
- [x] Summarize recent symptom check-ins in the weekly report.
- [x] Add configurable 20/30/45/60-minute reminder intervals.
- [x] Repair missing notification schedules when an enabled user returns.
- [x] Keep the reminder toggle off when OS permission or scheduling fails.
- [x] Track reminder opens, completed breaks, and abandoned breaks locally.
- [x] Show a seven-day reminder follow-through summary on the Eye screen.
- [x] Add a system-notification “Snooze 10 min” action and track its use.
- [x] Add anytime, weekday, and daily working-hours reminder schedules.
- [x] Add custom start/end hours and selectable reminder days.
- [ ] Validate notification reliability under real Android battery restrictions.
- [x] Prototype a responsive desktop/browser break companion.

## Product direction

Position MindPulse as **the daily screen-recovery coach**:

> MindPulse helps screen-heavy people build healthier visual habits, reduce discomfort, and know when to seek professional eye care.

The app must not promise to improve eyesight, cure eye disease, or “train every eye muscle.” Most digital-eye-strain support should focus on breaks, blinking, viewing distance, lighting, ergonomics, and symptom awareness. Exercises intended to treat convergence or accommodation disorders should only be offered through a clinician-reviewed pathway.

## Product goals

1. Make eye breaks automatic and difficult to forget.
2. Help users understand which habits are associated with their discomfort.
3. Provide short, safe recovery activities after prolonged screen use.
4. connect daytime screen habits with stress and sleep.
5. Become more trustworthy than generic eye-exercise applications.

## Core experience: Detect → Recover → Learn → Escalate

### 1. Detect

- Configurable 20-20-20 reminder schedule.
- Workday, study, gaming, and reading modes.
- Pause reminders automatically when a session ends or the device is inactive.
- Optional daily symptom check-in:
  - dryness or burning;
  - tired or sore eyes;
  - blurred or double vision;
  - headache;
  - light sensitivity;
  - neck or shoulder discomfort.
- Track reminder adherence, continuous-screen intervals, symptoms, environment, and time of day.
- Do not infer medical diagnoses from these answers.

### 2. Recover

Build a short **Eye Reset** that can be completed without staring at the phone:

1. Audio cue to look at a distant object for 20 seconds.
2. Gentle blink sequence.
3. Close the eyes and relax the face for 10–20 seconds.
4. Optional shoulder and neck release.
5. Ask whether discomfort improved, stayed the same, or worsened.

The screen should dim and provide voice/haptic timing. A screen-recovery feature should not require continuous visual attention.

### 3. Learn

Create a personalized weekly report showing:

- completed versus dismissed breaks;
- longest continuous-screen period;
- symptom trend;
- times and contexts associated with discomfort;
- whether symptoms improved after breaks;
- sleep and stress correlations;
- one small recommended habit for the next week.

Use wording such as “associated with” rather than claiming causation.

### 4. Escalate safely

Show a persistent recommendation to seek an eye-care professional when users repeatedly report:

- double vision;
- persistent blurred vision;
- eye pain;
- sudden vision changes;
- symptoms that continue despite breaks;
- difficulty coordinating both eyes;
- symptoms after a concussion or head injury.

The app should not attempt to diagnose or treat these conditions.

## Exercise library

### Safe general-wellness activities

These may be available to most adults when framed as comfort or habit activities:

- distance-looking break;
- conscious blinking;
- eyes-closed relaxation;
- near-to-far focus awareness without performance promises;
- gentle visual tracking;
- workspace and posture reset;
- breathing and facial relaxation.

Every activity needs:

- stop instructions for pain, dizziness, nausea, headache, or double vision;
- a skip option;
- low-motion and accessibility modes;
- no claims that performance scores represent eye health.

### Clinician-reviewed activities

Convergence, vergence, accommodation, amblyopia, dichoptic, or post-concussion exercises should be separated into a clearly labeled **Vision Therapy Companion**.

Requirements:

- reviewed by an optometrist, ophthalmologist, or orthoptist;
- used only after professional assessment;
- configurable prescription parameters;
- clinician or patient-entered treatment plan;
- no automatic difficulty increases based only on game scores;
- symptom and adverse-event logging;
- exportable adherence report for the clinician.

The existing dichoptic and convergence-style activities should not be marketed as general eye-health improvement until this review exists.

## Competitive feature set

### Foundation

- automatic and customizable breaks;
- audio-first Eye Reset;
- symptom check-ins;
- progress and adherence;
- guest mode with no mandatory account;
- offline operation;
- English plus high-quality Urdu/Hindi guidance;
- privacy controls and data deletion.

### Differentiators

- screen-recovery plan spanning Eyes, Mind, and Sleep;
- symptom-aware recommendations;
- adaptive reminders that respect meetings, focus sessions, and inactive time;
- desktop/browser companion synchronized with mobile;
- workstation setup assistant;
- clinician-reviewed education;
- printable or shareable eye-comfort report;
- employer mode with private, aggregated wellness data only.

### Features not worth competing on first

- a huge meditation library;
- dozens of arcade games;
- unvalidated eye-strength scores;
- AI diagnoses;
- social feeds;
- generic chatbot coaching.

## Eye Health Score redesign

Replace any score that implies visual fitness or medical health with an **Eye Comfort & Habits Score**.

Suggested inputs:

- 35% break adherence;
- 20% longest continuous-screen period;
- 20% self-reported comfort;
- 15% blink/distance-reset completion;
- 10% workstation and lighting habits.

Display the contributing factors and never label the result as visual acuity, eye strength, muscle strength, or disease risk.

Game performance should remain a separate entertainment/progress metric.

## Twelve-week roadmap

### Weeks 1–2: safety and positioning

- Rewrite eye-related claims throughout the app.
- Rename the Eye Score.
- Add medical limitations and stop conditions.
- Review the current CVS, dichoptic, convergence, and tracking activities.
- Recruit a clinical adviser.
- Define the primary audience: students and desk-based knowledge workers.

### Weeks 3–5: best-in-class break system

- Improve schedules and reminder controls.
- Build the audio-first Eye Reset.
- Add completion, dismissal, snooze, and discomfort events to analytics.
- Add symptom check-ins before and after selected breaks.
- Test background reliability and battery behavior on real Android and iOS devices.

### Weeks 6–8: personalization

- Build the Eye Comfort & Habits Score.
- Add the weekly eye-comfort report.
- Recommend one habit based on observed behavior.
- Connect late screen use with the existing sleep routine.
- Add consent and privacy explanations for any AI-generated insight.

### Weeks 9–10: cross-device advantage

- Prototype a browser extension or desktop tray application.
- Synchronize work sessions and completed breaks.
- Allow phone audio/haptics to guide a break triggered by the computer.

### Weeks 11–12: validation

- Run a four-week pilot with 30–50 screen-heavy users.
- Have a clinician review instructions, warnings, and claims.
- Fix the highest-frequency reminder and exercise drop-offs.
- Prepare truthful store screenshots and descriptions based on pilot results.

## Success metrics

### Activation

- 60% enable eye-break reminders on the first day.
- 50% complete their first Eye Reset.
- Median time to first value under three minutes.

### Engagement

- 40% of reminders result in a completed or intentionally snoozed break.
- 30% week-one retention among reminder-enabled users.
- Three completed Eye Resets per active user per week.

### User benefit

- Measure change in user-reported discomfort, not “eyesight improvement.”
- At least 50% of regular users report better break consistency after four weeks.
- At least 30% report lower end-of-day discomfort.
- Track worsening symptoms and exercise-related adverse events separately.

### Trust

- Fewer than 2% of sessions receive a safety complaint.
- 100% of health claims have an internal evidence source and review date.
- No diagnosis, cure, prevention, or visual-acuity claims without appropriate evidence and regulatory review.

## Validation study

Run a prospective pilot before making effectiveness claims:

- baseline week without behavioral recommendations;
- three intervention weeks;
- daily validated or clinician-approved symptom questionnaire;
- reminder adherence and continuous-screen intervals;
- pre/post break comfort rating;
- subgroup analysis by screen hours and corrective-lens use;
- clinician review of the protocol;
- transparent reporting of dropouts and negative outcomes.

Do not describe the pilot as a clinical trial unless it is designed and governed as one.

## Evidence baseline

- American Optometric Association: digital eye strain and the 20-20-20 rule  
  https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome
- National Eye Institute: convergence insufficiency requires diagnosis and may be treated with specialist-led vision therapy  
  https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/convergence-insufficiency
- Cochrane: office-based vergence/accommodative therapy with home reinforcement has stronger evidence for children with diagnosed convergence insufficiency than unsupervised home exercises  
  https://www.cochrane.org/evidence/CD006768_how-do-different-treatments-vision-disorder-convergence-insufficiency-compare-effectiveness

## Immediate product decision

Build the best **screen-break adherence and eye-comfort product**, not an app claiming to strengthen every eye muscle. Clinical exercise programs can become a later professional product after expert review and validation.
