import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FonteSistema = 'open-sans' | 'inter' | 'dm-sans' | 'plus-jakarta';

const FONT_MAP: Record<FonteSistema, string> = {
  'open-sans': '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'inter': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'dm-sans': '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'plus-jakarta': '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export const FONT_OPTIONS = [
  { value: 'open-sans' as FonteSistema, label: 'Open Sans', description: 'Clássica e legível' },
  { value: 'inter' as FonteSistema, label: 'Inter', description: 'Moderna e limpa' },
  { value: 'dm-sans' as FonteSistema, label: 'DM Sans', description: 'Geométrica e amigável' },
  { value: 'plus-jakarta' as FonteSistema, label: 'Plus Jakarta Sans', description: 'Premium e elegante' },
];

export function aplicarFonte(fonte: FonteSistema) {
  const fontFamily = FONT_MAP[fonte] || FONT_MAP['open-sans'];
  document.documentElement.style.setProperty('--font-sans', fontFamily);
  document.documentElement.style.fontFamily = fontFamily;
}

export function useFonteSistema() {
  const query = useQuery({
    queryKey: ['fonte-sistema'],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes_globais')
        .select('fonte_sistema')
        .single();
      return (data as any)?.fonte_sistema as FonteSistema | null;
    },
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    const fonte = query.data || 'inter';
    aplicarFonte(fonte);
  }, [query.data]);

  return query;
}
