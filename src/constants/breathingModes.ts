import type { LucideIcon } from 'lucide-react-native';
import { Radio, StopCircle, Moon, Droplets } from 'lucide-react-native';
import type { BreathingMusicId } from './breathingMusic';

export type BreathModeId = 'calm-flow' | 'box-release' | 'sleep-drop' | 'reset-wave';

export interface VoiceEntry {
  delayMs: number;    // ms from session start
  en: string;
  hi: string;
  ur: string;
}

export interface BreathMode {
  id:          BreathModeId;
  title:       string;
  tagline:     string;       // one-line human description on card
  description: string;       // longer copy on card
  intensity:   1 | 2 | 3;   // 1 = softest
  durationMin: number;
  color:       string;       // primary accent
  bgFrom:      string;       // gradient top
  bgTo:        string;       // gradient bottom
  icon:        LucideIcon;
  ambientId:   BreathingMusicId;
  voice:       VoiceEntry[];
}

export const BREATH_MODES: BreathMode[] = [
  // ─────────────────────────────────────────────
  {
    id:          'calm-flow',
    title:       'Calm Flow',
    tagline:     'For when the noise won\'t stop.',
    description: 'No rhythm to follow. No rules. Just a soft light and enough space to slow down.',
    intensity:   1,
    durationMin: 5,
    color:       '#7B61FF',
    bgFrom:      '#0D0B2E',
    bgTo:        '#1a1535',
    icon:        Radio,
    ambientId:   'forest',
    voice: [
      {
        delayMs: 4000,
        en: 'You\'re here now.',
        hi: 'आप यहाँ हैं।',
        ur: 'آپ یہاں ہیں۔',
      },
      {
        delayMs: 11000,
        en: 'Nothing needs to happen.',
        hi: 'कुछ नहीं करना है।',
        ur: 'کچھ کرنے کی ضرورت نہیں۔',
      },
      {
        delayMs: 20000,
        en: 'You may notice your breath already slowing on its own.',
        hi: 'आप देख सकते हैं कि सांस अपने आप धीमी हो रही है।',
        ur: 'آپ محسوس کریں گے کہ سانس خود بخود آہستہ ہو رہی ہے۔',
      },
      {
        delayMs: 34000,
        en: 'Let that happen.',
        hi: 'होने दीजिए।',
        ur: 'ہونے دیں۔',
      },
      {
        delayMs: 45000,
        en: 'Nothing to control right now.',
        hi: 'अभी कुछ भी नियंत्रित नहीं करना है।',
        ur: 'ابھی کچھ بھی قابو کرنے کی ضرورت نہیں۔',
      },
      {
        delayMs: 65000,
        en: 'If thoughts arrive, just notice them… and come back to this light.',
        hi: 'अगर विचार आएं, बस उन्हें देखें… और वापस इस रोशनी में आ जाएं।',
        ur: 'اگر خیالات آئیں، بس انہیں دیکھیں… اور واپس اس روشنی میں آ جائیں۔',
      },
      {
        delayMs: 95000,
        en: 'Something is already shifting.',
        hi: 'कुछ पहले से बदल रहा है।',
        ur: 'کچھ پہلے سے بدل رہا ہے۔',
      },
      {
        delayMs: 145000,
        en: 'Stay as long as you need.',
        hi: 'जितनी देर चाहें रहिए।',
        ur: 'جتنی دیر چاہیں رہیں۔',
      },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id:          'box-release',
    title:       'Box Release',
    tagline:     'A gentle rhythm to hold onto.',
    description: 'The 4-4-4-4 pattern — not as a command, but as a companion. Follow only if you wish.',
    intensity:   2,
    durationMin: 5,
    color:       '#B39DDB',
    bgFrom:      '#0D0B2E',
    bgTo:        '#130F35',
    icon:        StopCircle,
    ambientId:   'forest',
    voice: [
      {
        delayMs: 5000,
        en: 'There\'s a gentle rhythm here.',
        hi: 'यहाँ एक कोमल लय है।',
        ur: 'یہاں ایک نرم تال ہے۔',
      },
      {
        delayMs: 13000,
        en: 'You don\'t need to match it perfectly. Just let your body find it naturally.',
        hi: 'इसे बिल्कुल सही नहीं मिलाना है। बस शरीर को अपने आप खोजने दें।',
        ur: 'اسے بالکل درست ملانا ضروری نہیں۔ بس جسم کو خود تلاش کرنے دیں۔',
      },
      {
        delayMs: 28000,
        en: 'Notice the light opening.',
        hi: 'रोशनी को खुलते हुए देखें।',
        ur: 'روشنی کو کھلتے ہوئے دیکھیں۔',
      },
      {
        delayMs: 36000,
        en: 'Resting at the top.',
        hi: 'ऊपर विश्राम।',
        ur: 'اوپر آرام۔',
      },
      {
        delayMs: 44000,
        en: 'Softening.',
        hi: 'नरम होते हुए।',
        ur: 'نرم ہوتے ہوئے۔',
      },
      {
        delayMs: 52000,
        en: 'The quiet space between.',
        hi: 'बीच का शांत स्थान।',
        ur: 'درمیان کی خاموش جگہ۔',
      },
      {
        delayMs: 75000,
        en: 'You may feel a warmth behind your eyes. Your shoulders dropping slightly.',
        hi: 'आप आंखों के पीछे गर्माहट महसूस कर सकते हैं। कंधे थोड़े नीचे आते हैं।',
        ur: 'آپ آنکھوں کے پیچھے گرمی محسوس کر سکتے ہیں۔ کندھے تھوڑا نیچے آتے ہیں۔',
      },
      {
        delayMs: 105000,
        en: 'That\'s your nervous system remembering how to rest.',
        hi: 'यह आपका तंत्रिका तंत्र है, जो आराम करना याद कर रहा है।',
        ur: 'یہ آپ کا اعصابی نظام ہے، جو آرام کرنا یاد کر رہا ہے۔',
      },
      {
        delayMs: 160000,
        en: 'You\'re doing beautifully. Keep following the light.',
        hi: 'आप बहुत अच्छा कर रहे हैं। रोशनी का अनुसरण जारी रखें।',
        ur: 'آپ بہت اچھا کر رہے ہیں۔ روشنی کی پیروی جاری رکھیں۔',
      },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id:          'sleep-drop',
    title:       'Sleep Drop',
    tagline:     'For the mind that won\'t let go at night.',
    description: 'Almost no voice. Mostly silence and a slow, warm light. Let it carry you down.',
    intensity:   1,
    durationMin: 8,
    color:       '#C4A265',
    bgFrom:      '#050412',
    bgTo:        '#0A0820',
    icon:        Moon,
    ambientId:   'rain',
    voice: [
      {
        delayMs: 8000,
        en: 'You can rest now.',
        hi: 'अब आप आराम कर सकते हैं।',
        ur: 'اب آپ آرام کر سکتے ہیں۔',
      },
      {
        delayMs: 20000,
        en: 'Everything you were carrying today… can be set down.',
        hi: 'आज जो कुछ भी आप उठाए हुए थे… रख सकते हैं।',
        ur: 'آج جو کچھ بھی آپ اٹھائے ہوئے تھے… رکھ سکتے ہیں۔',
      },
      {
        delayMs: 40000,
        en: 'There is nothing left to figure out tonight.',
        hi: 'आज रात को कुछ भी सुलझाना नहीं है।',
        ur: 'آج رات کو کچھ بھی سلجھانا نہیں ہے۔',
      },
      {
        delayMs: 68000,
        en: 'Your body already knows how to sleep. Let it lead.',
        hi: 'आपका शरीर पहले से जानता है कैसे सोना है। उसे आगे बढ़ने दें।',
        ur: 'آپ کا جسم پہلے سے جانتا ہے سونا کیسے ہے۔ اسے آگے بڑھنے دیں۔',
      },
      {
        delayMs: 108000,
        en: 'Heavier now.',
        hi: 'अब और भारी।',
        ur: 'اب اور بھاری۔',
      },
      {
        delayMs: 118000,
        en: 'Quieter.',
        hi: 'शांत।',
        ur: 'خاموش۔',
      },
      {
        delayMs: 165000,
        en: 'Drifting.',
        hi: 'बहते हुए।',
        ur: 'بہتے ہوئے۔',
      },
      {
        delayMs: 240000,
        en: 'You\'re safe.',
        hi: 'आप सुरक्षित हैं।',
        ur: 'آپ محفوظ ہیں۔',
      },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id:          'reset-wave',
    title:       'Reset Wave',
    tagline:     'Watch the ocean breathe. Yours will follow.',
    description: 'No instruction. Just a wave. Your nervous system will synchronize without you trying.',
    intensity:   2,
    durationMin: 7,
    color:       '#4FC3F7',
    bgFrom:      '#050D1A',
    bgTo:        '#0A1628',
    icon:        Droplets,
    ambientId:   'ocean',
    voice: [
      {
        delayMs: 6000,
        en: 'Watch the wave. That\'s all.',
        hi: 'लहर देखें। बस इतना।',
        ur: 'لہر دیکھیں۔ بس اتنا۔',
      },
      {
        delayMs: 18000,
        en: 'Notice how it rises without effort. Falls without trying.',
        hi: 'देखें यह बिना प्रयास के कैसे उठती है। बिना कोशिश के गिरती है।',
        ur: 'دیکھیں کہ یہ بغیر کوشش کے کیسے اٹھتی ہے۔ بغیر کوشش کے گرتی ہے۔',
      },
      {
        delayMs: 38000,
        en: 'Your breath is doing the same thing right now. Without you.',
        hi: 'आपकी सांस भी अभी यही कर रही है। आपके बिना।',
        ur: 'آپ کی سانس بھی ابھی یہی کر رہی ہے۔ آپ کے بغیر۔',
      },
      {
        delayMs: 60000,
        en: 'The ocean doesn\'t think about rising. It just does.',
        hi: 'समुद्र उठने के बारे में नहीं सोचता। वो बस करता है।',
        ur: 'سمندر اٹھنے کے بارے میں نہیں سوچتا۔ وہ بس کرتا ہے۔',
      },
      {
        delayMs: 85000,
        en: 'Let your body be that. A wave that rises and falls on its own.',
        hi: 'अपने शरीर को वैसा होने दें। एक लहर जो अपने आप उठती और गिरती है।',
        ur: 'اپنے جسم کو ویسا ہونے دیں۔ ایک لہر جو خود اٹھتی اور گرتی ہے۔',
      },
      {
        delayMs: 118000,
        en: 'You may feel it slowing now. Your whole body settling.',
        hi: 'आप महसूस कर सकते हैं यह अब धीमा हो रहा है। पूरा शरीर स्थिर हो रहा है।',
        ur: 'آپ محسوس کر سکتے ہیں یہ اب آہستہ ہو رہا ہے۔ پورا جسم پرسکون ہو رہا ہے۔',
      },
      {
        delayMs: 175000,
        en: 'There\'s something old about this feeling. Safe. Known.',
        hi: 'इस एहसास में कुछ पुराना है। सुरक्षित। जाना पहचाना।',
        ur: 'اس احساس میں کچھ پرانا ہے۔ محفوظ۔ جانا پہچانا۔',
      },
    ],
  },
];

export function getBreathMode(id: BreathModeId): BreathMode {
  return BREATH_MODES.find(m => m.id === id) ?? BREATH_MODES[0];
}
