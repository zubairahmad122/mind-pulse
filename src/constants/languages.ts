export type LangCode = 'en' | 'ur';

export interface LangOption {
  code: LangCode;
  label: string;   // native script
  labelEn: string; // English
  rtl: boolean;
  flag: string;
}

// Two languages only. Urdu displays in ROMAN Urdu ("Kesi ho aap" style) — no
// Nastaliq script on screen, so rtl stays off. Voice recordings are Hindi/Urdu.
export const LANGUAGES: LangOption[] = [
  { code: 'en', label: 'English', labelEn: 'English', rtl: false, flag: '🇺🇸' },
  { code: 'ur', label: 'Urdu',    labelEn: 'Urdu',    rtl: false, flag: '🇵🇰' },
];

export interface VoiceScript {
  // Games
  saccadeIntro: string;
  focusIntro: string;
  focusNear: string;
  focusFar: string;
  radarIntro: string;
  blinkIntro: string;
  blinkCue: string;
  // Eye Rotator
  rotatorIntro: string;
  rotatorLeftRight: string;
  rotatorUpDown: string;
  rotatorClockwise: string;
  rotatorCounter: string;
  rotatorFigure8: string;
  rotatorDone: string;
  // Box Breathing
  breatheIn: string;
  holdBreath: string;
  breatheOut: string;
  holdEmpty: string;
  boxBreathIntro: string;
  breatheSettleIntro: string;
  // Breathing phase label (big) + hint (small) shown above the orb
  phaseInLabel: string;
  phaseInHint: string;
  phaseHoldLabel: string;
  phaseHoldHint: string;
  phaseOutLabel: string;
  phaseOutHint: string;
  phaseHoldOutHint: string;
  // Body Scan
  bodyScanIntro: string;
  // CVS
  cvsIntro: string;
  // General
  sessionComplete: string;
  newRecord: string;
  wellDone: string;
}

export const VOICE_SCRIPTS: Record<LangCode, VoiceScript> = {
  en: {
    saccadeIntro:
      'Watch the glowing dot and tap it as fast as you can. Keep your head still — move only your eyes.',
    focusIntro:
      'Shift your attention between near and far when the display changes. Keep the focus change comfortable.',
    focusNear: 'Focus on the close text. Read it clearly.',
    focusFar:  'Now look far. Relax your eyes completely.',
    radarIntro:
      'Keep your eyes fixed on the center cross. A bright flash will appear in your periphery. Tap its direction without moving your eyes.',
    blinkIntro:
      'Press and hold to perform a full, complete blink. A perfect blink lasts 150 to 500 milliseconds and fully lubricates your eyes.',
    blinkCue: 'Blink now.',
    rotatorIntro:
      'Follow the moving dot with your eyes only. Keep your head perfectly still throughout.',
    rotatorLeftRight:
      'Left and right. Follow all the way to the edges. Keep your head still.',
    rotatorUpDown:
      'Up and down. Smooth and steady. Reach the full range.',
    rotatorClockwise:
      'Full clockwise circles. Nice and slow. Follow the complete path.',
    rotatorCounter:
      'Counter-clockwise now. Keep the movement smooth and controlled.',
    rotatorFigure8:
      'Trace the infinity symbol. Let your eyes flow naturally.',
    rotatorDone:
      'Excellent. All five visual movement patterns are complete. Let your eyes rest.',
    breatheIn:    'Breathe in slowly',
    holdBreath:   'Hold',
    breatheOut:   'Breathe out. Let it all go',
    holdEmpty:    'Hold empty',
    boxBreathIntro: 'Starting box breathing. Follow the circle.',
    breatheSettleIntro:
      'Find a comfortable position. Relax your shoulders, and let your breathing settle.',
    phaseInLabel:    'Breathe In',
    phaseInHint:     'Take a slow, deep breath',
    phaseHoldLabel:  'Hold',
    phaseHoldHint:   'Stay relaxed',
    phaseOutLabel:   'Breathe Out',
    phaseOutHint:    'Let it all go',
    phaseHoldOutHint: 'Rest, lungs empty',
    bodyScanIntro:
      'Beginning body scan. Find a comfortable position and close your eyes.',
    cvsIntro:
      'Starting your guided Eye Reset. Stop if you notice discomfort, blur, or double vision.',
    sessionComplete: 'Session complete. Great work today.',
    newRecord: 'New personal record. Outstanding.',
    wellDone:  'Well done.',
  },

  // Roman Urdu — readable for every Hindi/Urdu speaker.
  ur: {
    saccadeIntro:
      'Chamakte nuqte ko dekhein aur jald se jald tap karein. Sar sabit rakhein — sirf aankhein hilayein.',
    focusIntro:
      'Jab display badle to qareeb aur door tawajjo badlein. Harkat ko aaram-deh rakhein.',
    focusNear: 'Qareebi text par tawajjo dein. Saaf saaf parhein.',
    focusFar:  'Ab door dekhein. Aankhon ko mukammal aaram dein.',
    radarIntro:
      'Beech ke cross par nazar jamaye rakhein. Kinare mein chamak aayegi. Aankhein hilaye baghair us ki taraf tap karein.',
    blinkIntro:
      'Mukammal palak jhapakne ke liye dabayein aur hold karein. Aik perfect palak 150 se 500 millisecond tak chalti hai.',
    blinkCue: 'Abhi palak jhapkayein.',
    rotatorIntro:
      'Sirf aankhon se chalte nuqte ko follow karein. Sar bilkul sabit rakhein.',
    rotatorLeftRight: 'Bayein aur dayein. Kinaron tak jayein. Sar sabit rakhein.',
    rotatorUpDown:    'Oopar aur neeche. Naram aur mustehkam.',
    rotatorClockwise: 'Clockwise dayre. Aahista aur hamwar.',
    rotatorCounter:   'Ab ulti taraf. Harkat hamwar rakhein.',
    rotatorFigure8:   'Infinity ke nishaan ko follow karein. Qudrati harkat.',
    rotatorDone:      'Shandaar! Paanchon visual movement patterns mukammal. Ab aankhon ko aaram dein.',
    breatheIn:    'Aahista saans lein',
    holdBreath:   'Rokein',
    breatheOut:   'Saans chhorein. Sab jaane dein',
    holdEmpty:    'Khaali rokein',
    boxBreathIntro: 'Box breathing shuru. Circle ko follow karein.',
    breatheSettleIntro:
      'Aaram se baith jayein. Kandhe dheele chhorein, aur saans ko sukoon se chalne dein.',
    phaseInLabel:    'Saans Lein',
    phaseInHint:     'Dheemi, gehri saans lein',
    phaseHoldLabel:  'Rokein',
    phaseHoldHint:   'Pursukoon rahein',
    phaseOutLabel:   'Saans Chhorein',
    phaseOutHint:    'Sab jaane dein',
    phaseHoldOutHint: 'Khaali rahein, aaram se',
    bodyScanIntro:
      'Body scan shuru. Aaram se baith jayein aur aankhein band karein.',
    cvsIntro:
      'Aapka guided Eye Reset shuru. Takleef, dhundla-pan, ya double nazar aaye to ruk jayein.',
    sessionComplete: 'Session mukammal. Aaj bohat acha kaam.',
    newRecord: 'Naya personal record. Shandaar.',
    wellDone:  'Shabash.',
  },

};
