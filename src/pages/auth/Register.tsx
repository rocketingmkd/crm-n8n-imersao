import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/AppLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, X } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem (PNG, JPG, GIF ou WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('A foto deve ter no máximo 2 MB.');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        organizationName: formData.organizationName,
        avatarFile: avatarFile ?? undefined,
      });
      navigate('/login');
    } catch (error) {
      // Erro já tratado no AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <AppLogo variant="platform" height={38} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Criar Conta
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Crie sua conta e comece a gerenciar sua empresa
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Foto do usuário */}
            <div className="space-y-2 flex flex-col items-center">
              <Label className="text-foreground">Sua foto (opcional)</Label>
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-border">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Preview" className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                    {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '?'}
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
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                    onClick={removeAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {!avatarPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Escolher foto
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-foreground">Nome da Empresa *</Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="Minha Empresa"
                value={formData.organizationName}
                onChange={handleChange}
                required
                disabled={loading}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">Seu Nome Completo *</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="João Silva"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={loading}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="email"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                minLength={6}
                autoComplete="new-password"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 6 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                minLength={6}
                autoComplete="new-password"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-accent font-semibold hover:text-accent/80 hover:underline transition-colors">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

