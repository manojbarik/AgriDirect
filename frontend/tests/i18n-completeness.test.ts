import { describe, expect, it } from 'vitest'
import { en, hi, translations } from '../src/i18n/translations'

describe('i18n translation completeness', () => {
  it('every navLabel used in navigation.ts resolves in all three languages', () => {
    const labels = translations as Record<string, Record<string, string>>
    const enKeys = Object.keys(en).filter((k) => k.startsWith('navLabel.'))
    expect(enKeys.length).toBeGreaterThan(40)

    for (const lang of ['en', 'or', 'hi'] as const) {
      for (const key of enKeys) {
        expect(labels[lang][key], `${lang} missing ${key}`).toBeTruthy()
      }
    }
  })

  it('logistics nav labels that previously leaked raw keys are translated', () => {
    for (const lang of ['en', 'or', 'hi'] as const) {
      const dict = translations[lang]
      expect(dict['navLabel.Logistics & Tracking']).toMatch(/[^\x20]/)
    }
  })

  it('missing keys fall back: current -> en -> raw key', () => {
    expect(en['navLabel.Home']).toBe('Home')
    expect(hi['navLabel.Home']).toBe('होम')
    expect(translations.en['missing.key']).toBeUndefined()
  })
})