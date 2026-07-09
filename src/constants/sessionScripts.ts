/**
 * Guidance scripts for all relax/breathing sessions.
 * On-screen guidance text for the narration sessions (voice comes from the
 * pre-recorded clips in assets/audio/guide — see useAudioGuide).
 * Languages: en (English), hi (Hindi), ur (Urdu).
 */

export type SessionLang = 'en';

// ─── Box Breathing ────────────────────────────────────────────────────────────
export interface BoxScript {
  intro:       string;
  inhale:      string;
  inhaleSub:   string;
  holdIn:      string;
  holdInSub:   string;
  exhale:      string;
  exhaleSub:   string;
  holdOut:     string;
  holdOutSub:  string;
  complete:    string;
}

export const BOX_SCRIPTS: Record<SessionLang, BoxScript> = {
  en: {
    intro:      'Close your eyes. Sit comfortably. Let\'s begin.',
    inhale:     'Breathe in slowly…',
    inhaleSub:  'Let your chest rise gently',
    holdIn:     'Hold… stay still…',
    holdInSub:  'You are completely safe here',
    exhale:     'Now let it all go…',
    exhaleSub:  'Release every bit of tension',
    holdOut:    'Rest in the quiet…',
    holdOutSub: 'You\'re doing beautifully',
    complete:   'Well done. Carry this calm with you.',
  },
};

// ─── Calm Wave ────────────────────────────────────────────────────────────────
export interface CalmWaveScript {
  intro:     string;
  inhale:    string;
  inhaleSub: string;
  hold:      string;
  holdSub:   string;
  exhale:    string;
  exhaleSub: string;
  complete:  string;
}

export const CALM_WAVE_SCRIPTS: Record<SessionLang, CalmWaveScript> = {
  en: {
    intro:     'Imagine a calm ocean. Let each breath be a wave.',
    inhale:    'Breathe in like a rising wave…',
    inhaleSub: 'Let the tide fill you',
    hold:      'At the crest… hold…',
    holdSub:   'Feel the fullness',
    exhale:    'Let the wave wash out…',
    exhaleSub: 'All tension flows away with it',
    complete:  'Beautiful. You are calm.',
  },
};

// ─── Body Scan ────────────────────────────────────────────────────────────────
export interface BodyScanZoneScript {
  label:  string;
  script: string;
}

export const BODY_SCAN_SCRIPTS: Record<SessionLang, {
  intro:    string;
  complete: string;
  zones:    BodyScanZoneScript[];
}> = {
  en: {
    intro:    'Beginning body scan. Find a comfortable position and gently close your eyes.',
    complete: 'The scan is complete. Notice how much lighter your body feels now.',
    zones: [
      { label: 'Head & Face',      script: 'Bring attention to your head and face. Notice any tension in your forehead or jaw. Breathe in… and as you exhale, let it all soften.' },
      { label: 'Neck & Shoulders', script: 'Move to your neck and shoulders. This is where stress lives. Breathe in. As you exhale, let your shoulders drop away from your ears.' },
      { label: 'Chest & Heart',    script: 'Focus on your chest. Notice each breath expanding your ribs. With every exhale, release whatever you are carrying right now.' },
      { label: 'Arms & Hands',     script: 'Shift to your arms and hands. Unclench your fingers. Let your hands rest open, heavy and fully supported.' },
      { label: 'Stomach',          script: 'Bring attention to your stomach. Allow your belly to expand fully as you breathe in. Let it fall as you breathe out. No holding, no tightness.' },
      { label: 'Legs & Feet',      script: 'Finally, your legs and feet. Feel them heavy and grounded. Wiggle your toes. You are fully here, fully present.' },
    ],
  },
};

// ─── Grounding (5-4-3-2-1) ────────────────────────────────────────────────────
export const GROUNDING_SCRIPTS: Record<SessionLang, {
  intro:    string;
  steps:    { sense: string; prompt: string }[];
  complete: string;
}> = {
  en: {
    intro: 'Let\'s begin. Take a slow breath, and get ready to notice the world around you.',
    steps: [
      { sense: '5 things you SEE',   prompt: 'Look around and name 5 things you can see right now.' },
      { sense: '4 things you TOUCH', prompt: 'Notice 4 textures you can feel right now.' },
      { sense: '3 things you HEAR',  prompt: 'Listen for 3 distinct sounds around you.' },
      { sense: '2 things you SMELL', prompt: 'Find 2 scents in your space right now.' },
      { sense: '1 thing you TASTE',  prompt: 'Name 1 taste — or take a slow sip of water.' },
    ],
    complete: 'You are here, now. Notice how your body feels a little steadier.',
  },
};

// ─── Tension Release ──────────────────────────────────────────────────────────
export const TENSION_SCRIPTS: Record<SessionLang, {
  squeeze:    string;
  release:    string;
  releaseCue: string;
  complete:   string;
  zones: { label: string; cue: string }[];
}> = {
  en: {
    squeeze: 'SQUEEZE',
    release: 'RELEASE',
    releaseCue: 'Now let everything go completely loose…',
    complete: 'Full body release complete. Breathe slowly. Notice the difference.',
    zones: [
      { label: 'Hands & Fists',  cue: 'Make tight fists… squeeze for 5 seconds…' },
      { label: 'Shoulders',      cue: 'Raise your shoulders to your ears… hold…' },
      { label: 'Jaw & Face',     cue: 'Gently clench your jaw… feel the tension…' },
      { label: 'Stomach',        cue: 'Tighten your core muscles… hold…' },
      { label: 'Legs',           cue: 'Press your legs together firmly… hold…' },
      { label: 'Feet & Toes',    cue: 'Curl your toes under… squeeze…' },
    ],
  },
};
