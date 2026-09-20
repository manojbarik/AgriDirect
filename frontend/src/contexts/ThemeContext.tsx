import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/* eslint-disable react-refresh/only-export-components */
export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'agridirect:theme'

function detectInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.(`(prefers-color-scheme: dark)`).matches ? 'dark' : 'light'
}

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = detectInitialTheme()
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initial)
    }
    return initial
  })

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next)
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, next)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next)
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_KEY, next)
      }
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === 'dark' }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
/* eslint-enable react-refresh/only-export-components */