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

// ─── CALM FLOW — 8:53 (533 seconds) ────────────────────────────────────────
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

export const CALM_FLOW_HI: SessionVoiceScript = {
  sessionId: 'calm-flow',
  language: 'hi',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'स्वागत है। यहाँ किसी लय का पालन करने की ज़रूरत नहीं है। बस अपनी सांस को अपनी प्राकृतिक गति खोजने दें। आप पूरी तरह सुरक्षित हैं।',
      voiceSpeed: 0.80, pauseAfterMs: 25000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 90,
      text: 'अपनी छाती की हल्की उठान और गिरावट को महसूस करें। हर सांस आपको शांति में और गहराई तक ले जा रही है।',
      voiceSpeed: 0.80, pauseAfterMs: 90000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 240,
      text: 'आप बहुत खूबसूरती से कर रहे हैं। और कहीं जाने की ज़रूरत नहीं है।',
      voiceSpeed: 0.80, pauseAfterMs: 100000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 400,
      text: 'अपने कंधों को ढीला छोड़ें। अपने शरीर का भार महसूस करें जो आपके नीचे पूरी तरह सहारा हुआ है।',
      voiceSpeed: 0.80, pauseAfterMs: 80000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 480,
      text: 'बस कुछ पल में, आप धीरे-धीरे वापस आएंगे। लेकिन अभी के लिए, यहीं रहें। आपने कुछ खूबसूरत बनाया है।',
      voiceSpeed: 0.80, pauseAfterMs: 40000,
    },
  ],
};

export const CALM_FLOW_UR: SessionVoiceScript = {
  sessionId: 'calm-flow',
  language: 'ur',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'خوش آمدید۔ یہاں کسی تال کی پیروی کرنے کی ضرورت نہیں۔ بس اپنی سانس کو اپنی فطری رفتار تلاش کرنے دیں۔ آپ مکمل محفوظ ہیں۔',
      voiceSpeed: 0.80, pauseAfterMs: 25000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 90,
      text: 'اپنے سینے کی ہلکی اٹھان اور گراوٹ کو محسوس کریں۔ ہر سانس آپ کو سکون میں گہرائی لے جا رہی ہے۔',
      voiceSpeed: 0.80, pauseAfterMs: 90000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 240,
      text: 'آپ بہت خوبصورتی سے کر رہے ہیں۔ اور کہیں جانے کی ضرورت نہیں ہے۔',
      voiceSpeed: 0.80, pauseAfterMs: 100000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 400,
      text: 'اپنے کندھوں کو ڈھیلا چھوڑیں۔ اپنے جسم کا وزن محسوس کریں جو آپ کے نیچے پوری طرح سہارا ہوا ہے۔',
      voiceSpeed: 0.80, pauseAfterMs: 80000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 480,
      text: 'بس کچھ پل میں، آپ آہستہ واپس آئیں گے۔ لیکن ابھی کے لیے، یہیں رہیں۔ آپ نے کچھ خوبصورت بنایا ہے۔',
      voiceSpeed: 0.80, pauseAfterMs: 40000,
    },
  ],
};

export const CALM_FLOW_PS: SessionVoiceScript = {
  sessionId: 'calm-flow',
  language: 'ps',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'خوش آمدید۔ یہاں کسی تال کی پیروی کرنے کی ضرورت نہیں۔ بس اپنی سانس کو اپنی فطری رفتار تلاش کرنے دیں۔ آپ مکمل محفوظ ہیں۔',
      voiceSpeed: 0.80, pauseAfterMs: 25000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 90,
      text: 'اپنے سینے کی ہلکی اٹھان اور گراوٹ کو محسوس کریں۔ ہر سانس آپ کو سکون میں گہرائی لے جا رہی ہے۔',
      voiceSpeed: 0.80, pauseAfterMs: 90000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 240,
      text: 'تاسو ډیر ښه کوئ راځئ۔ او بل ځای ته د تګ ضرورت نشته۔',
      voiceSpeed: 0.80, pauseAfterMs: 100000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 400,
      text: 'خپل اوږې نرۍ کړئ۔ د خپل بدن وزن احساس کړئ چې ستاسو لاندې په بشپړ ډول ملاتړ شوی۔',
      voiceSpeed: 0.80, pauseAfterMs: 80000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 480,
      text: 'یو څو پلونو کې، تاسو به په نرمۍ سره بیرته راشئ۔ مګر اوس لپاره، دلته پاتې شئ۔ تاسو څه ښکلی جوړ کړی دی۔',
      voiceSpeed: 0.80, pauseAfterMs: 40000,
    },
  ],
};

// ─── BOX BREATHING — 5:20 (320 seconds) ────────────────────────────────────────
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

