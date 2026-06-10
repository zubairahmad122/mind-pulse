export interface VoiceSegment {
  id: string;
  type: 'intro' | 'guidance' | 'affirmation' | 'closing';
  startSecond: number;
  text: string;
  voiceSpeed: number;
  pauseAfterMs: number;
}

export interface SessionVoiceScript {
  sessionId: string;
  language: 'en' | 'hi' | 'ur' | 'ps';
  segments: VoiceSegment[];
}

// CALM FLOW — 8:53 (533 seconds)
export const CALM_FLOW_EN: SessionVoiceScript = {
  sessionId: 'calm-flow',
  language: 'en',
  segments: [
    {
      id: 'intro',
      type: 'intro',
      startSecond: 2,
      text: 'Welcome. There is no rhythm you need to follow here. Just let your breath find its own natural pace. You are safe.',
      voiceSpeed: 0.80,
      pauseAfterMs: 25000,
    },
    {
      id: 'guidance-1',
      type: 'guidance',
      startSecond: 90,
      text: 'Notice the gentle rise and fall of your chest. Each breath is carrying you deeper into calm.',
      voiceSpeed: 0.80,
      pauseAfterMs: 90000,
    },
    {
      id: 'affirmation-1',
      type: 'affirmation',
      startSecond: 240,
      text: 'You are doing this beautifully. There is nowhere else you need to be.',
      voiceSpeed: 0.80,
      pauseAfterMs: 100000,
    },
    {
      id: 'guidance-2',
      type: 'guidance',
      startSecond: 400,
      text: 'Let your shoulders soften. Feel the weight of your body supported beneath you.',
      voiceSpeed: 0.80,
      pauseAfterMs: 80000,
    },
    {
      id: 'closing-cue',
      type: 'closing',
      startSecond: 480,
      text: 'In just a moment, you will gently return. But for now, stay here. You have created something beautiful.',
      voiceSpeed: 0.80,
      pauseAfterMs: 40000,
    },
  ],
};

// BOX BREATHING — 5:20 (320 seconds)
export const BOX_BREATHING_EN: SessionVoiceScript = {
  sessionId: 'box-breathing',
  language: 'en',
  segments: [
    {
      id: 'intro',
      type: 'intro',
      startSecond: 2,
      text: 'This is box breathing. It is simple, grounding, and powerful. Follow the shape with each cycle.',
      voiceSpeed: 0.80,
      pauseAfterMs: 22000,
    },
    {
      id: 'guidance-1',
      type: 'guidance',
      startSecond: 40,
      text: 'Breathe in slowly through your nose... hold the breath... now exhale completely... and rest.',
      voiceSpeed: 0.80,
      pauseAfterMs: 70000,
    },
    {
      id: 'affirmation-1',
      type: 'affirmation',
      startSecond: 150,
      text: 'Perfect. Your nervous system is responding. You are becoming calmer with each cycle.',
      voiceSpeed: 0.80,
      pauseAfterMs: 80000,
    },
    {
      id: 'guidance-2',
      type: 'guidance',
      startSecond: 240,
      text: 'If your mind wanders, that is fine. Simply bring your attention back to the shape, back to the breath.',
      voiceSpeed: 0.80,
      pauseAfterMs: 60000,
    },
    {
      id: 'closing-cue',
      type: 'closing',
      startSecond: 295,
      text: 'A few more cycles now. Feel how steady you have become.',
      voiceSpeed: 0.80,
      pauseAfterMs: 20000,
    },
  ],
};

// RESET WAVE — 6:15 (375 seconds)
export const RESET_WAVE_EN: SessionVoiceScript = {
  sessionId: 'reset-wave',
  language: 'en',
  segments: [
    {
      id: 'intro',
      type: 'intro',
      startSecond: 2,
      text: 'This is Reset Wave. We are gently awakening your energy. Breathe a bit more fully now, with intention.',
      voiceSpeed: 0.80,
      pauseAfterMs: 28000,
    },
    {
      id: 'guidance-1',
      type: 'guidance',
      startSecond: 60,
      text: 'Feel your senses coming alive. Notice the aliveness returning to your body with each deeper breath.',
      voiceSpeed: 0.80,
      pauseAfterMs: 100000,
    },
    {
      id: 'affirmation-1',
      type: 'affirmation',
      startSecond: 210,
      text: 'You are halfway through. Your energy is lifting, becoming clearer, more alert.',
      voiceSpeed: 0.80,
      pauseAfterMs: 90000,
    },
    {
      id: 'guidance-2',
      type: 'guidance',
      startSecond: 310,
      text: 'Feel the freshness in your mind. Your body is ready to move, ready to engage.',
      voiceSpeed: 0.80,
      pauseAfterMs: 50000,
    },
    {
      id: 'closing-cue',
      type: 'closing',
      startSecond: 350,
      text: 'A few more breaths. You are refreshed, restored, and ready.',
      voiceSpeed: 0.80,
      pauseAfterMs: 20000,
    },
  ],
};

// SLEEP DROP — 10:48 (648 seconds)
export const SLEEP_DROP_EN: SessionVoiceScript = {
  sessionId: 'sleep-drop',
  language: 'en',
  segments: [
    {
      id: 'intro',
      type: 'intro',
      startSecond: 3,
      text: 'This is Sleep Drop. We are slowing everything down together. Your only job is to let your body drift toward rest.',
      voiceSpeed: 0.75,
      pauseAfterMs: 35000,
    },
    {
      id: 'guidance-1',
      type: 'guidance',
      startSecond: 100,
      text: 'With each exhale, let the day release. All that happened, let it go. You are safe now.',
      voiceSpeed: 0.75,
      pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-1',
      type: 'affirmation',
      startSecond: 280,
      text: 'Feel the weight of your body sinking into support. That heaviness is a gift. Let it carry you down.',
      voiceSpeed: 0.75,
      pauseAfterMs: 130000,
    },
    {
      id: 'guidance-2',
      type: 'guidance',
      startSecond: 450,
      text: 'Your mind can rest now. There is nothing that needs your attention. Everything is handled.',
      voiceSpeed: 0.75,
      pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-2',
      type: 'affirmation',
      startSecond: 580,
      text: 'You are drifting. That is perfect. Sleep is coming gently, naturally, when you are ready.',
      voiceSpeed: 0.75,
      pauseAfterMs: 60000,
    },
  ],
};

// Map of all sessions
export const ALL_SESSION_SCRIPTS = {
  'calm-flow': CALM_FLOW_EN,
  'box-breathing': BOX_BREATHING_EN,
  'reset-wave': RESET_WAVE_EN,
  'sleep-drop': SLEEP_DROP_EN,
};

export function getSessionVoiceScript(
  sessionId: string,
  language: 'en' | 'hi' | 'ur' | 'ps' = 'en',
): SessionVoiceScript | null {
  // Currently only English scripts available
  // TODO: Add hi/ur/ps scripts when translations are ready
  if (language !== 'en') {
    return getSessionVoiceScript(sessionId, 'en');
  }

  return (ALL_SESSION_SCRIPTS as Record<string, SessionVoiceScript>)[sessionId] || null;
}
