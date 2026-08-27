/**
 * On-screen guidance text for the narration sessions — Body Scan, Grounding,
 * Muscle Release (voice comes from the pre-recorded clips in
 * assets/audio/guide — see useAudioGuide). Breathing sessions live in the
 * Relax player and use VOICE_SCRIPTS phase labels instead.
 */

export type SessionLang = 'en';

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
