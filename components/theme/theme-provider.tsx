'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ThemeMode } from '@/lib/types'

type Resolved = 'light' | 'dark'

interface ThemeContextValue {
  /** User preference: light | dark | system. */
  mode: ThemeMode
  /** What's actually applied right now. */
  resolved: Resolved
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'simvites-theme'
/** Pre-rename key. Read once as a fallback so existing visitors keep the
 *  light/dark choice they already made instead of silently reverting to
 *  system on their next visit. */
const LEGACY_STORAGE_KEY = 'occasio-theme'

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function applyClass(resolved: Resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
}

/**
 * Inline script that runs BEFORE paint to set the .dark class from stored
 * preference (or the OS), preventing a light→dark flash. Rendered in <head>.
 * `defaultMode` lets a published tenant site honour its theme.mode_default.
 */
export function ThemeScript({ defaultMode = 'system' }: { defaultMode?: ThemeMode }) {
  const js = `(function(){try{
    var d='${defaultMode}';
    var s=localStorage.getItem('${STORAGE_KEY}')||localStorage.getItem('${LEGACY_STORAGE_KEY}');
    var m=s||d;
    var dark = m==='dark' || (m!=='light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if(dark)document.documentElement.classList.add('dark');
  }catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
}: {
  children: React.ReactNode
  defaultMode?: ThemeMode
}) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode)
  const [resolved, setResolved] = useState<Resolved>('light')

  // Hydrate preference from storage on mount.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY)
      ?? localStorage.getItem(LEGACY_STORAGE_KEY)) as ThemeMode | null
    if (stored && stored !== localStorage.getItem(STORAGE_KEY)) {
      // Migrate forward once, then the legacy key is never consulted again.
      localStorage.setItem(STORAGE_KEY, stored)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    setModeState(stored ?? defaultMode)
  }, [defaultMode])

  // Apply + persist whenever the mode changes, and follow the OS in system mode.
  useEffect(() => {
    const resolve = (): Resolved =>
      mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
    const next = resolve()
    setResolved(next)
    applyClass(next)

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => {
        const r = systemPrefersDark() ? 'dark' : 'light'
        setResolved(r)
        applyClass(r)
      }
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m)
    setModeState(m)
  }, [])

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setMode])

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
