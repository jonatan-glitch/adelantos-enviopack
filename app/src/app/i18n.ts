import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es_AR from '@/infrastructure/langs/es_AR.json'

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es_AR },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
