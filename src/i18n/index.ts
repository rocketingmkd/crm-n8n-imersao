import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LOCALES = ["pt-BR", "en", "es"] as const;
type Locale = (typeof LOCALES)[number];

let defaultLang: Locale = "pt-BR";
try {
  const savedLang = localStorage.getItem("flowatend-lang") as Locale | null;
  if (savedLang && LOCALES.includes(savedLang)) defaultLang = savedLang;
} catch {
  // localStorage pode estar indisponível (iframe, modo privado, etc.)
}

export async function initI18n(): Promise<void> {
  const [ptBR, en, es] = await Promise.all([
    import("./locales/pt-BR.json").then((m) => m.default),
    import("./locales/en.json").then((m) => m.default),
    import("./locales/es.json").then((m) => m.default),
  ]);

  const resources = {
    "pt-BR": { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  };

  await i18n.use(initReactI18next).init({
    resources,
    lng: defaultLang,
    fallbackLng: "pt-BR",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  i18n.on("languageChanged", (lng) => {
    localStorage.setItem("flowatend-lang", lng);
  });
}

export default i18n;
