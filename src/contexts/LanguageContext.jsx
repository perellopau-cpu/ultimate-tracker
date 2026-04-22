import { createContext, useContext, useState, useEffect } from 'react'
import translations from '../lib/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ut_lang') || 'en')

  useEffect(() => {
    localStorage.setItem('ut_lang', lang)
  }, [lang])

  const t = (key) => translations[lang][key] ?? translations['en'][key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useT = () => useContext(LanguageContext)
