export type LangCode = 'en' | 'ur';

export interface Translations {
  // Navigation & Tabs
  home: string;
  sleep: string;
  relax: string;
  eye: string;
  profile: string;

  // Home Screen
  greeting_morning: string;
  greeting_afternoon: string;
  greeting_evening: string;
  tagline: string;
  mindpulse_score: string;
  calculating: string;
  main_issue: string;
  recovering: string;
  critical: string;
  eyes: string;
  mind: string;
  score_streak: string;
  sessions_logged: string;
  start_recovery: string;

  // Sleep Screen
  sleep_header: string;
  tonight: string;
  my_routine: string;
  ready: string;
  tracking: string;
  start_sleep: string;
  wake_at: string;
  duration: string;
  min_sleep: string;
  sweet_sleep: string;
  optimal_sleep: string;
  extra_sleep: string;
  smart_stage_alarm: string;
  wakes_gently: string;
  ai_insight: string;
  last_night: string;
  average: string;
  streak: string;

  // Relax Screen
  relax_header: string;
  breathing_exercises: string;
  stress_relief: string;
  start_session: string;
  session_complete: string;

  // Eye Screen
  eye_header: string;
  eye_exercises: string;
  eye_games: string;
  start_exercise: string;

  // Common
  save: string;
  cancel: string;
  ok: string;
  loading: string;
  error: string;
  success: string;
  yes: string;
  no: string;
  back: string;
  next: string;
  skip: string;
  submit: string;
}

export const TRANSLATIONS: Record<LangCode, Translations> = {
  en: {
    // Navigation & Tabs
    home: 'Home',
    sleep: 'Sleep',
    relax: 'Relax',
    eye: 'Eye',
    profile: 'Profile',

    // Home Screen
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    tagline: 'Your screen is shaping your mind',
    mindpulse_score: 'MINDPULSE SCORE',
    calculating: 'Calculating…',
    main_issue: 'Main issue:',
    recovering: 'Recovering',
    critical: 'Critical',
    eyes: 'Eyes',
    mind: 'Mind',
    score_streak: 'score streak',
    sessions_logged: 'sessions logged',
    start_recovery: 'Start Recovery Mode',

    // Sleep Screen
    sleep_header: 'Sleep',
    tonight: 'Tonight',
    my_routine: 'My Routine',
    ready: 'Ready',
    tracking: 'Tracking',
    start_sleep: 'START SLEEP',
    wake_at: 'Wake at',
    duration: 'DURATION',
    min_sleep: 'MIN',
    sweet_sleep: 'SWEET',
    optimal_sleep: 'OPTIMAL',
    extra_sleep: 'EXTRA',
    smart_stage_alarm: 'Smart Stage Alarm',
    wakes_gently: 'Wakes you gently during light sleep',
    ai_insight: 'AI INSIGHT',
    last_night: 'Last night',
    average: 'Average',
    streak: 'Streak',

    // Relax Screen
    relax_header: 'Relax',
    breathing_exercises: 'Breathing Exercises',
    stress_relief: 'Stress Relief',
    start_session: 'Start Session',
    session_complete: 'Session Complete',

    // Eye Screen
    eye_header: 'Eye',
    eye_exercises: 'Eye Exercises',
    eye_games: 'Eye Games',
    start_exercise: 'Start Exercise',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    ok: 'OK',
    loading: 'Loading',
    error: 'Error',
    success: 'Success',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    submit: 'Submit',
  },

  // Roman Urdu ("Kesi ho aap" style) — readable for every Hindi/Urdu
  // speaker without Devanagari or Nastaliq script.
  ur: {
    // Navigation & Tabs
    home: 'Home',
    sleep: 'Neend',
    relax: 'Aaram',
    eye: 'Aankhein',
    profile: 'Profile',

    // Home Screen
    greeting_morning: 'Subah bakhair',
    greeting_afternoon: 'Dopahar bakhair',
    greeting_evening: 'Shaam bakhair',
    tagline: 'Aapki screen aapke zehen ko shape kar rahi hai',
    mindpulse_score: 'MINDPULSE SCORE',
    calculating: 'Hisaab jaari hai…',
    main_issue: 'Bunyadi masla:',
    recovering: 'Behtar ho raha hai',
    critical: 'Sangeen',
    eyes: 'Aankhein',
    mind: 'Zehen',
    score_streak: 'score streak',
    sessions_logged: 'sessions record hue',
    start_recovery: 'Recovery Mode Shuru Karein',

    // Sleep Screen
    sleep_header: 'Neend',
    tonight: 'Aaj Raat',
    my_routine: 'Meri Routine',
    ready: 'Tayyar',
    tracking: 'Tracking',
    start_sleep: 'NEEND SHURU KAREIN',
    wake_at: 'Jaagne ka waqt',
    duration: 'MUDDAT',
    min_sleep: 'KAM',
    sweet_sleep: 'MEETHI',
    optimal_sleep: 'BEHTAREEN',
    extra_sleep: 'IZAFI',
    smart_stage_alarm: 'Smart Stage Alarm',
    wakes_gently: 'Halki neend ke doran aapko aahista jagata hai',
    ai_insight: 'AI INSIGHT',
    last_night: 'Pichli raat',
    average: 'Ausat',
    streak: 'Streak',

    // Relax Screen
    relax_header: 'Aaram',
    breathing_exercises: 'Saans ki Warzishein',
    stress_relief: 'Tanao se Nijaat',
    start_session: 'Session Shuru Karein',
    session_complete: 'Session Mukammal',

    // Eye Screen
    eye_header: 'Aankhein',
    eye_exercises: 'Aankhon ki Warzishein',
    eye_games: 'Aankhon ke Khel',
    start_exercise: 'Warzish Shuru Karein',

    // Common
    save: 'Save Karein',
    cancel: 'Cancel',
    ok: 'Theek Hai',
    loading: 'Load ho raha hai',
    error: 'Masla',
    success: 'Kamyabi',
    yes: 'Haan',
    no: 'Nahi',
    back: 'Wapas',
    next: 'Agla',
    skip: 'Chhorein',
    submit: 'Jama Karein',
  },

};
