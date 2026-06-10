export type LangCode = 'en' | 'hi' | 'ur' | 'ps';

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

  hi: {
    // Navigation & Tabs
    home: 'होम',
    sleep: 'नींद',
    relax: 'आराम',
    eye: 'आँखें',
    profile: 'प्रोफाइल',

    // Home Screen
    greeting_morning: 'सुप्रभात',
    greeting_afternoon: 'नमस्ते',
    greeting_evening: 'शुभ संध्या',
    tagline: 'आपकी स्क्रीन आपके मन को आकार दे रही है',
    mindpulse_score: 'माइंडपल्स स्कोर',
    calculating: 'गणना जारी है…',
    main_issue: 'मुख्य समस्या:',
    recovering: 'ठीक हो रहा है',
    critical: 'गंभीर',
    eyes: 'आँखें',
    mind: 'दिमाग',
    score_streak: 'स्कोर स्ट्रीक',
    sessions_logged: 'सत्र दर्ज किए',
    start_recovery: 'रिकवरी मोड शुरू करें',

    // Sleep Screen
    sleep_header: 'नींद',
    tonight: 'आज रात',
    my_routine: 'मेरी दिनचर्या',
    ready: 'तैयार',
    tracking: 'ट्रैकिंग',
    start_sleep: 'नींद शुरू करें',
    wake_at: 'जागने का समय',
    duration: 'अवधि',
    min_sleep: 'न्यूनतम',
    sweet_sleep: 'मीठी',
    optimal_sleep: 'इष्टतम',
    extra_sleep: 'अतिरिक्त',
    smart_stage_alarm: 'स्मार्ट स्टेज अलर्ट',
    wakes_gently: 'हल्की नींद के दौरान आपको धीरे से जगाता है',
    ai_insight: 'एआई अंतर्दृष्टि',
    last_night: 'कल रात',
    average: 'औसत',
    streak: 'स्ट्रीक',

    // Relax Screen
    relax_header: 'आराम',
    breathing_exercises: 'श्वास व्यायाम',
    stress_relief: 'तनाव मुक्ति',
    start_session: 'सत्र शुरू करें',
    session_complete: 'सत्र पूर्ण',

    // Eye Screen
    eye_header: 'आँखें',
    eye_exercises: 'आँखों का व्यायाम',
    eye_games: 'आँखों के खेल',
    start_exercise: 'व्यायाम शुरू करें',

    // Common
    save: 'सहेजें',
    cancel: 'रद्द करें',
    ok: 'ठीक है',
    loading: 'लोड हो रहा है',
    error: 'त्रुटि',
    success: 'सफलता',
    yes: 'हाँ',
    no: 'नहीं',
    back: 'वापस',
    next: 'अगला',
    skip: 'छोड़ें',
    submit: 'जमा करें',
  },

  ur: {
    // Navigation & Tabs
    home: 'ہوم',
    sleep: 'نیند',
    relax: 'آرام',
    eye: 'آنکھ',
    profile: 'پروفائل',

    // Home Screen
    greeting_morning: 'صبح بخیر',
    greeting_afternoon: 'دوپہر بخیر',
    greeting_evening: 'شام بخیر',
    tagline: 'آپ کی سکرین آپ کے دماغ کو سانچہ دے رہی ہے',
    mindpulse_score: 'مائنڈ پلس سکور',
    calculating: 'حساب جاری ہے…',
    main_issue: 'بنیادی مسئلہ:',
    recovering: 'صحت یاب ہو رہا ہے',
    critical: 'شدید',
    eyes: 'آنکھیں',
    mind: 'دماغ',
    score_streak: 'سکور سٹریک',
    sessions_logged: 'سیشن درج کیے',
    start_recovery: 'ری کوری موڈ شروع کریں',

    // Sleep Screen
    sleep_header: 'نیند',
    tonight: 'آج رات',
    my_routine: 'میری روٹین',
    ready: 'تیار',
    tracking: 'ٹریکنگ',
    start_sleep: 'نیند شروع کریں',
    wake_at: 'جاگنے کا وقت',
    duration: 'مدت',
    min_sleep: 'کم',
    sweet_sleep: 'مٹھی',
    optimal_sleep: 'بہتر',
    extra_sleep: 'اضافی',
    smart_stage_alarm: 'سمارٹ سٹیج الرٹ',
    wakes_gently: 'ہلکی نیند کے دوران آپ کو آہستہ جاگاتا ہے',
    ai_insight: 'ای آئی بصیرت',
    last_night: 'کل رات',
    average: 'اوسط',
    streak: 'سٹریک',

    // Relax Screen
    relax_header: 'آرام',
    breathing_exercises: 'سانس کی ورزشیں',
    stress_relief: 'تناؤ سے نجات',
    start_session: 'سیشن شروع کریں',
    session_complete: 'سیشن مکمل',

    // Eye Screen
    eye_header: 'آنکھ',
    eye_exercises: 'آنکھوں کی ورزشیں',
    eye_games: 'آنکھوں کے کھیل',
    start_exercise: 'ورزش شروع کریں',

    // Common
    save: 'محفوظ کریں',
    cancel: 'منسوخ کریں',
    ok: 'ٹھیک ہے',
    loading: 'لوڈ ہو رہا ہے',
    error: 'خرابی',
    success: 'کامیابی',
    yes: 'جی',
    no: 'نہیں',
    back: 'واپس',
    next: 'اگلا',
    skip: 'چھوڑ دیں',
    submit: 'جمع کریں',
  },

  ps: {
    // Navigation & Tabs
    home: 'کور',
    sleep: 'خوب',
    relax: 'آرام',
    eye: 'سترګه',
    profile: 'پروفایل',

    // Home Screen
    greeting_morning: 'صبح بخیر',
    greeting_afternoon: 'دوپهر بخیر',
    greeting_evening: 'شام بخیر',
    tagline: 'ستاسو سکرین ستاسو ذهن شکل ورکوي',
    mindpulse_score: 'مائنډ پلس سکور',
    calculating: 'محاسبه جاري ده…',
    main_issue: 'اساسي ستونزه:',
    recovering: 'صحت یابی',
    critical: 'ګران',
    eyes: 'سترګې',
    mind: 'ذهن',
    score_streak: 'سکور سٹریک',
    sessions_logged: 'جلسې ثبت شوې',
    start_recovery: 'بیرته راګرځېدنه شروع کړئ',

    // Sleep Screen
    sleep_header: 'خوب',
    tonight: 'د شپې',
    my_routine: 'زما معمول',
    ready: 'آماده',
    tracking: 'تعقیب',
    start_sleep: 'خوب شروع کړئ',
    wake_at: 'بیدار کیدو وخت',
    duration: 'مدت',
    min_sleep: 'کم',
    sweet_sleep: 'شیرین',
    optimal_sleep: 'بهترین',
    extra_sleep: 'اضافی',
    smart_stage_alarm: 'هوشمند مرحله الرٹ',
    wakes_gently: 'تاسو آهستې خوب کې بیدار کوي',
    ai_insight: 'AI بصیرت',
    last_night: 'شپه د پخوا',
    average: 'اوسط',
    streak: 'سٹریک',

    // Relax Screen
    relax_header: 'آرام',
    breathing_exercises: 'ساه وړلو تمرينات',
    stress_relief: 'فشار نه کول',
    start_session: 'جلسه شروع کړئ',
    session_complete: 'جلسه بشپړه',

    // Eye Screen
    eye_header: 'سترګه',
    eye_exercises: 'د سترګو تمرينات',
    eye_games: 'د سترګو لوبې',
    start_exercise: 'تمرین شروع کړئ',

    // Common
    save: 'محفوظ کړئ',
    cancel: 'منسوخ کړئ',
    ok: 'ٹھیک دی',
    loading: 'لوڈ کيږي',
    error: 'خرابی',
    success: 'کامیابی',
    yes: 'هو',
    no: 'نہ',
    back: 'شا ته',
    next: 'بل',
    skip: 'پریږدئ',
    submit: 'واستوول',
  },
};