export const BOX_BREATHING_HI: SessionVoiceScript = {
  sessionId: 'box-breathing',
  language: 'hi',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'यह बॉक्स ब्रीदिंग है। यह सरल, स्थिर और शक्तिशाली है। हर चक्र में आकार का अनुसरण करें।',
      voiceSpeed: 0.80, pauseAfterMs: 22000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 40,
      text: 'नाक से धीरे-धीरे सांस लें... सांस रोकें... अब पूरी तरह छोड़ें... और आराम करें।',
      voiceSpeed: 0.80, pauseAfterMs: 70000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 150,
      text: 'बहुत खूब। आपका तंत्रिका तंत्र प्रतिक्रिया दे रहा है। आप हर चक्र के साथ शांत हो रहे हैं।',
      voiceSpeed: 0.80, pauseAfterMs: 80000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 240,
      text: 'अगर आपका मन भटके, तो कोई बात नहीं। बस अपना ध्यान वापस आकार पर लाएं, वापस सांस पर।',
      voiceSpeed: 0.80, pauseAfterMs: 60000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 295,
      text: 'अब कुछ और चक्र। महसूस करें आप कितने स्थिर हो गए हैं।',
      voiceSpeed: 0.80, pauseAfterMs: 20000,
    },
  ],
};

export const BOX_BREATHING_UR: SessionVoiceScript = {
  sessionId: 'box-breathing',
  language: 'ur',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'یہ باکس بریدھنگ ہے۔ یہ سادہ، مستحکم اور طاقتور ہے۔ ہر چکر میں شکل کی پیروی کریں۔',
      voiceSpeed: 0.80, pauseAfterMs: 22000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 40,
      text: 'ناک سے آہستہ سانس لیں... سانس روکیں... اب مکمل چھوڑیں... اور آرام کریں۔',
      voiceSpeed: 0.80, pauseAfterMs: 70000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 150,
      text: 'بہت خوب۔ آپ کا اعصابی نظام جواب دے رہا ہے۔ آپ ہر چکر کے ساتھ پرسکون ہو رہے ہیں۔',
      voiceSpeed: 0.80, pauseAfterMs: 80000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 240,
      text: 'اگر آپ کا ذہن بھٹکے، تو کوئی بات نہیں۔ بس اپنی توجہ واپس شکل پر لائیں، واپس سانس پر۔',
      voiceSpeed: 0.80, pauseAfterMs: 60000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 295,
      text: 'اب کچھ اور چکر۔ محسوس کریں آپ کتنے مستحکم ہو گئے ہیں۔',
      voiceSpeed: 0.80, pauseAfterMs: 20000,
    },
  ],
};

export const BOX_BREATHING_PS: SessionVoiceScript = {
  sessionId: 'box-breathing',
  language: 'ps',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'دا باکس بریدھنگ دی۔ دا ساده، مستحکم او پیاوړی دی۔ هر چکر کې د شکل پیروي وکړئ۔',
      voiceSpeed: 0.80, pauseAfterMs: 22000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 40,
      text: 'پوزې څخه ورو ساه واخلئ... ساه ودروئ... اوس په بشپړ ډول پریږدئ... او آرام وکړئ۔',
      voiceSpeed: 0.80, pauseAfterMs: 70000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 150,
      text: 'ډیر ښه۔ ستاسو عصبي سیستم ځواب ورکوي۔ تاسو هر چکر سره ډیر پرسکون کیږئ۔',
      voiceSpeed: 0.80, pauseAfterMs: 80000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 240,
      text: 'که ستاسو ذهن وګرځي، نو خبره نشته۔ بس خپل پام بیرته شکل ته راوړئ، بیرته ساه ته۔',
      voiceSpeed: 0.80, pauseAfterMs: 60000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 295,
      text: 'اوس یو څو نور چکرونه۔ احساس کړئ تاسو څومره مستحکم شوي یاست۔',
      voiceSpeed: 0.80, pauseAfterMs: 20000,
    },
  ],
};

// ─── RESET WAVE — 6:15 (375 seconds) ───────────────────────────────────────────
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

export const RESET_WAVE_HI: SessionVoiceScript = {
  sessionId: 'reset-wave',
  language: 'hi',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'यह रीसेट वेव है। हम धीरे-धीरे आपकी ऊर्जा जगा रहे हैं। अब थोड़ी गहरी सांस लें, इरादे से।',
      voiceSpeed: 0.80, pauseAfterMs: 28000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 60,
      text: 'अपनी इंद्रियों को जागृत महसूस करें। हर गहरी सांस के साथ शरीर में जीवंतता लौटती हुई देखें।',
      voiceSpeed: 0.80, pauseAfterMs: 100000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 210,
      text: 'आप आधे रास्ते पर हैं। आपकी ऊर्जा बढ़ रही है, स्पष्ट और अधिक सतर्क हो रही है।',
      voiceSpeed: 0.80, pauseAfterMs: 90000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 310,
      text: 'अपने मन में ताजगी महसूस करें। आपका शरीर हिलने-डुलने के लिए तैयार है।',
      voiceSpeed: 0.80, pauseAfterMs: 50000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 350,
      text: 'कुछ और सांसें। आप तरोताज़ा, पुनर्स्थापित और तैयार हैं।',
      voiceSpeed: 0.80, pauseAfterMs: 20000,
    },
  ],
};

