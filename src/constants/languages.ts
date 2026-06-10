export type LangCode = 'en' | 'hi' | 'ur' | 'ps';

export interface LangOption {
  code: LangCode;
  label: string;   // native script
  labelEn: string; // English
  ttsLang: string; // BCP-47 for expo-speech
  rtl: boolean;
  flag: string;
}

export const LANGUAGES: LangOption[] = [
  { code: 'en', label: 'English', labelEn: 'English', ttsLang: 'en-US', rtl: false, flag: '🇺🇸' },
  { code: 'hi', label: 'हिंदी',    labelEn: 'Hindi',   ttsLang: 'hi-IN', rtl: false, flag: '🇮🇳' },
  { code: 'ur', label: 'اردو',     labelEn: 'Urdu',    ttsLang: 'ur-PK', rtl: true,  flag: '🇵🇰' },
  { code: 'ps', label: 'پښتو',     labelEn: 'Pashto',  ttsLang: 'ur-PK', rtl: true,  flag: '🇦🇫' },
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
      'Shift your focus between near and far when the display changes. This trains your ciliary muscle and prevents screen fatigue.',
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
      'Excellent. All five eye movement patterns complete. Your eye muscles are fully exercised.',
    breatheIn:    'Breathe in slowly',
    holdBreath:   'Hold',
    breatheOut:   'Breathe out. Let it all go',
    holdEmpty:    'Hold empty',
    boxBreathIntro: 'Starting box breathing. Follow the circle.',
    breatheSettleIntro:
      'Find a comfortable position. Relax your shoulders, and let your breathing settle.',
    bodyScanIntro:
      'Beginning body scan. Find a comfortable position and close your eyes.',
    cvsIntro:
      'Starting your CVS daily protocol. This session will guide your eyes through six therapeutic steps.',
    sessionComplete: 'Session complete. Great work today.',
    newRecord: 'New personal record. Outstanding.',
    wellDone:  'Well done.',
  },

  hi: {
    saccadeIntro:
      'चमकते बिंदु को देखें और जल्दी से टैप करें। सिर स्थिर रखें, केवल आँखें हिलाएं।',
    focusIntro:
      'जब प्रदर्शन बदले तो ध्यान बदलें। यह आँखों की सिलिअरी मांसपेशी को प्रशिक्षित करता है।',
    focusNear: 'पास के पाठ पर ध्यान दें। स्पष्ट रूप से पढ़ें।',
    focusFar:  'अब दूर देखें। आँखें पूरी तरह आराम दें।',
    radarIntro:
      'केंद्र क्रॉस पर नज़र रखें। परिधि में चमक दिखेगी। आँखें हिलाए बिना सही दिशा टैप करें।',
    blinkIntro:
      'पूरी पलक झपकाने के लिए दबाएं और होल्ड करें। एक आदर्श पलक 150 से 500 मिलीसेकंड तक चलती है।',
    blinkCue: 'अभी पलक झपकाएं।',
    rotatorIntro:
      'केवल आँखों से चलते बिंदु का अनुसरण करें। सिर बिल्कुल स्थिर रखें।',
    rotatorLeftRight: 'बाएं और दाएं। किनारों तक जाएं। सिर स्थिर रखें।',
    rotatorUpDown:    'ऊपर और नीचे। सुचारू और स्थिर।',
    rotatorClockwise: 'दक्षिणावर्त गोले। धीरे और सुचारू।',
    rotatorCounter:   'अब वामावर्त। गति सुचारू रखें।',
    rotatorFigure8:   'अनंत चिन्ह का अनुसरण करें। स्वाभाविक गति।',
    rotatorDone:      'उत्कृष्ट! पाँचों नेत्र गति पैटर्न पूर्ण। आपकी आँखें पूरी तरह व्यायाम हो गईं।',
    breatheIn:    'धीरे सांस लें',
    holdBreath:   'रोकें',
    breatheOut:   'सांस छोड़ें। सब जाने दें',
    holdEmpty:    'खाली रोकें',
    boxBreathIntro: 'बॉक्स ब्रीदिंग शुरू। वृत्त का अनुसरण करें।',
    breatheSettleIntro:
      'आरामदायक स्थिति में बैठें। अपने कंधों को ढीला छोड़ें और सांस को सहज होने दें।',
    bodyScanIntro:
      'बॉडी स्कैन शुरू। आरामदायक स्थिति में बैठें और आँखें बंद करें।',
    cvsIntro:
      'आपका सीवीएस दैनिक प्रोटोकॉल शुरू। यह सत्र आपकी आँखों को छह चिकित्सीय चरणों से गुज़रेगा।',
    sessionComplete: 'सत्र पूरा। आज बहुत अच्छा काम।',
    newRecord: 'नया व्यक्तिगत रिकॉर्ड। असाधारण।',
    wellDone:  'शाबाश।',
  },

  ur: {
    saccadeIntro:
      'چمکتے نقطے کو دیکھیں اور فوری ٹیپ کریں۔ سر ثابت رکھیں، صرف آنکھیں حرکت کریں۔',
    focusIntro:
      'جب ڈسپلے بدلے تو توجہ بدلیں۔ یہ آنکھوں کے عضلات کو مضبوط کرتا ہے۔',
    focusNear: 'قریبی متن پر توجہ دیں۔ واضح طور پر پڑھیں۔',
    focusFar:  'اب دور دیکھیں۔ آنکھیں مکمل طور پر آرام دیں۔',
    radarIntro:
      'مرکزی نشان پر نظریں جمائیں۔ کنارے میں چمک آئے گی۔ آنکھیں ہلائے بغیر سمت ٹیپ کریں۔',
    blinkIntro:
      'مکمل پلک جھپکانے کے لیے دبائیں اور روکیں۔ ایک کامل پلک 150 سے 500 ملی سیکنڈ تک چلتی ہے۔',
    blinkCue: 'ابھی پلک جھپکائیں۔',
    rotatorIntro:
      'صرف آنکھوں سے حرکت کرتے نقطے کی پیروی کریں۔ سر بالکل ساکن رکھیں۔',
    rotatorLeftRight: 'بائیں اور دائیں۔ کناروں تک۔ سر ساکن رکھیں۔',
    rotatorUpDown:    'اوپر اور نیچے۔ نرم اور مستحکم۔',
    rotatorClockwise: 'گھڑی کی سمت دائرے۔ آہستہ اور ہموار۔',
    rotatorCounter:   'اب الٹی سمت۔ حرکت ہموار رکھیں۔',
    rotatorFigure8:   'لامتناہی علامت کا پیچھا کریں۔ فطری حرکت۔',
    rotatorDone:      'شاندار! پانچوں آنکھوں کی حرکت کے نمونے مکمل۔ آپ کی آنکھیں پوری طرح ورزش کر چکی ہیں۔',
    breatheIn:    'آہستہ سانس لیں',
    holdBreath:   'روکیں',
    breatheOut:   'سانس چھوڑیں۔ سب جانے دیں',
    holdEmpty:    'خالی روکیں',
    boxBreathIntro: 'باکس بریدھنگ شروع۔ دائرے کی پیروی کریں۔',
    breatheSettleIntro:
      'آرام دہ پوزیشن میں بیٹھیں۔ اپنے کندھے ڈھیلے چھوڑیں اور سانس کو سکون سے چلنے دیں۔',
    bodyScanIntro:
      'باڈی اسکین شروع۔ آرام دہ پوزیشن لیں اور آنکھیں بند کریں۔',
    cvsIntro:
      'آپ کا سی وی ایس روزانہ پروٹوکول شروع۔ یہ سیشن آپ کی آنکھوں کو چھ علاجی مراحل سے گزارے گا۔',
    sessionComplete: 'سیشن مکمل۔ آج بہت اچھا کام۔',
    newRecord: 'نیا ذاتی ریکارڈ۔ غیر معمولی۔',
    wellDone:  'شاباش۔',
  },

  ps: {
    saccadeIntro:
      'د رڼا ټکي وګورئ او ژر ژر ټک وکړئ۔ سر ساکن وساتئ، یوازې سترګې حرکت کوي۔',
    focusIntro:
      'کله چې ډسپلې بدله شي توجه بدله کړئ۔ دا ستاسو د سترګو عضلات روزي۔',
    focusNear: 'نږدې متن ته توجه کوئ۔',
    focusFar:  'اوس لرې وګورئ۔ سترګې آرامول کړئ۔',
    radarIntro:
      'د مرکزي نښه ته سترګې وتړئ۔ خوا کې رڼا به راښکاره شي۔ پرته له سترګو خوځولو لور ټک وکړئ۔',
    blinkIntro:
      'د سترګو بشپړ وهلو لپاره ونیسئ او روکیږئ۔',
    blinkCue: 'اوس سترګه ووهئ۔',
    rotatorIntro:
      'یوازې د سترګو سره د حرکت کوونکي ټکي تعقیب کړئ۔ سر بالکل ساکن وساتئ۔',
    rotatorLeftRight: 'کیڼ او ښي۔ تر کنارو۔ سر ساکن وساتئ۔',
    rotatorUpDown:    'پورته او لاندې۔ نرم او مستحکم۔',
    rotatorClockwise: 'د ساعت پر لور دایروي حرکت۔ ورو او هموار۔',
    rotatorCounter:   'اوس پر عکس۔ هموار حرکت وساتئ۔',
    rotatorFigure8:   'د لامتناهي علامت تعقیب کړئ۔',
    rotatorDone:      'عالي! پنځه ګونه د سترګو د حرکت نمونې بشپړې۔',
    breatheIn:    'ورو ساه واخلئ',
    holdBreath:   'ودریږئ',
    breatheOut:   'ساه وباسئ۔ هر شی پریږدئ',
    holdEmpty:    'خالي ودریږئ',
    boxBreathIntro: 'باکس سا اخیستل پیل شو۔',
    breatheSettleIntro:
      'په آرامه حالت کې کینئ۔ اوږې مې آرامولو او ساه آرامه پریږدئ۔',
    bodyScanIntro:
      'د بدن سکین پیل۔ آرامه حالت کې کینئ۔',
    cvsIntro:
      'ستاسو CVS ورځني پروتوکول پیل شو۔',
    sessionComplete: 'سیشن بشپړ۔ نن ورځ ډیره ښه کار۔',
    newRecord: 'نوی شخصي ریکارډ۔ بې نظیره۔',
    wellDone:  'ښه کار۔',
  },
};
