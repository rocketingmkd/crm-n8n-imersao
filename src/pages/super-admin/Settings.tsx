import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, MessageCircle, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GlobalSettingsForm {
  support_whatsapp: string;
  openai_api_key: string;
}

export default function SuperAdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<GlobalSettingsForm>();

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('global_settings').select('*').single();
        if (error) throw error;
        if (data) reset({ support_whatsapp: data.support_whatsapp || "", openai_api_key: data.openai_api_key || "" });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [reset]);

  const onSubmit = async (data: GlobalSettingsForm) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('global_settings').update({ support_whatsapp: data.support_whatsapp || null, openai_api_key: data.openai_api_key || null }).eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      toast.success('Configurações salvas!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações gerais do sistema</p>
      </div>

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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support_whatsapp" className="text-foreground text-xs font-medium">
                  Número de WhatsApp (formato internacional)
                </Label>
                <Input id="support_whatsapp" type="tel" {...register("support_whatsapp")} placeholder="5511999999999" />
                <p className="text-[10px] text-muted-foreground">
                  Formato internacional sem espaços (ex: 5511999999999). Será exibido como botão flutuante para todos os usuários.
                </p>
                {errors.support_whatsapp && <p className="text-xs text-destructive">{errors.support_whatsapp.message}</p>}
              </div>
              <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSaving ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_api_key" className="text-foreground text-xs font-medium">Chave de API OpenAI</Label>
                <Input id="openai_api_key" type="password" {...register("openai_api_key")} placeholder="sk-..." className="font-mono" />
                <p className="text-[10px] text-muted-foreground">
                  Esta chave é global e afeta todas as empresas do sistema.
                </p>
                {errors.openai_api_key && <p className="text-xs text-destructive">{errors.openai_api_key.message}</p>}
              </div>
              <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSaving ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
