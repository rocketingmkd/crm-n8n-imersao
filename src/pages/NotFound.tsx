import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background liquid-bg p-4 relative">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      <div className="liquid-glass-strong p-10 text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full liquid-glass-subtle">
            <span className="text-4xl md:text-5xl font-bold text-accent">404</span>
          </div>
        </div>
        <h1 className="mb-3 md:mb-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
          {t('notFound.title')}
        </h1>
        <p className="mb-6 md:mb-8 text-base md:text-lg text-muted-foreground px-4">
          {t('notFound.description')}
        </p>
        <a 
          href="/" 
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-pink"
        >
          <Home className="h-4 w-4" />
          {t('notFound.backHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
