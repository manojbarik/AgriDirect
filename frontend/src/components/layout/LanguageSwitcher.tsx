import React, { useContext } from 'react';
import { Dropdown } from '../ui/Dropdown';
import { I18nContext, type Language } from '../../i18n/I18nProvider';

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'EN' },
  { code: 'hi', label: 'हिन्दी — Hindi', native: 'हिन्दी' },
  { code: 'or', label: 'ଓଡ଼ିଆ — Odia', native: 'ଓଡ଼ିଆ' },
];

export const LanguageSwitcher: React.FC = () => {
  const ctx = useContext(I18nContext);

  if (!ctx) return null;

  const { language, setLanguage } = ctx;
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const items = LANGUAGES.map((lang) => ({
    label: lang.label,
    onClick: () => setLanguage(lang.code),
    icon:
      lang.code === language ? (
        <svg className="h-5 w-5 text-primary-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-neutral-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12z" clipRule="evenodd" />
        </svg>
      ),
  }));

  return (
    <Dropdown
      trigger={
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
          aria-label="Change language"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          <span className="hidden sm:inline">{current.native}</span>
        </button>
      }
      items={items}
      align="right"
      width={220}
    />
  );
};