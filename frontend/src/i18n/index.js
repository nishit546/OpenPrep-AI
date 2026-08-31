import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'es', 'fr', 'de', 'ja', 'ar', 'bn', 'pt', 'id'],
    debug: false,
    interpolation: {
      escapeValue: false, // React inherently handles escaping safely
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    resources: {
      en: {
        translation: {
          nav: { start_quiz: "Start Quiz", flashcards: "Flashcards", profile: "Profile" },
          status: { online: "Online", offline: "Offline" },
          select_language: "Select Language"
        }
      },
      hi: {
        translation: {
          nav: { start_quiz: "क्विज़ शुरू करें", flashcards: "फ्लैशकार्ड", profile: "प्रोफ़ाइल" },
          status: { online: "ऑनलाइन", offline: "ऑफ़लाइन" },
          select_language: "भाषा चुनें"
        }
      },
      es: {
        translation: {
          nav: { start_quiz: "Iniciar Cuestionario", flashcards: "Tarjetas", profile: "Perfil" },
          status: { online: "En línea", offline: "Desconectado" },
          select_language: "Seleccionar Idioma"
        }
      },
      fr: {
        translation: {
          nav: { start_quiz: "Commencer le quiz", flashcards: "Cartes flash", profile: "Profil" },
          status: { online: "En ligne", offline: "Hors ligne" },
          select_language: "Choisir la langue"
        }
      },
      de: {
        translation: {
          nav: { start_quiz: "Quiz Starten", flashcards: "Lernkarten", profile: "Profil" },
          status: { online: "Online", offline: "Offline" },
          select_language: "Sprache Wählen"
        }
      },
      ja: {
        translation: {
          nav: { start_quiz: "クイズを開始", flashcards: "単語帳", profile: "プロフィール" },
          status: { online: "オンライン", offline: "オフライン" },
          select_language: "言語を選択"
        }
      },
      ar: {
        translation: {
          nav: { start_quiz: "بدء الاختبار", flashcards: "بطاقات الاستذكار", profile: "الملف الشخصي" },
          status: { online: "متصل", offline: "غير متصل" },
          select_language: "اختر اللغة"
        }
      },
      bn: {
        translation: {
          nav: { start_quiz: "কুইজ শুরু করুন", flashcards: "ফ্ল্যাশকার্ড", profile: "প্রোফাইল" },
          status: { online: "অনলাইন", offline: "অফলাইন" },
          select_language: "ভাষা নির্বাচন করুন"
        }
      },
      pt: {
        translation: {
          nav: { start_quiz: "Iniciar Quiz", flashcards: "Cartões", profile: "Perfil" },
          status: { online: "Online", offline: "Offline" },
          select_language: "Selecionar Idioma"
        }
      },
      id: {
        translation: {
          nav: { start_quiz: "Mulai Kuis", flashcards: "Kartu Flash", profile: "Profil" },
          status: { online: "Daring", offline: "Luring" },
          select_language: "Pilih Bahasa"
        }
      }
    }
  });

// Dynamic layout mirroring configuration on language shift
i18n.on('languageChanged', (lng) => {
  const isRtl = ['ar'].includes(lng);
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  }
});

export default i18n;
