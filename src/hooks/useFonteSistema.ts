import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FonteSistema =
  | 'inter'
  | 'open-sans'
  | 'dm-sans'
  | 'plus-jakarta'
  | 'poppins'
  | 'raleway'
  | 'space-grotesk'
  | 'outfit'
  | 'manrope'
  | 'nunito';

const FONT_MAP: Record<FonteSistema, string> = {
  'inter': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'open-sans': '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'dm-sans': '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'plus-jakarta': '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'poppins': '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'raleway': '"Raleway", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'space-grotesk': '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'outfit': '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'manrope': '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'nunito': '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const FONT_OPTIONS = [
  { value: 'inter' as FonteSistema, label: 'Inter', description: 'Moderna e limpa' },
  { value: 'open-sans' as FonteSistema, label: 'Open Sans', description: 'Clássica e legível' },
  { value: 'dm-sans' as FonteSistema, label: 'DM Sans', description: 'Geométrica e amigável' },
  { value: 'plus-jakarta' as FonteSistema, label: 'Plus Jakarta Sans', description: 'Premium e elegante' },
  { value: 'poppins' as FonteSistema, label: 'Poppins', description: 'Arredondada e versátil' },
  { value: 'raleway' as FonteSistema, label: 'Raleway', description: 'Fina e sofisticada' },
  { value: 'space-grotesk' as FonteSistema, label: 'Space Grotesk', description: 'Tech e futurista' },
  { value: 'outfit' as FonteSistema, label: 'Outfit', description: 'Minimalista e suave' },
  { value: 'manrope' as FonteSistema, label: 'Manrope', description: 'Profissional e distinta' },
  { value: 'nunito' as FonteSistema, label: 'Nunito', description: 'Lúdica e calorosa' },
];

export function aplicarFonte(fonte: FonteSistema) {
  const fontFamily = FONT_MAP[fonte] || FONT_MAP['inter'];
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
