import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { resolverUrlImagem, extrairIdGoogleDrive } from "@/lib/utils";
import defaultLogoWhite from "@/assets/logo-flowgrammers.png";
import defaultLogoDark from "@/assets/logo-flowgrammers-dark.png";

export const CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY = ["configuracoes-globais-logo"] as const;

interface AppLogoProps {
  variant: "org" | "platform";
  height?: number;
  className?: string;
}

// Tenta 3 formatos de URL em sequência para Google Drive,
// ou usa a URL diretamente para outros hosts.
function buildUrlAttempts(rawUrl: string | null | undefined): string[] {
  const raw = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!raw) return [];

  const id = extrairIdGoogleDrive(raw);
  if (id) {
    return [
      `https://lh3.googleusercontent.com/d/${id}`,                   // CDN Google
      `https://drive.google.com/thumbnail?id=${id}&sz=w800`,         // thumbnail público
      raw,                                                             // URL original como último recurso
    ];
  }

  const resolved = resolverUrlImagem(raw);
  return resolved ? [resolved] : [];
}

export function AppLogo({ variant, height = 32, className = "" }: AppLogoProps) {
  const { organization } = useAuth();
  const { theme } = useTheme();

  const [platformAttempt, setPlatformAttempt] = useState(0);
  const [orgAttempt, setOrgAttempt] = useState(0);

  const { data: logoConfig, error: logoQueryError } = useQuery({
    queryKey: [...CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY, theme],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_globais")
        .select("url_logo_plataforma, url_logo_plataforma_escuro")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: variant === "platform",
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (logoQueryError) {
      console.error("[AppLogo] Falha ao buscar configuracoes_globais:", logoQueryError);
    }
  }, [logoQueryError]);

  const platformLogoUrl =
    variant === "platform" && logoConfig
      ? theme === "dark"
        ? (logoConfig.url_logo_plataforma ?? logoConfig.url_logo_plataforma_escuro)
        : (logoConfig.url_logo_plataforma_escuro ?? logoConfig.url_logo_plataforma)
      : null;

  useEffect(() => {
    if (platformLogoUrl) {
      const urls = buildUrlAttempts(platformLogoUrl);
      console.log("[AppLogo] Tentativas de URL para logo da plataforma:", urls);
    }
    setPlatformAttempt(0);
  }, [platformLogoUrl]);

  useEffect(() => { setOrgAttempt(0); }, [organization?.url_logo]);

  const defaultSrc = theme === "dark" ? defaultLogoWhite : defaultLogoDark;

  if (variant === "org") {
    const orgUrls = buildUrlAttempts(organization?.url_logo);
    const src = orgUrls[orgAttempt] ?? defaultSrc;
    return (
      <img
        src={src}
        alt={organization?.nome ?? "Logo"}
        style={{ height, width: "auto" }}
        className={`object-contain shrink-0 ${className}`}
        onError={() => {
          console.warn(`[AppLogo] org tentativa ${orgAttempt} falhou:`, src);
          setOrgAttempt((a) => a + 1);
        }}
      />
    );
  }

  const platformUrls = buildUrlAttempts(platformLogoUrl);
  const src = platformUrls[platformAttempt] ?? defaultSrc;
  return (
    <img
      src={src}
      alt="Logo"
      style={{ height, width: "auto" }}
      className={`object-contain shrink-0 ${className}`}
      onError={() => {
        console.warn(`[AppLogo] platform tentativa ${platformAttempt} falhou:`, src);
        setPlatformAttempt((a) => a + 1);
      }}
    />
  );
}
