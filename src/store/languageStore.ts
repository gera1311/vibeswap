import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from '../i18n/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      t: translations.en,
      setLanguage: (lang: Language) => {
        set({
          language: lang,
          t: translations[lang],
        });
      },
    }),
    {
      name: 'language-storage',
    }
  )
);
