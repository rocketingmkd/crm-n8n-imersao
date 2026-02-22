import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, MessageCircle, Save, Palette, Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY } from "@/components/AppLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { aplicarCorPrimaria } from "@/hooks/useCoresPataforma";

interface ConfiguracoesGlobaisForm {
  whatsapp_suporte: string;
  chave_openai: string;
  chave_elevenlabs: string;
  nome_plataforma: string;
  url_logo_plataforma: string;
  url_logo_plataforma_escuro: string;
  cor_primaria: string;
}

export default function SuperAdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ConfiguracoesGlobaisForm>();

  const corPrimaria = watch('cor_primaria');

  useEffect(() => {
    if (corPrimaria) aplicarCorPrimaria(corPrimaria, theme === 'dark');
  }, [corPrimaria, theme]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('configuracoes_globais').select('*').single();
        if (error) throw error;
        if (data) reset({
          whatsapp_suporte: data.whatsapp_suporte || "",
          chave_openai: data.chave_openai || "",
          nome_plataforma: data.nome_plataforma || "FlowAtend",
          url_logo_plataforma: data.url_logo_plataforma || "",
          url_logo_plataforma_escuro: data.url_logo_plataforma_escuro || "",
          cor_primaria: data.cor_primaria || "#D9156C",
          chave_elevenlabs: data.chave_elevenlabs || "",
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [reset]);

  const onSubmit = async (data: ConfiguracoesGlobaisForm) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('configuracoes_globais').update({
        whatsapp_suporte: data.whatsapp_suporte || null,
        chave_openai: data.chave_openai || null,
        nome_plataforma: data.nome_plataforma || 'FlowAtend',
        url_logo_plataforma: data.url_logo_plataforma || null,
        url_logo_plataforma_escuro: data.url_logo_plataforma_escuro || null,
        cor_primaria: data.cor_primaria || '#D9156C',
        chave_elevenlabs: data.chave_elevenlabs || null,
      }).eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cores-plataforma"] });
      queryClient.invalidateQueries({ queryKey: CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY });
      toast.success("Configurações salvas!");
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const loadingSpinner = (
    <div className="flex items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
  );

  const saveButton = (
    <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
      {isSaving
        ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Salvando...</>
        : <><Save className="mr-2 h-4 w-4" />Salvar</>}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações gerais do sistema</p>
      </div>

      {/* Branding da Plataforma */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground text-base">Branding da Plataforma</CardTitle>
              <CardDescription>Nome e logos exibidos nas páginas de login e no painel super admin</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? loadingSpinner : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_plataforma" className="text-foreground text-xs font-medium">
                  Nome da Plataforma
                </Label>
                <Input
                  id="nome_plataforma"
                  {...register("nome_plataforma")}
                  placeholder="FlowAtend"
                />
                <p className="text-[10px] text-muted-foreground">
                  Nome exibido no título do browser e como fallback quando não há logo configurado.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_logo_plataforma" className="text-foreground text-xs font-medium">
                  URL do Logo (fundo escuro)
                </Label>
                <Input
                  id="url_logo_plataforma"
                  {...register("url_logo_plataforma")}
                  placeholder="https://..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Logo para temas escuros (geralmente versão clara do logo).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_logo_plataforma_escuro" className="text-foreground text-xs font-medium">
                  URL do Logo (fundo claro)
                </Label>
                <Input
                  id="url_logo_plataforma_escuro"
                  {...register("url_logo_plataforma_escuro")}
                  placeholder="https://..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Logo para temas claros (geralmente versão escura do logo).
                </p>
              </div>
              {saveButton}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Cores da Plataforma */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground text-base">Cores da Plataforma</CardTitle>
              <CardDescription>Personalize a cor primária usada em botões, nav ativa e destaques</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? loadingSpinner : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cor_primaria" className="text-foreground text-xs font-medium">
                  Cor Primária
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    id="cor_primaria"
                    type="color"
                    {...register("cor_primaria")}
                    className="h-10 w-16 cursor-pointer rounded-md border border-border bg-background p-1"
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full border border-border"
                      style={{ backgroundColor: corPrimaria || '#D9156C' }}
                    />
                    <span className="font-mono text-sm text-muted-foreground">
                      {corPrimaria || '#D9156C'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  A cor é aplicada imediatamente como preview. Clique em Salvar para persistir.
                </p>
              </div>
              {saveButton}
            </form>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp de Suporte */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground text-base">WhatsApp de Suporte</CardTitle>
              <CardDescription>Configure o número de WhatsApp de suporte para todos os usuários</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? loadingSpinner : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_suporte" className="text-foreground text-xs font-medium">
                  Número de WhatsApp (formato internacional)
                </Label>
                <Input id="whatsapp_suporte" type="tel" {...register("whatsapp_suporte")} placeholder="5511999999999" />
                <p className="text-[10px] text-muted-foreground">
                  Formato internacional sem espaços (ex: 5511999999999). Será exibido como botão flutuante para todos os usuários.
                </p>
                {errors.whatsapp_suporte && <p className="text-xs text-destructive">{errors.whatsapp_suporte.message}</p>}
              </div>
              {saveButton}
            </form>
          )}
        </CardContent>
      </Card>

      {/* API Key OpenAI */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground text-base">API Key OpenAI</CardTitle>
              <CardDescription>Chave de API OpenAI usada por todas as empresas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? loadingSpinner : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chave_openai" className="text-foreground text-xs font-medium">Chave de API OpenAI</Label>
                <Input id="chave_openai" type="password" {...register("chave_openai")} placeholder="sk-..." className="font-mono" />
                <p className="text-[10px] text-muted-foreground">
                  Esta chave é global e afeta todas as empresas do sistema.
                </p>
                {errors.chave_openai && <p className="text-xs text-destructive">{errors.chave_openai.message}</p>}
              </div>
              {saveButton}
            </form>
          )}
        </CardContent>
      </Card>

      {/* API Key ElevenLabs */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground text-base">API Key ElevenLabs</CardTitle>
              <CardDescription>Chave de API ElevenLabs para síntese de voz</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? loadingSpinner : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chave_elevenlabs" className="text-foreground text-xs font-medium">Chave de API ElevenLabs</Label>
                <Input id="chave_elevenlabs" type="password" {...register("chave_elevenlabs")} placeholder="sk_..." className="font-mono" />
                <p className="text-[10px] text-muted-foreground">
                  Usada para geração de áudio com vozes realistas nos fluxos de atendimento.
                </p>
                {errors.chave_elevenlabs && <p className="text-xs text-destructive">{errors.chave_elevenlabs.message}</p>}
              </div>
              {saveButton}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
