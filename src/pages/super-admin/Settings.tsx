import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, MessageCircle, Save, Palette, Mic, Bot, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY } from "@/components/AppLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { aplicarCorPrimaria } from "@/hooks/useCoresPataforma";

interface ConfiguracoesGlobaisForm {
  whatsapp_suporte: string;
  chave_openai: string;
  chave_elevenlabs: string;
  id_voz_elevenlabs: string;
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
          id_voz_elevenlabs: data.id_voz_elevenlabs || "",
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
        id_voz_elevenlabs: data.id_voz_elevenlabs || null,
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
    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
      {isSaving
        ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Salvando...</>
        : <><Save className="mr-2 h-4 w-4" />Salvar</>}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Gerencie as configurações globais do sistema</p>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          <TabsTrigger value="visual" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visual</span>
            <span className="sm:hidden">Visual</span>
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">IA & Voz</span>
            <span className="sm:hidden">IA</span>
          </TabsTrigger>
          <TabsTrigger value="apis" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">APIs & Suporte</span>
            <span className="sm:hidden">APIs</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== ABA VISUAL ===== */}
        <TabsContent value="visual" className="mt-4 space-y-4">
          {/* Branding */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                  <Palette className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">Branding</CardTitle>
                  <CardDescription className="text-xs">Nome e logos da plataforma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_plataforma" className="text-foreground text-xs font-medium">Nome da Plataforma</Label>
                    <Input id="nome_plataforma" {...register("nome_plataforma")} placeholder="FlowAtend" />
                    <p className="text-[10px] text-muted-foreground">Nome exibido no título do browser e como fallback quando não há logo.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="url_logo_plataforma" className="text-foreground text-xs font-medium">Logo (fundo escuro)</Label>
                      <Input id="url_logo_plataforma" {...register("url_logo_plataforma")} placeholder="https://..." />
                      <p className="text-[10px] text-muted-foreground">Versão clara do logo para temas escuros.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url_logo_plataforma_escuro" className="text-foreground text-xs font-medium">Logo (fundo claro)</Label>
                      <Input id="url_logo_plataforma_escuro" {...register("url_logo_plataforma_escuro")} placeholder="https://..." />
                      <p className="text-[10px] text-muted-foreground">Versão escura do logo para temas claros.</p>
                    </div>
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Cores */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10">
                  <Palette className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">Cores</CardTitle>
                  <CardDescription className="text-xs">Cor primária usada em botões, nav e destaques</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cor_primaria" className="text-foreground text-xs font-medium">Cor Primária</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="cor_primaria"
                        type="color"
                        {...register("cor_primaria")}
                        className="h-10 w-16 cursor-pointer rounded-md border border-border bg-background p-1"
                      />
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: corPrimaria || '#D9156C' }} />
                        <span className="font-mono text-sm text-muted-foreground">{corPrimaria || '#D9156C'}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Preview aplicado em tempo real. Clique em Salvar para persistir.</p>
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA IA & VOZ ===== */}
        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Bot className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">API Key OpenAI</CardTitle>
                  <CardDescription className="text-xs">Chave de API usada por todas as empresas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chave_openai" className="text-foreground text-xs font-medium">Chave de API OpenAI</Label>
                    <Input id="chave_openai" type="password" {...register("chave_openai")} placeholder="sk-..." className="font-mono" />
                    <p className="text-[10px] text-muted-foreground">Esta chave é global e afeta todas as empresas do sistema.</p>
                    {errors.chave_openai && <p className="text-xs text-destructive">{errors.chave_openai.message}</p>}
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10">
                  <Mic className="h-4 w-4 text-teal-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">ElevenLabs — Síntese de Voz</CardTitle>
                  <CardDescription className="text-xs">Credenciais e voz para fluxos de áudio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chave_elevenlabs" className="text-foreground text-xs font-medium">Chave de API ElevenLabs</Label>
                    <Input id="chave_elevenlabs" type="password" {...register("chave_elevenlabs")} placeholder="sk_..." className="font-mono" />
                    <p className="text-[10px] text-muted-foreground">Autentica chamadas à API ElevenLabs nos fluxos n8n.</p>
                    {errors.chave_elevenlabs && <p className="text-xs text-destructive">{errors.chave_elevenlabs.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_voz_elevenlabs" className="text-foreground text-xs font-medium">ID da Voz</Label>
                    <Input id="id_voz_elevenlabs" {...register("id_voz_elevenlabs")} placeholder="ex: oJebhZNaPllxk6W0LSBA" className="font-mono" />
                    <p className="text-[10px] text-muted-foreground">ID da voz no ElevenLabs (My Voices → Voice ID).</p>
                    {errors.id_voz_elevenlabs && <p className="text-xs text-destructive">{errors.id_voz_elevenlabs.message}</p>}
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA APIs & SUPORTE ===== */}
        <TabsContent value="apis" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">WhatsApp de Suporte</CardTitle>
                  <CardDescription className="text-xs">Número exibido como botão flutuante para todos os usuários</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_suporte" className="text-foreground text-xs font-medium">Número (formato internacional)</Label>
                    <Input id="whatsapp_suporte" type="tel" {...register("whatsapp_suporte")} placeholder="5511999999999" />
                    <p className="text-[10px] text-muted-foreground">Formato internacional sem espaços (ex: 5511999999999).</p>
                    {errors.whatsapp_suporte && <p className="text-xs text-destructive">{errors.whatsapp_suporte.message}</p>}
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
