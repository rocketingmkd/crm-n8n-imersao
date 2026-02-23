import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Camera, X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MinhaConta() {
  const { profile, user, refreshProfile } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState(profile?.nome_completo ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.nome_completo != null) setNomeCompleto(profile.nome_completo);
  }, [profile?.nome_completo]);

  const currentAvatarUrl = avatarPreview ?? profile?.url_avatar ?? null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG, GIF ou WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2 MB.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeNewAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !user?.id) {
      toast.error("Sessão inválida.");
      return;
    }

    setSaving(true);
    try {
      const updates: { nome_completo: string; url_avatar?: string | null } = {
        nome_completo: nomeCompleto.trim() || profile.nome_completo,
      };

      if (avatarFile && avatarFile.size > 0) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const contentType = avatarFile.type && avatarFile.type.startsWith("image/")
          ? avatarFile.type
          : "image/jpeg";
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType });

        if (uploadError) {
          const msg = uploadError.message || "Erro ao enviar a foto.";
          if (msg.includes("Bucket") || msg.includes("bucket") || msg.includes("not found")) {
            toast.error(
              "O bucket de avatares não existe. Crie o bucket 'avatars' no Supabase (Storage) ou execute o script SQL de instalação do banco."
            );
          } else if (msg.includes("policy") || msg.includes("Policy") || msg.includes("403")) {
            toast.error(
              "Sem permissão para enviar foto. Verifique as políticas do bucket 'avatars' no Supabase."
            );
          } else {
            toast.error(msg);
          }
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        updates.url_avatar = urlData?.publicUrl ?? null;
      }

      const { error } = await supabase
        .from("perfis")
        .update(updates)
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Conta atualizada com sucesso!");
    } catch (err: unknown) {
      console.error("Erro ao atualizar conta:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar conta.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container max-w-xl py-6 space-y-6">
      <div className="page-header">
        <h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
            <UserCircle className="h-4 w-4 text-pink-500" />
          </div>
          Minha conta
        </h1>
        <p>Atualize seu nome e sua foto de perfil.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do perfil</CardTitle>
          <CardDescription>
            Estas informações aparecem no sistema quando você está logado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto */}
            <div className="space-y-2">
              <Label className="text-foreground">Sua foto</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={currentAvatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                      {nomeCompleto ? nomeCompleto.trim().charAt(0).toUpperCase() : profile.nome_completo?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  {avatarPreview ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -top-1 -right-1 h-7 w-7 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
                      onClick={removeNewAvatar}
                      title="Remover nova foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {currentAvatarUrl ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                  <p className="mt-1">PNG, JPG, GIF ou WebP. Máx. 2 MB.</p>
                </div>
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome_completo" className="text-foreground">Nome completo</Label>
              <Input
                id="nome_completo"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Seu nome"
                className="max-w-md"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
