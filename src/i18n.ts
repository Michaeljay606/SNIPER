import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import en from './locales/en.json'

// @ts-ignore
const tgLang = window.Telegram?.WebApp
  ?.initDataUnsafe?.user?.language_code ?? 'fr'

const detectedLang = tgLang.startsWith('fr') ? 'fr' : 'en'

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng:         detectedLang,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
})

export default i18n
