import * as Speech from 'expo-speech';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

// Warmer, slower default — feels like a guide, not a robot.
const DEFAULT_LANG = 'en-US';
const DEFAULT_RATE = 0.55;
const DEFAULT_PITCH = 0.78;

/** Speak immediately, interrupting anything playing. Use for intros and cues. */
export function speak(text: string, langOrOpts?: string | SpeakOptions, rate?: number): void {
  Speech.stop();
  const opts = normalize(langOrOpts, rate);
  Speech.speak(text, {
    language: opts.lang ?? DEFAULT_LANG,
    rate: opts.rate ?? DEFAULT_RATE,
    pitch: opts.pitch ?? DEFAULT_PITCH,
  });
}

/** Speak only if nothing is currently playing. Use for phase-change hints. */
export async function speakIfSilent(
  text: string,
  langOrOpts?: string | SpeakOptions,
  rate?: number,
): Promise<void> {
  const opts = normalize(langOrOpts, rate);
  const params = {
    language: opts.lang ?? DEFAULT_LANG,
    rate: opts.rate ?? DEFAULT_RATE,
    pitch: opts.pitch ?? DEFAULT_PITCH,
  };
  try {
    const busy = await Speech.isSpeakingAsync();
    if (!busy) Speech.speak(text, params);
  } catch {
    Speech.speak(text, params);
  }
}

export function stopSpeaking(): void {
  Speech.stop();
}

function normalize(langOrOpts: string | SpeakOptions | undefined, rate: number | undefined): SpeakOptions {
  if (typeof langOrOpts === 'string' || langOrOpts === undefined) {
    return { lang: langOrOpts, rate };
  }
  return langOrOpts;
}
