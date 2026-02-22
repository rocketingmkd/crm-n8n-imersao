import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

function hexParaHsl(hex: string): { h: number; s: number; l: number } | null {
  const match = hex.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;

  const r = parseInt(match[1], 16) / 255;
  const g = parseInt(match[2], 16) / 255;
  const b = parseInt(match[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function aplicarCorPrimaria(hex: string, isDark: boolean) {
  const hsl = hexParaHsl(hex);
  if (!hsl) return;

  const { h, s, l } = hsl;
  const valor = `${h} ${s}% ${l}%`;
  const root = document.documentElement;

  root.style.setProperty('--primary', valor);
  root.style.setProperty('--accent', valor);
  root.style.setProperty('--ring', valor);
  root.style.setProperty('--sidebar-primary', valor);
  root.style.setProperty('--sidebar-ring', valor);

  if (isDark) {
    root.style.setProperty('--sidebar-accent', `${h} 30% 12%`);
    root.style.setProperty('--sidebar-accent-foreground', `${h} 0% 95%`);
  } else {
    root.style.setProperty('--sidebar-accent', `${h} 60% 96%`);
    root.style.setProperty('--sidebar-accent-foreground', `${h} 85% 42%`);
  }
}

export function useCoresPataforma() {
  const { theme } = useTheme();

  const query = useQuery({
    queryKey: ['cores-plataforma'],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes_globais')
        .select('cor_primaria')
        .single();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    const cor = query.data?.cor_primaria;
    if (cor) aplicarCorPrimaria(cor, theme === 'dark');
  }, [query.data?.cor_primaria, theme]);

  return query;
}
