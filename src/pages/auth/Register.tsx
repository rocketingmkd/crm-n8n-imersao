import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, X, Sun, Moon, User, Building2, Mail, Lock } from 'lucide-react';
import LanguageSelector from "@/components/LanguageSelector";
import loginBg from "@/assets/login-bg.jpg";

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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione uma imagem.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2 MB.'); return; }
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
    if (formData.password !== formData.confirmPassword) { alert('As senhas não coincidem'); return; }
    if (formData.password.length < 6) { alert('A senha deve ter no mínimo 6 caracteres'); return; }
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

  const inputClass = `h-12 pl-11 pr-4 rounded-xl backdrop-blur-sm focus-visible:ring-primary/50 focus-visible:border-primary/50 ${
    isDark
      ? "bg-white/5 border-white/10 text-white placeholder:text-white/40"
      : "bg-black/5 border-black/10 text-foreground placeholder:text-foreground/40"
  }`;

  const labelClass = `text-xs font-medium ${isDark ? "text-white/70" : "text-foreground/70"}`;
  const iconClass = `absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-foreground/40"}`;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className={isDark ? "absolute inset-0 bg-black/50" : "absolute inset-0 bg-white/60 backdrop-blur-sm"} />

      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <LanguageSelector />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={`h-9 w-9 rounded-full backdrop-blur-md border transition-colors ${
          isDark
            ? "bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20"
            : "bg-black/10 border-black/10 text-foreground/70 hover:text-foreground hover:bg-black/15"
        }`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative z-10 w-full max-w-[480px] mx-4 my-8">
        <div className={`relative rounded-3xl backdrop-blur-2xl shadow-2xl p-8 sm:p-10 space-y-6 ${
          isDark
            ? "border border-white/10 bg-white/5 shadow-black/40"
            : "border border-black/5 bg-white/70 shadow-black/10"
        }`}>
          <div className={`absolute inset-0 rounded-3xl pointer-events-none ${
            isDark
              ? "shadow-[inset_0_0_30px_-8px_rgba(255,255,255,0.15)]"
              : "shadow-[inset_0_0_30px_-8px_rgba(0,0,0,0.05)]"
          }`} />

          {/* Header */}
          <div className="relative space-y-3 text-center">
            <div className="flex justify-center">
              <AppLogo variant="platform" height={64} />
            </div>
            <div className="space-y-1">
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-foreground"}`}>Criar Conta</h1>
              <p className={`text-sm ${isDark ? "text-white/60" : "text-foreground/60"}`}>Crie sua conta e comece a gerenciar sua empresa</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center space-y-2">
              <Label className={labelClass}>Sua foto (opcional)</Label>
              <div className="relative">
                <Avatar className={`h-20 w-20 border-2 ${isDark ? "border-white/10" : "border-black/10"}`}>
                  {avatarPreview ? <AvatarImage src={avatarPreview} alt="Preview" className="object-cover" /> : null}
                  <AvatarFallback className={`text-xl ${isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-foreground/40"}`}>
                    {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
                {avatarPreview ? (
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-1 -right-1 h-6 w-6 rounded-full" onClick={removeAvatar}>
                    <X className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button type="button" size="icon" className={`absolute -bottom-1 -right-1 h-7 w-7 rounded-full backdrop-blur-md border ${
                    isDark ? "bg-white/10 border-white/20 text-white/70" : "bg-black/10 border-black/10 text-foreground/70"
                  }`} onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className={labelClass}>Nome da Empresa *</Label>
              <div className="relative">
                <Building2 className={iconClass} />
                <Input id="organizationName" name="organizationName" placeholder="Minha Empresa" value={formData.organizationName} onChange={handleChange} required disabled={loading} className={inputClass} />
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className={labelClass}>Seu Nome Completo *</Label>
              <div className="relative">
                <User className={iconClass} />
                <Input id="fullName" name="fullName" placeholder="João Silva" value={formData.fullName} onChange={handleChange} required disabled={loading} className={inputClass} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className={labelClass}>Email *</Label>
              <div className="relative">
                <Mail className={iconClass} />
                <Input id="email" name="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={handleChange} required disabled={loading} autoComplete="email" className={inputClass} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className={labelClass}>Senha *</Label>
              <div className="relative">
                <Lock className={iconClass} />
                <Input id="password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={loading} minLength={6} autoComplete="new-password" className={inputClass} />
              </div>
              <p className={`text-xs ${isDark ? "text-white/40" : "text-foreground/40"}`}>Mínimo de 6 caracteres</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={labelClass}>Confirmar Senha *</Label>
              <div className="relative">
                <Lock className={iconClass} />
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required disabled={loading} minLength={6} autoComplete="new-password" className={inputClass} />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground hover:from-primary/90 hover:to-primary/60 shadow-lg shadow-primary/25 transition-all font-semibold text-sm tracking-wide"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Criando conta...
                </div>
              ) : (
                'Criar Conta'
              )}
            </Button>

            <Link to="/login" className="block">
              <Button type="button" variant="ghost" className={`w-full gap-2 text-xs ${isDark ? "text-white/50 hover:text-white/70" : "text-foreground/50 hover:text-foreground/70"}`}>
                Cancelar
              </Button>
            </Link>

            <p className={`text-xs text-center ${isDark ? "text-white/50" : "text-foreground/50"}`}>
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary font-semibold hover:text-primary/80 hover:underline transition-colors">Faça login</Link>
            </p>
          </form>
        </div>

        <p className={`text-center text-[10px] mt-6 ${isDark ? "text-white/30" : "text-foreground/30"}`}>
          © {new Date().getFullYear()} FlowAtend. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
