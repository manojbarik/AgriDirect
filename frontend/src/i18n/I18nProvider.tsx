import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { translations, en, type Language, type TranslationDict } from './translations'

/* eslint-disable react-refresh/only-export-components */
export type { Language, TranslationDict }

const LANG_KEY = 'agridirect:lang'

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(LANG_KEY)
  if (stored === 'en' || stored === 'or' || stored === 'hi') return stored
  const nav = window.navigator.language?.toLowerCase() ?? ''
  if (nav.startsWith('or')) return 'or'
  if (nav.startsWith('hi')) return 'hi'
  return 'en'
}

type TFunc = (key: string) => string

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: TFunc
  availableLanguages: Language[]
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_KEY, lang)
    }
  }, [])

  const t: TFunc = useCallback(
    (key) => {
      const dict = translations[language] ?? en
      const k = key as keyof typeof en
      const resolved = (dict as unknown as Record<string, string>)[key] ?? en[k]
      if (resolved === undefined && import.meta.env.DEV) {
        console.warn(`[i18n] missing translation key: ${key}`)
      }
      if (resolved !== undefined) return resolved
      if (typeof key === 'string' && key.startsWith('navLabel.')) {
        return key.slice('navLabel.'.length)
      }
      return key
    },
    [language],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      availableLanguages: ['en', 'or', 'hi'],
    }),
    [language, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}

export { translations }
/* eslint-enable react-refresh/only-export-components */
