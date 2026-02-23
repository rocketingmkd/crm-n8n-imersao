import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function SupportButton() {
  // Buscar configurações globais
  const { data: globalSettings } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_globais')
        .select('whatsapp_suporte')
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Não mostrar se não houver número de suporte configurado
  if (!globalSettings?.whatsapp_suporte) {
    return null;
  }

  const handleWhatsAppClick = () => {
    // Remover todos os caracteres não numéricos
    const cleanNumber = globalSettings.whatsapp_suporte.replace(/\D/g, '');
    
    // Abrir WhatsApp Web/App
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=Olá, preciso de suporte!`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "h-14 w-14 rounded-full",
        "liquid-glass !rounded-full",
        "bg-green-500/20 hover:bg-green-500/30",
        "border border-green-500/40",
        "shadow-lg shadow-green-500/20",
        "transition-all duration-300 hover:scale-110",
        "flex items-center justify-center",
        "group cursor-pointer"
      )}
      title="Falar com Suporte"
    >
      <MessageCircle className="h-6 w-6 text-green-400 group-hover:animate-bounce" />
    </button>
  );
}

