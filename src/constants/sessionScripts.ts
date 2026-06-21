/**
 * Guidance scripts for all relax/breathing sessions.
 * Every string here is shown on-screen AND spoken aloud (via Azure TTS or expo-speech).
 * Languages: en (English), hi (Hindi), ur (Urdu).
 */

export type SessionLang = 'en' | 'hi' | 'ur' | 'ps';

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
  hi: {
    intro:      'आंखें बंद करें। आराम से बैठें। चलिए शुरू करते हैं।',
    inhale:     'धीरे… सांस लें…',
    inhaleSub:  'छाती को धीरे-धीरे ऊपर उठने दें',
    holdIn:     'रोकें… शांत रहें…',
    holdInSub:  'आप यहाँ पूरी तरह सुरक्षित हैं',
    exhale:     'अब… जाने दें…',
    exhaleSub:  'हर एक तनाव को बाहर निकाल दें',
    holdOut:    'इस शांति में आराम करें…',
    holdOutSub: 'आप बहुत अच्छा कर रहे हैं',
    complete:   'बहुत खूब। इस शांति को अपने साथ ले जाएं।',
  },
  ur: {
    intro:      'آنکھیں بند کریں۔ آرام سے بیٹھیں۔ آئیے شروع کرتے ہیں۔',
    inhale:     'آہستہ… سانس لیں…',
    inhaleSub:  'سینہ کو آہستہ آہستہ اوپر اٹھنے دیں',
    holdIn:     'رکیں… پرسکون رہیں…',
    holdInSub:  'آپ یہاں مکمل محفوظ ہیں',
    exhale:     'اب… چھوڑ دیں…',
    exhaleSub:  'ہر ایک تناؤ کو باہر جانے دیں',
    holdOut:    'اس سکون میں آرام کریں…',
    holdOutSub: 'آپ بہت اچھا کر رہے ہیں',
    complete:   'بہت خوب۔ یہ سکون اپنے ساتھ لے جائیں۔',
  },
  ps: {
    intro:      'آنکھیں بند کریں۔ آرام سے بیٹھیں۔ آئیے شروع کرتے ہیں۔',
    inhale:     'آہستہ… سانس لیں…',
    inhaleSub:  'سینہ کو آہستہ آہستہ اوپر اٹھنے دیں',
    holdIn:     'رکیں… پرسکون رہیں…',
    holdInSub:  'آپ یہاں مکمل محفوظ ہیں',
    exhale:     'اب… چھوڑ دیں…',
    exhaleSub:  'ہر ایک تناؤ کو باہر جانے دیں',
    holdOut:    'اس سکون میں آرام کریں…',
    holdOutSub: 'آپ بہت اچھا کر رہے ہیں',
    complete:   'بہت خوب۔ یہ سکون اپنے ساتھ لے جائیں۔',
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
  hi: {
    intro:     'एक शांत समुद्र की कल्पना करें। हर सांस एक लहर हो।',
    inhale:    'लहर की तरह सांस लें…',
    inhaleSub: 'लहर आपको भर दे',
    hold:      'शिखर पर… रुकें…',
    holdSub:   'भराव महसूस करें',
    exhale:    'लहर को वापस जाने दें…',
    exhaleSub: 'सारा तनाव उसके साथ बह जाए',
    complete:  'बहुत अच्छा। आप शांत हैं।',
  },
  ur: {
    intro:     'ایک پرسکون سمندر کا تصور کریں۔ ہر سانس ایک لہر ہو۔',
    inhale:    'لہر کی طرح سانس لیں…',
    inhaleSub: 'لہر آپ کو بھر دے',
    hold:      'چوٹی پر… رکیں…',
    holdSub:   'بھراؤ محسوس کریں',
    exhale:    'لہر کو واپس جانے دیں…',
    exhaleSub: 'سارا تناؤ اس کے ساتھ بہہ جائے',
    complete:  'بہت اچھا۔ آپ پرسکون ہیں۔',
  },
  ps: {
    intro:     'ایک پرسکون سمندر کا تصور کریں۔ ہر سانس ایک لہر ہو۔',
    inhale:    'لہر کی طرح سانس لیں…',
    inhaleSub: 'لہر آپ کو بھر دے',
    hold:      'چوٹی پر… رکیں…',
    holdSub:   'بھراؤ محسوس کریں',
    exhale:    'لہر کو واپس جانے دیں…',
    exhaleSub: 'سارا تناؤ اس کے ساتھ بہہ جائے',
    complete:  'بہت اچھا۔ آپ پرسکون ہیں۔',
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
  hi: {
    intro:    'बॉडी स्कैन शुरू। आरामदायक स्थिति में बैठें और आंखें बंद करें।',
    complete: 'स्कैन पूरा हो गया। महसूस करें कि आपका शरीर कितना हल्का है।',
    zones: [
      { label: 'सिर और चेहरा',    script: 'सिर और चेहरे पर ध्यान दें। माथे और जबड़े में तनाव देखें। सांस लें… और जैसे सांस छोड़ें, सब कुछ नरम हो जाए।' },
      { label: 'गर्दन और कंधे',   script: 'गर्दन और कंधों पर आएं। यहाँ तनाव रहता है। सांस लें। सांस छोड़ते हुए कंधे कानों से दूर गिरने दें।' },
      { label: 'छाती और दिल',     script: 'छाती पर ध्यान दें। हर सांस से पसलियां फैलती हैं। हर सांस छोड़ते समय जो बोझ है उसे छोड़ दें।' },
      { label: 'बाहें और हाथ',    script: 'बाहों और हाथों पर आएं। उंगलियों की पकड़ ढीली करें। हाथ खुले रखें, पूरी तरह आराम में।' },
      { label: 'पेट',              script: 'पेट पर ध्यान दें। सांस लेते समय पेट फैलने दें। सांस छोड़ते समय गिरने दें। कोई तनाव नहीं।' },
      { label: 'पैर',              script: 'अंत में, अपने पैरों पर ध्यान दें। उन्हें भारी और जमीन से जुड़ा महसूस करें। पैरों की उंगलियां हिलाएं। आप यहाँ, अभी हैं।' },
    ],
  },
  ur: {
    intro:    'باڈی اسکین شروع۔ آرام دہ پوزیشن لیں اور آنکھیں بند کریں۔',
    complete: 'اسکین مکمل ہوگیا۔ محسوس کریں آپ کا جسم کتنا ہلکا ہے۔',
    zones: [
      { label: 'سر اور چہرہ',      script: 'سر اور چہرے پر توجہ دیں۔ پیشانی اور جبڑے میں تناؤ دیکھیں۔ سانس لیں… اور جیسے سانس چھوڑیں، سب کچھ نرم ہو جائے۔' },
      { label: 'گردن اور کندھے',   script: 'گردن اور کندھوں پر آئیں۔ یہاں تناؤ رہتا ہے۔ سانس لیں۔ سانس چھوڑتے ہوئے کندھے کانوں سے دور گرنے دیں۔' },
      { label: 'سینہ اور دل',      script: 'سینے پر توجہ دیں۔ ہر سانس سے پسلیاں پھیلتی ہیں۔ ہر سانس چھوڑتے وقت جو بوجھ ہے اسے چھوڑ دیں۔' },
      { label: 'بازو اور ہاتھ',    script: 'بازوؤں اور ہاتھوں پر آئیں۔ انگلیوں کی گرفت ڈھیلی کریں۔ ہاتھ کھلے رکھیں، پوری طرح آرام میں۔' },
      { label: 'پیٹ',               script: 'پیٹ پر توجہ دیں۔ سانس لیتے وقت پیٹ پھیلنے دیں۔ سانس چھوڑتے وقت گرنے دیں۔ کوئی تناؤ نہیں۔' },
      { label: 'پیر',               script: 'آخر میں، اپنے پیروں پر توجہ دیں۔ انہیں بھاری اور زمین سے جڑا محسوس کریں۔ پیروں کی انگلیاں ہلائیں۔ آپ یہاں، ابھی ہیں۔' },
    ],
  },
  ps: {
    intro:    'باڈی اسکین شروع۔ آرام دہ پوزیشن لیں اور آنکھیں بند کریں۔',
    complete: 'اسکین مکمل ہوگیا۔ محسوس کریں آپ کا جسم کتنا ہلکا ہے۔',
    zones: [
      { label: 'سر اور چہرہ',      script: 'سر اور چہرے پر توجہ دیں۔ پیشانی اور جبڑے میں تناؤ دیکھیں۔ سانس لیں… اور جیسے سانس چھوڑیں، سب کچھ نرم ہو جائے۔' },
      { label: 'گردن اور کندھے',   script: 'گردن اور کندھوں پر آئیں۔ یہاں تناؤ رہتا ہے۔ سانس لیں۔ سانس چھوڑتے ہوئے کندھے کانوں سے دور گرنے دیں۔' },
      { label: 'سینہ اور دل',      script: 'سینے پر توجہ دیں۔ ہر سانس سے پسلیاں پھیلتی ہیں۔ ہر سانس چھوڑتے وقت جو بوجھ ہے اسے چھوڑ دیں۔' },
      { label: 'بازو اور ہاتھ',    script: 'بازوؤں اور ہاتھوں پر آئیں۔ انگلیوں کی گرفت ڈھیلی کریں۔ ہاتھ کھلے رکھیں، پوری طرح آرام میں۔' },
      { label: 'پیٹ',               script: 'پیٹ پر توجہ دیں۔ سانس لیتے وقت پیٹ پھیلنے دیں۔ سانس چھوڑتے وقت گرنے دیں۔ کوئی تناؤ نہیں۔' },
      { label: 'پیر',               script: 'آخر میں، اپنے پیروں پر توجہ دیں۔ انہیں بھاری اور زمین سے جڑا محسوس کریں۔ پیروں کی انگلیاں ہلائیں۔ آپ یہاں، ابھی ہیں۔' },
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
  hi: {
    intro: 'चलिए शुरू करते हैं। धीरे सांस लें, और अपने आसपास की दुनिया को महसूस करने के लिए तैयार हो जाएं।',
    steps: [
      { sense: '5 चीजें जो आप देखें',    prompt: 'चारों ओर देखें और 5 चीजें बताएं।' },
      { sense: '4 चीजें जो आप महसूस करें', prompt: '4 बनावटें जो आप अभी छू सकते हैं।' },
      { sense: '3 आवाजें जो आप सुनें',    prompt: '3 अलग-अलग आवाजें ध्यान से सुनें।' },
      { sense: '2 खुशबुएं जो आप सूंघें',  prompt: 'आसपास की 2 खुशबुएं पहचानें।' },
      { sense: '1 स्वाद',                 prompt: '1 स्वाद बताएं — या पानी का एक घूंट लें।' },
    ],
    complete: 'आप यहाँ, अभी हैं। महसूस करें शरीर थोड़ा स्थिर है।',
  },
  ur: {
    intro: 'آئیے شروع کرتے ہیں۔ آہستہ سانس لیں، اور اپنے ارد گرد کی دنیا کو محسوس کرنے کے لیے تیار ہو جائیں۔',
    steps: [
      { sense: '5 چیزیں جو آپ دیکھیں',    prompt: 'چاروں طرف دیکھیں اور 5 چیزیں بتائیں۔' },
      { sense: '4 چیزیں جو آپ محسوس کریں', prompt: '4 ساختیں جو آپ ابھی چھو سکتے ہیں۔' },
      { sense: '3 آوازیں جو آپ سنیں',     prompt: '3 مختلف آوازیں توجہ سے سنیں۔' },
      { sense: '2 خوشبوئیں جو آپ سونگھیں', prompt: 'آس پاس کی 2 خوشبوئیں پہچانیں۔' },
      { sense: '1 ذائقہ',                  prompt: '1 ذائقہ بتائیں — یا پانی کا ایک گھونٹ لیں۔' },
    ],
    complete: 'آپ یہاں، ابھی ہیں۔ محسوس کریں جسم تھوڑا مستحکم ہے۔',
  },
  ps: {
    intro: 'آئیے شروع کرتے ہیں۔ آہستہ سانس لیں، اور اپنے ارد گرد کی دنیا کو محسوس کرنے کے لیے تیار ہو جائیں۔',
    steps: [
      { sense: '5 چیزیں جو آپ دیکھیں',    prompt: 'چاروں طرف دیکھیں اور 5 چیزیں بتائیں۔' },
      { sense: '4 چیزیں جو آپ محسوس کریں', prompt: '4 ساختیں جو آپ ابھی چھو سکتے ہیں۔' },
      { sense: '3 آوازیں جو آپ سنیں',     prompt: '3 مختلف آوازیں توجہ سے سنیں۔' },
      { sense: '2 خوشبوئیں جو آپ سونگھیں', prompt: 'آس پاس کی 2 خوشبوئیں پہچانیں۔' },
      { sense: '1 ذائقہ',                  prompt: '1 ذائقہ بتائیں — یا پانی کا ایک گھونٹ لیں۔' },
    ],
    complete: 'آپ یہاں، ابھی ہیں۔ محسوس کریں جسم تھوڑا مستحکم ہے۔',
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
  hi: {
    squeeze: 'भींचें',
    release: 'छोड़ें',
    releaseCue: 'अब सब कुछ पूरी तरह ढीला छोड़ दें…',
    complete: 'पूरे शरीर का तनाव मुक्त। धीरे सांस लें। अंतर महसूस करें।',
    zones: [
      { label: 'हाथ और मुट्ठी',  cue: 'मुट्ठी भींचें… 5 सेकंड रोकें…' },
      { label: 'कंधे',           cue: 'कंधे कानों तक उठाएं… रोकें…' },
      { label: 'जबड़ा और चेहरा', cue: 'जबड़ा हल्के से भींचें… तनाव महसूस करें…' },
      { label: 'पेट',            cue: 'पेट की मांसपेशियां कसें… रोकें…' },
      { label: 'पैर',            cue: 'पैरों को मजबूती से दबाएं… रोकें…' },
      { label: 'पैर की उंगलियां', cue: 'पैरों की उंगलियां अंदर मोड़ें… भींचें…' },
    ],
  },
  ur: {
    squeeze: 'بھینچیں',
    release: 'چھوڑیں',
    releaseCue: 'اب سب کچھ مکمل طور پر ڈھیلا چھوڑ دیں…',
    complete: 'پورے جسم کا تناؤ ختم۔ آہستہ سانس لیں۔ فرق محسوس کریں۔',
    zones: [
      { label: 'ہاتھ اور مٹھی',   cue: 'مٹھی بھینچیں… 5 سیکنڈ روکیں…' },
      { label: 'کندھے',           cue: 'کندھے کانوں تک اٹھائیں… روکیں…' },
      { label: 'جبڑا اور چہرہ',   cue: 'جبڑا ہلکے سے بھینچیں… تناؤ محسوس کریں…' },
      { label: 'پیٹ',             cue: 'پیٹ کے عضلات کسیں… روکیں…' },
      { label: 'ٹانگیں',          cue: 'ٹانگوں کو مضبوطی سے دبائیں… روکیں…' },
      { label: 'پیر کی انگلیاں',  cue: 'پیر کی انگلیاں اندر موڑیں… بھینچیں…' },
    ],
  },
  ps: {
    squeeze: 'بھینچیں',
    release: 'چھوڑیں',
    releaseCue: 'اب سب کچھ مکمل طور پر ڈھیلا چھوڑ دیں…',
    complete: 'پورے جسم کا تناؤ ختم۔ آہستہ سانس لیں۔ فرق محسوس کریں۔',
    zones: [
      { label: 'ہاتھ اور مٹھی',   cue: 'مٹھی بھینچیں… 5 سیکنڈ روکیں…' },
      { label: 'کندھے',           cue: 'کندھے کانوں تک اٹھائیں… روکیں…' },
      { label: 'جبڑا اور چہرہ',   cue: 'جبڑا ہلکے سے بھینچیں… تناؤ محسوس کریں…' },
      { label: 'پیٹ',             cue: 'پیٹ کے عضلات کسیں… روکیں…' },
      { label: 'ٹانگیں',          cue: 'ٹانگوں کو مضبوطی سے دبائیں… روکیں…' },
      { label: 'پیر کی انگلیاں',  cue: 'پیر کی انگلیاں اندر موڑیں… بھینچیں…' },
    ],
  },
};
