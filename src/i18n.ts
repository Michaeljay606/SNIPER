import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import en from './locales/en.json'

function detectLanguage(): string {
  const saved = localStorage.getItem('sniper_lang')
  if (saved === 'en' || saved === 'fr') return saved

  const tgLang = window.Telegram
    ?.WebApp?.initDataUnsafe?.user?.language_code
  if (tgLang?.startsWith('fr')) return 'fr'

  if (navigator.language?.startsWith('fr')) return 'fr'

  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
