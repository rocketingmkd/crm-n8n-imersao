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

function buildUrlAttempts(rawUrl: string | null | undefined): string[] {
  const raw = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!raw) return [];

  const id = extrairIdGoogleDrive(raw);
  if (id) {
    return [
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
      raw,
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
  const [imgError, setImgError] = useState(false);

  const { data: logoConfig, error: logoQueryError } = useQuery({
    queryKey: [...CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY, theme],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_globais")
        .select("url_logo_plataforma, url_logo_plataforma_escuro")
        .maybeSingle();
      if (error) throw error;
      return data as { url_logo_plataforma: string | null; url_logo_plataforma_escuro: string | null } | null;
    },
    enabled: variant === "platform" || variant === "org",
    staleTime: 30_000,
    retry: 2,
  });

  useEffect(() => {
    if (logoQueryError) {
      console.error("[AppLogo] Falha ao buscar configuracoes_globais:", logoQueryError);
    }
  }, [logoQueryError]);

  const platformLogoUrl = logoConfig
    ? theme === "dark"
      ? (logoConfig.url_logo_plataforma ?? logoConfig.url_logo_plataforma_escuro)
      : (logoConfig.url_logo_plataforma_escuro ?? logoConfig.url_logo_plataforma)
    : null;

  useEffect(() => {
    setPlatformAttempt(0);
    setImgError(false);
  }, [platformLogoUrl]);

  useEffect(() => {
    setOrgAttempt(0);
    setImgError(false);
  }, [organization?.url_logo]);

  const defaultSrc = theme === "dark" ? defaultLogoWhite : defaultLogoDark;
  const imgStyle = { height: `${height}px`, width: "auto" };

  if (variant === "org") {
    const orgUrls = buildUrlAttempts(organization?.url_logo);
    const platformUrlsOrg = buildUrlAttempts(platformLogoUrl);
    const src = imgError ? defaultSrc : (orgUrls[orgAttempt] ?? platformUrlsOrg[platformAttempt] ?? defaultSrc);
    return (
      <img
        key={src}
        src={src}
        alt={organization?.nome ?? "Logo"}
        style={imgStyle}
        className={`object-contain shrink-0 ${className}`}
        onError={() => {
          if (orgUrls.length > 0 && orgAttempt < orgUrls.length - 1) {
            setOrgAttempt((a) => a + 1);
          } else if (platformUrlsOrg.length > 0 && platformAttempt < platformUrlsOrg.length - 1) {
            setPlatformAttempt((a) => a + 1);
          } else {
            setImgError(true);
          }
        }}
      />
    );
  }

  const platformUrls = buildUrlAttempts(platformLogoUrl);
  const src = platformUrls[platformAttempt] ?? defaultSrc;

  if (!src || imgError) {
    return (
      <span
        className={`inline-flex items-center font-semibold text-foreground ${className}`}
        style={{ height, fontSize: Math.max(14, height * 0.5) }}
        aria-label="Logo"
      >
        FlowAtend
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt="Logo"
      style={imgStyle}
      className={`object-contain shrink-0 ${className}`}
      onError={() => {
        if (platformAttempt < platformUrls.length - 1) {
          setPlatformAttempt((a) => a + 1);
        } else {
          setImgError(true);
        }
      }}
    />
  );
}