export const RESET_WAVE_UR: SessionVoiceScript = {
  sessionId: 'reset-wave',
  language: 'ur',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'یہ ری سیٹ ویو ہے۔ ہم آہستہ سے آپ کی توانائی جگا رہے ہیں۔ اب تھوڑی گہری سانس لیں، ارادے سے۔',
      voiceSpeed: 0.80, pauseAfterMs: 28000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 60,
      text: 'اپنے حواس کو جاگتے محسوس کریں۔ ہر گہری سانس کے ساتھ جسم میں زندگی لوٹتی دیکھیں۔',
      voiceSpeed: 0.80, pauseAfterMs: 100000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 210,
      text: 'آپ آدھے راستے پر ہیں۔ آپ کی توانائی بڑھ رہی ہے، صاف اور زیادہ چوکس۔',
      voiceSpeed: 0.80, pauseAfterMs: 90000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 310,
      text: 'اپنے ذہن میں تازگی محسوس کریں۔ آپ کا جسم حرکت کے لیے تیار ہے۔',
      voiceSpeed: 0.80, pauseAfterMs: 50000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 350,
      text: 'کچھ اور سانسیں۔ آپ تروتازہ، بحال اور تیار ہیں۔',
      voiceSpeed: 0.80, pauseAfterMs: 20000,
    },
  ],
};

export const RESET_WAVE_PS: SessionVoiceScript = {
  sessionId: 'reset-wave',
  language: 'ps',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 2,
      text: 'دا ری سیٹ ویو دی۔ موږ نرمۍ سره ستاسو انرژي راویښ کوو۔ اوس یو څه ژوره ساه واخلئ، ارادې سره۔',
      voiceSpeed: 0.80, pauseAfterMs: 28000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 60,
      text: 'خپل حواس راویښ احساس کړئ۔ هرې ژورې ساه سره په بدن کې ژوند بیرته راتګ وګورئ۔',
      voiceSpeed: 0.80, pauseAfterMs: 100000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 210,
      text: 'تاسو نیمه لاره یاست۔ ستاسو انرژي لوړیږي، پاکه او ډیر چوکس کیږي۔',
      voiceSpeed: 0.80, pauseAfterMs: 90000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 310,
      text: 'په خپل ذهن کې تازه والی احساس کړئ۔ ستاسو بدن حرکت ته تیار دی۔',
      voiceSpeed: 0.80, pauseAfterMs: 50000,
    },
    {
      id: 'closing-cue', type: 'closing', startSecond: 350,
      text: 'یو څو نورې ساهګانې۔ تاسو تازه، بحال او تیار یاست۔',
      voiceSpeed: 0.80, pauseAfterMs: 20000,
    },
  ],
};

// ─── SLEEP DROP — 10:48 (648 seconds) ───────────────────────────────────────────
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

export const SLEEP_DROP_HI: SessionVoiceScript = {
  sessionId: 'sleep-drop',
  language: 'hi',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 3,
      text: 'यह स्लीप ड्रॉप है। हम सब कुछ धीमा कर रहे हैं। आपका एकमात्र काम है अपने शरीर को आराम की ओर बहने देना।',
      voiceSpeed: 0.75, pauseAfterMs: 35000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 100,
      text: 'हर सांस छोड़ने के साथ, दिन को जाने दें। जो कुछ हुआ, उसे छोड़ दें। आप अब सुरक्षित हैं।',
      voiceSpeed: 0.75, pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 280,
      text: 'अपने शरीर का भार सहारे में डूबता हुआ महसूस करें। वह भारीपन एक उपहार है। उसे आपको नीचे ले जाने दें।',
      voiceSpeed: 0.75, pauseAfterMs: 130000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 450,
      text: 'आपका मन अब आराम कर सकता है। ऐसा कुछ नहीं जिस पर ध्यान देने की ज़रूरत हो। सब कुछ संभाल लिया गया है।',
      voiceSpeed: 0.75, pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-2', type: 'affirmation', startSecond: 580,
      text: 'आप बह रहे हैं। यह एकदम सही है। नींद धीरे-धीरे, स्वाभाविक रूप से आ रही है, जब आप तैयार हों।',
      voiceSpeed: 0.75, pauseAfterMs: 60000,
    },
  ],
};

