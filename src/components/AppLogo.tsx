import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import defaultLogoWhite from "@/assets/logo-flowgrammers.png";
import defaultLogoDark from "@/assets/logo-flowgrammers-dark.png";

interface AppLogoProps {
  variant: "org" | "platform";
  height?: number;
  className?: string;
}

export function AppLogo({ variant, height = 32, className = "" }: AppLogoProps) {
  const { organization } = useAuth();
  const { theme } = useTheme();
  // undefined = loading, null = no custom logo, string = logo URL
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (variant === "platform") {
      supabase
        .from("configuracoes_globais")
        .select("url_logo_plataforma, url_logo_plataforma_escuro")
        .single()
        .then(({ data }) => {
          if (data) {
            const url =
              theme === "dark"
                ? (data.url_logo_plataforma ?? data.url_logo_plataforma_escuro)
                : (data.url_logo_plataforma_escuro ?? data.url_logo_plataforma);
            setPlatformLogoUrl(url ?? null);
          } else {
            setPlatformLogoUrl(null);
          }
        });
    }
  }, [variant, theme]);

  const defaultSrc = theme === "dark" ? defaultLogoWhite : defaultLogoDark;

  if (variant === "org") {
    const src = organization?.url_logo ?? defaultSrc;
    return (
      <img
        src={src}
        alt={organization?.name ?? "Logo"}
        style={{ height, width: "auto" }}
        className={`object-contain shrink-0 ${className}`}
      />
    );
  }

  // variant === "platform"
  const src = platformLogoUrl ?? defaultSrc;
  return (
    <img
      src={src}
      alt="Logo"
      style={{ height, width: "auto" }}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
