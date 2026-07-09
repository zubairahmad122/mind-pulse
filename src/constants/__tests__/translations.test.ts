import { LANGUAGES, VOICE_SCRIPTS } from '../languages';
import { TRANSLATIONS } from '../translations';

// App policy: two languages, and Urdu renders in ROMAN script only —
// Devanagari/Arabic characters on screen were removed deliberately.
describe('language completeness', () => {
  it('offers exactly English and Urdu', () => {
    expect(LANGUAGES.map(l => l.code).sort()).toEqual(['en', 'ur']);
  });

  it('ur translations cover every en key (and nothing extra)', () => {
    expect(Object.keys(TRANSLATIONS.ur).sort()).toEqual(
      Object.keys(TRANSLATIONS.en).sort(),
    );
  });

  it('ur voice scripts cover every en key (and nothing extra)', () => {
    expect(Object.keys(VOICE_SCRIPTS.ur).sort()).toEqual(
      Object.keys(VOICE_SCRIPTS.en).sort(),
    );
  });

  it('contains no Devanagari or Arabic script anywhere (Roman Urdu only)', () => {
    const nonRoman = /[ऀ-ॿ؀-ۿ]/;
    const allText = JSON.stringify(TRANSLATIONS) + JSON.stringify(VOICE_SCRIPTS);
    expect(nonRoman.test(allText)).toBe(false);
  });
});