export const SLEEP_DROP_UR: SessionVoiceScript = {
  sessionId: 'sleep-drop',
  language: 'ur',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 3,
      text: 'یہ سلیپ ڈراپ ہے۔ ہم سب کچھ سست کر رہے ہیں۔ آپ کا واحد کام ہے اپنے جسم کو آرام کی طرف بہنے دینا۔',
      voiceSpeed: 0.75, pauseAfterMs: 35000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 100,
      text: 'ہر سانس چھوڑنے کے ساتھ، دن کو جانے دیں۔ جو کچھ ہوا، اسے چھوڑ دیں۔ آپ اب محفوظ ہیں۔',
      voiceSpeed: 0.75, pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 280,
      text: 'اپنے جسم کا وزن سہارے میں ڈوبتا محسوس کریں۔ وہ بھاری پن ایک تحفہ ہے۔ اسے آپ کو نیچے لے جانے دیں۔',
      voiceSpeed: 0.75, pauseAfterMs: 130000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 450,
      text: 'آپ کا دماغ اب آرام کر سکتا ہے۔ ایسی کوئی چیز نہیں جس پر توجہ دینے کی ضرورت ہو۔ سب کچھ سنبھال لیا گیا ہے۔',
      voiceSpeed: 0.75, pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-2', type: 'affirmation', startSecond: 580,
      text: 'آپ بہہ رہے ہیں۔ یہ بالکل صحیح ہے۔ نیند آہستہ، قدرتی طور پر آ رہی ہے، جب آپ تیار ہوں۔',
      voiceSpeed: 0.75, pauseAfterMs: 60000,
    },
  ],
};

export const SLEEP_DROP_PS: SessionVoiceScript = {
  sessionId: 'sleep-drop',
  language: 'ps',
  segments: [
    {
      id: 'intro', type: 'intro', startSecond: 3,
      text: 'دا سلیپ ڈراپ دی۔ موږ هرڅه ورو کوو۔ ستاسو یوازینی کار دی خپل بدن آرام ته بهیدل پریږدئ۔',
      voiceSpeed: 0.75, pauseAfterMs: 35000,
    },
    {
      id: 'guidance-1', type: 'guidance', startSecond: 100,
      text: 'هرې ساه پریښودلو سره، ورځ پریږدئ۔ څه چې پیښ شول، هغه پریږدئ۔ تاسو اوس خوندي یاست۔',
      voiceSpeed: 0.75, pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-1', type: 'affirmation', startSecond: 280,
      text: 'د خپل بدن وزن په ملاتړ کې ډوبیدل احساس کړئ۔ هغه دروندوالی یوه ډالۍ ده۔ هغه تاسو لاندې بوځي۔',
      voiceSpeed: 0.75, pauseAfterMs: 130000,
    },
    {
      id: 'guidance-2', type: 'guidance', startSecond: 450,
      text: 'ستاسو دماغ اوس آرام کولی شي۔ داسې هیڅ شی نشته چې پاملرنې ته اړتیا ولري۔ هرڅه سمبال شوي دي۔',
      voiceSpeed: 0.75, pauseAfterMs: 120000,
    },
    {
      id: 'affirmation-2', type: 'affirmation', startSecond: 580,
      text: 'تاسو بهیږئ۔ دا بالکل سم دی۔ خوب په نرمۍ، طبیعي توګه راځي، کله چې تاسو تیار شئ۔',
      voiceSpeed: 0.75, pauseAfterMs: 60000,
    },
  ],
};

// Map of all sessions with multi-language support
const SESSION_SCRIPTS_BY_LANG: Record<string, Record<'en' | 'hi' | 'ur' | 'ps', SessionVoiceScript>> = {
  'calm-flow': {
    en: CALM_FLOW_EN,
    hi: CALM_FLOW_HI,
    ur: CALM_FLOW_UR,
    ps: CALM_FLOW_PS,
  },
  'box-breathing': {
    en: BOX_BREATHING_EN,
    hi: BOX_BREATHING_HI,
    ur: BOX_BREATHING_UR,
    ps: BOX_BREATHING_PS,
  },
  'reset-wave': {
    en: RESET_WAVE_EN,
    hi: RESET_WAVE_HI,
    ur: RESET_WAVE_UR,
    ps: RESET_WAVE_PS,
  },
  'sleep-drop': {
    en: SLEEP_DROP_EN,
    hi: SLEEP_DROP_HI,
    ur: SLEEP_DROP_UR,
    ps: SLEEP_DROP_PS,
  },
};

export function getSessionVoiceScript(
  sessionId: string,
  language: 'en' | 'hi' | 'ur' | 'ps' = 'en',
): SessionVoiceScript | null {
  // Get the script for the requested language
  const langScripts = SESSION_SCRIPTS_BY_LANG[sessionId];
  if (!langScripts) return null;

  return langScripts[language] || langScripts['en']; // Fallback to English if language not available
}
