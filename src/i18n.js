import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUsTrans from "./locales/en-US.js";

i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: {
          translation: enUsTrans,
      },
    },
    react: {
      useSuspense: true
    },
    fallbackLng: 'en',
    preload: ['en'],
    keySeparator: false,
    interpolation: { escapeValue: false }
  })

export default i18next
