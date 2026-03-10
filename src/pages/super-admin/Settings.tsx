import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, MessageCircle, Save, Palette, Mic, Bot, Key, Type } from "lucide-react";
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
import { FonteSistema, FONT_OPTIONS, aplicarFonte } from "@/hooks/useFonteSistema";
import { cn, resolverUrlImagem } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ConfiguracoesGlobaisForm {
  whatsapp_suporte: string;
  email_suporte: string;
  chave_openai: string;
  chave_elevenlabs: string;
  id_voz_elevenlabs: string;
  nome_plataforma: string;
  frase_login: string;
  url_logo_plataforma: string;
  url_logo_plataforma_escuro: string;
  cor_primaria: string;
  fonte_sistema: FonteSistema;
}

export default function SuperAdminSettings() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoError, setLogoError] = useState<{ escuro?: boolean; claro?: boolean }>({});
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ConfiguracoesGlobaisForm>();

  const corPrimaria = watch('cor_primaria');
  const fonteSistema = watch('fonte_sistema');
  const urlLogoPlataforma = watch('url_logo_plataforma');
  const urlLogoPlataformaEscuro = watch('url_logo_plataforma_escuro');

  useEffect(() => {
    if (corPrimaria) aplicarCorPrimaria(corPrimaria, theme === 'dark');
  }, [corPrimaria, theme]);

  useEffect(() => {
    if (fonteSistema) aplicarFonte(fonteSistema);
  }, [fonteSistema]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('configuracoes_globais').select('*').single();
        if (error) throw error;
        if (data) reset({
          whatsapp_suporte: data.whatsapp_suporte || "",
          email_suporte: (data as any).email_suporte || "",
          chave_openai: data.chave_openai || "",
          nome_plataforma: data.nome_plataforma || "FlowAtend",
          frase_login: (data as any).frase_login || "Seu universo de automações espera",
          url_logo_plataforma: data.url_logo_plataforma || "",
          url_logo_plataforma_escuro: data.url_logo_plataforma_escuro || "",
          cor_primaria: data.cor_primaria || "#D9156C",
          chave_elevenlabs: data.chave_elevenlabs || "",
          id_voz_elevenlabs: data.id_voz_elevenlabs || "",
          fonte_sistema: ((data as any).fonte_sistema as FonteSistema) || 'inter',
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error(t("superAdmin.settings.loadError"));
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
        email_suporte: data.email_suporte?.trim() || null,
        chave_openai: data.chave_openai || null,
        nome_plataforma: data.nome_plataforma || 'FlowAtend',
        frase_login: data.frase_login || 'Seu universo de automações espera',
        url_logo_plataforma: data.url_logo_plataforma || null,
        url_logo_plataforma_escuro: data.url_logo_plataforma_escuro || null,
        cor_primaria: data.cor_primaria || '#D9156C',
        chave_elevenlabs: data.chave_elevenlabs || null,
        id_voz_elevenlabs: data.id_voz_elevenlabs || null,
        fonte_sistema: data.fonte_sistema || 'inter',
      } as any).eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cores-plataforma"] });
      queryClient.invalidateQueries({ queryKey: ["fonte-sistema"] });
      queryClient.invalidateQueries({ queryKey: CONFIGURACOES_GLOBAIS_LOGO_QUERY_KEY });
      toast.success(t("superAdmin.settings.saved"));
    } catch (error: any) {
      toast.error(error.message || t("superAdmin.settings.saveError"));
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
    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
      {isSaving
        ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />{t("superAdmin.settings.saving")}</>
        : <><Save className="mr-2 h-4 w-4" />{t("common.save")}</>}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10">
            <SettingsIcon className="h-4 w-4 text-slate-500" />
          </div>
          {t("superAdmin.settings.title")}
        </h1>
        <p>{t("superAdmin.settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1 liquid-glass rounded-xl">
          <TabsTrigger value="visual" className="flex items-center gap-1.5 text-xs md:text-sm py-2 rounded-lg">
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("superAdmin.settings.visual")}</span>
            <span className="sm:hidden">{t("superAdmin.settings.visual")}</span>
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-1.5 text-xs md:text-sm py-2 rounded-lg">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("superAdmin.settings.iaVoice")}</span>
            <span className="sm:hidden">{t("superAdmin.settings.iaVoice")}</span>
          </TabsTrigger>
          <TabsTrigger value="apis" className="flex items-center gap-1.5 text-xs md:text-sm py-2 rounded-lg">
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("superAdmin.settings.supportData")}</span>
            <span className="sm:hidden">{t("superAdmin.settings.supportData")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== ABA VISUAL ===== */}
        <TabsContent value="visual" className="mt-4 space-y-4">
          {/* Branding */}
          <Card className="liquid-glass rounded-2xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                  <Palette className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">{t("superAdmin.settings.branding")}</CardTitle>
                  <CardDescription className="text-xs">{t("superAdmin.settings.brandingDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_plataforma" className="text-foreground text-xs font-medium">{t("superAdmin.settings.platformName")}</Label>
                    <Input id="nome_plataforma" {...register("nome_plataforma")} placeholder="FlowAtend" className="liquid-glass-input rounded-xl" />
                    <p className="text-[10px] text-muted-foreground">{t("superAdmin.settings.platformNameHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frase_login" className="text-foreground text-xs font-medium">{t("superAdmin.settings.loginPhrase")}</Label>
                    <Input id="frase_login" {...register("frase_login")} placeholder={t("auth.defaultPhrase")} className="liquid-glass-input rounded-xl" />
                    <p className="text-[10px] text-muted-foreground">{t("superAdmin.settings.loginPhraseHint")}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="url_logo_plataforma" className="text-foreground text-xs font-medium">{t("superAdmin.settings.logoDark")}</Label>
                      <Input id="url_logo_plataforma" {...register("url_logo_plataforma")} placeholder="https://..." className="liquid-glass-input rounded-xl" />
                      <div className="rounded-xl border border-border overflow-hidden bg-zinc-800 p-4 flex flex-col items-center justify-center min-h-[80px] gap-2">
                        {urlLogoPlataforma?.trim() ? (
                          <>
                            <img
                              src={resolverUrlImagem(urlLogoPlataforma) || urlLogoPlataforma.trim()}
                              alt="Preview logo fundo escuro"
                              className="max-h-16 w-auto object-contain"
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                const fallback = el.parentElement?.querySelector('[data-logo-error]') as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <span data-logo-error className="hidden text-xs text-amber-400">Não foi possível carregar a imagem</span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400">Preview do logo no banco (fundo escuro)</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url_logo_plataforma_escuro" className="text-foreground text-xs font-medium">{t("superAdmin.settings.logoLight")}</Label>
                      <Input id="url_logo_plataforma_escuro" {...register("url_logo_plataforma_escuro")} placeholder="https://..." className="liquid-glass-input rounded-xl" />
                      <div className="rounded-xl border border-border overflow-hidden bg-zinc-100 dark:bg-zinc-200 p-4 flex flex-col items-center justify-center min-h-[80px] gap-2">
                        {urlLogoPlataformaEscuro?.trim() ? (
                          <>
                            <img
                              src={resolverUrlImagem(urlLogoPlataformaEscuro) || urlLogoPlataformaEscuro.trim()}
                              alt="Preview logo fundo claro"
                              className="max-h-16 w-auto object-contain"
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                const fallback = el.parentElement?.querySelector('[data-logo-error]') as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <span data-logo-error className="hidden text-xs text-amber-500">Não foi possível carregar a imagem</span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500 dark:text-zinc-600">Preview do logo no banco (fundo claro)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Cores */}
          <Card className="liquid-glass rounded-2xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10">
                  <Palette className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">{t("superAdmin.settings.colors")}</CardTitle>
                  <CardDescription className="text-xs">{t("superAdmin.settings.colorsDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cor_primaria" className="text-foreground text-xs font-medium">{t("superAdmin.settings.primaryColor")}</Label>
                    <div className="flex items-center gap-3">
                      <input id="cor_primaria" type="color" {...register("cor_primaria")} className="h-10 w-16 cursor-pointer rounded-xl border border-border bg-background p-1" />
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

          {/* Fonte do Sistema */}
          <Card className="liquid-glass rounded-2xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Type className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">{t("superAdmin.settings.systemFont")}</CardTitle>
                  <CardDescription className="text-xs">{t("superAdmin.settings.systemFontDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FONT_OPTIONS.map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => setValue('fonte_sistema', font.value)}
                        className={cn(
                          "p-4 rounded-xl text-left transition-all liquid-glass",
                          fonteSistema === font.value
                            ? "ring-2 ring-primary border-primary/40"
                            : "hover:ring-1 hover:ring-primary/30"
                        )}
                      >
                        <p className="text-sm font-semibold text-foreground" style={{ fontFamily: font.label }}>{font.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{font.description}</p>
                        <p className="text-xs text-muted-foreground mt-2" style={{ fontFamily: font.label }}>
                          Aa Bb Cc 0123
                        </p>
                      </button>
                    ))}
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA IA & VOZ ===== */}
        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card className="liquid-glass rounded-2xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Bot className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">{t("superAdmin.settings.openaiKey")}</CardTitle>
                  <CardDescription className="text-xs">{t("superAdmin.settings.openaiDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chave_openai" className="text-foreground text-xs font-medium">{t("superAdmin.settings.openaiKey")}</Label>
                    <Input id="chave_openai" type="password" {...register("chave_openai")} placeholder="sk-..." className="font-mono liquid-glass-input rounded-xl" />
                    <p className="text-[10px] text-muted-foreground">Esta chave é global e afeta todas as empresas do sistema.</p>
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="liquid-glass rounded-2xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10">
                  <Mic className="h-4 w-4 text-teal-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">{t("superAdmin.settings.elevenlabs")}</CardTitle>
                  <CardDescription className="text-xs">{t("superAdmin.settings.elevenlabsDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chave_elevenlabs" className="text-foreground text-xs font-medium">{t("superAdmin.settings.elevenlabsKey")}</Label>
                    <Input id="chave_elevenlabs" type="password" {...register("chave_elevenlabs")} placeholder="sk_..." className="font-mono liquid-glass-input rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_voz_elevenlabs" className="text-foreground text-xs font-medium">ID da Voz</Label>
                    <Input id="id_voz_elevenlabs" {...register("id_voz_elevenlabs")} placeholder="ex: oJebhZNaPllxk6W0LSBA" className="font-mono liquid-glass-input rounded-xl" />
                  </div>
                  {saveButton}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ABA DADOS DE SUPORTE ===== */}
        <TabsContent value="apis" className="mt-4 space-y-4">
          <Card className="liquid-glass rounded-2xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-sm md:text-base">Dados de suporte</CardTitle>
                  <CardDescription className="text-xs">WhatsApp e e-mail exibidos para contato com suporte</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? loadingSpinner : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_suporte" className="text-foreground text-xs font-medium">WhatsApp (formato internacional)</Label>
                    <Input id="whatsapp_suporte" type="tel" {...register("whatsapp_suporte")} placeholder="5511999999999" className="liquid-glass-input rounded-xl" />
                    <p className="text-[10px] text-muted-foreground">Número exibido como botão flutuante. Sem espaços (ex: 5511999999999).</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_suporte" className="text-foreground text-xs font-medium">E-mail de suporte</Label>
                    <Input id="email_suporte" type="email" {...register("email_suporte")} placeholder="suporte@exemplo.com" className="liquid-glass-input rounded-xl" />
                    <p className="text-[10px] text-muted-foreground">E-mail para contato com suporte (opcional).</p>
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
