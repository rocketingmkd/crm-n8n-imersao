import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sun, Moon, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { AppLogo } from "@/components/AppLogo";
import loginBg from "@/assets/login-bg.jpg";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile && !authLoading) {
      if (profile.super_admin) {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/app/dashboard');
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fullscreen background image */}
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 h-9 w-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white hover:bg-white/20"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-[440px] mx-4">
        <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/40 p-8 sm:p-10 space-y-6">
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_30px_-8px_rgba(255,255,255,0.15)] pointer-events-none" />

          {/* Header */}
          <div className="relative space-y-3 text-center">
            <div className="flex justify-center">
              <AppLogo variant="platform" height={64} />
            </div>
            <p className="text-sm text-white/60">
              Seu universo de automações espera
            </p>
            <div className="flex items-center justify-center gap-1.5 text-white/30 text-xs">
              <Sparkles className="h-3 w-3" />
              <span>Pressione Enter para começar</span>
              <Sparkles className="h-3 w-3" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="h-12 pl-11 pr-4 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/50 focus-visible:border-primary/50 backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="h-12 pl-11 pr-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/50 focus-visible:border-primary/50 backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-primary/80 hover:text-primary hover:underline transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground hover:from-primary/90 hover:to-primary/60 shadow-lg shadow-primary/25 transition-all font-semibold text-sm tracking-wide"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Entrando...
                </div>
              ) : (
                'Entrar na Plataforma'
              )}
            </Button>

            {/* Register link */}
            <p className="text-xs text-center text-white/50 pt-2">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-primary font-semibold hover:text-primary/80 hover:underline transition-colors">
                Criar Conta
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-[10px] mt-6">
          © {new Date().getFullYear()} FlowAtend. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
