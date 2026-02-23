import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sun, Moon } from 'lucide-react';
import { AppLogo } from "@/components/AppLogo";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="relative min-h-screen flex items-center justify-center liquid-bg p-4">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 h-9 w-9 rounded-full liquid-glass text-muted-foreground hover:text-foreground"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="relative w-full max-w-[400px] liquid-glass-strong rounded-2xl p-8 space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <AppLogo variant="platform" height={96} />
          </div>
          <p className="text-sm text-muted-foreground">
            Informe seu email e senha para acessar o sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground text-xs font-medium">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="liquid-glass-input rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground text-xs font-medium">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="liquid-glass-input rounded-xl h-11"
            />
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Esqueceu a sua senha?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-pink transition-all font-semibold"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-primary font-semibold hover:text-primary/80 hover:underline transition-colors">
              Cadastre-se agora
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
