import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Lang } from '../types';
import { LANGUAGES, translations } from './translations';
import type { TranslationKey } from './translations';

const STORAGE_KEY = 'isearch.lang';

function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

/** First supported language from the phone's preferred languages; English otherwise. */
function detectDeviceLang(): Lang {
  for (const locale of getLocales()) {
    if (isLang(locale.languageCode)) return locale.languageCode;
  }
  return 'en';
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDeviceLang);

  // A language the user picked earlier overrides the phone's language.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isLang(saved)) setLangState(saved);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key) => translations[lang][key] }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
