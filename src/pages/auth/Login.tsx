import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
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
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 h-9 w-9 rounded-full border border-border bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 pointer-events-none" />
      
      <Card className="relative w-full max-w-[400px] border-border bg-card shadow-xl">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <AppLogo variant="platform" height={48} />
          </div>
          <div>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Informe seu email e senha para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
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
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
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
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-pink transition-all font-semibold"
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
