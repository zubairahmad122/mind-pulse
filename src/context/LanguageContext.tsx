import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, VOICE_SCRIPTS, type LangCode, type VoiceScript } from '@/constants/languages';
import { TRANSLATIONS, type Translations } from '@/constants/translations';

interface LanguageCtx {
  langCode: LangCode;
  rtl: boolean;
  scripts: VoiceScript;
  t: Translations;
  setLang: (code: LangCode) => void;
}

const STORAGE_KEY = '@mindpulse/language';

export const LanguageContext = createContext<LanguageCtx>({
  langCode: 'en',
  rtl: false,
  scripts: VOICE_SCRIPTS['en'],
  t: TRANSLATIONS['en'],
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [langCode, setLangCode] = useState<LangCode>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'en' || v === 'ur') {
        setLangCode(v);
      } else if (v === 'hi' || v === 'ps') {
        // Removed languages: migrate a previously saved Hindi/Pashto to Urdu.
        setLangCode('ur');
        void AsyncStorage.setItem(STORAGE_KEY, 'ur');
      }
    });
  }, []);

  const setLang = useCallback((code: LangCode) => {
    setLangCode(code);
    void AsyncStorage.setItem(STORAGE_KEY, code);
  }, []);

  const lang = LANGUAGES.find(l => l.code === langCode) ?? LANGUAGES[0];

  const value = useMemo(() => ({
    langCode,
    rtl: lang.rtl,
    scripts: VOICE_SCRIPTS[langCode],
    t: TRANSLATIONS[langCode],
    setLang,
  }), [langCode, lang.rtl, setLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { t } = useContext(LanguageContext);
  return t;
}
