import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { AppLogo } from "@/components/AppLogo";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (error) {
      // Erro já tratado no AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center liquid-bg p-4">
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {sent ? 'Email Enviado!' : 'Recuperar Senha'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? 'Verifique sua caixa de entrada' : 'Digite seu email para receber instruções'}
            </p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Se o email <strong className="text-foreground">{email}</strong> estiver cadastrado, você receberá instruções para redefinir sua senha.
            </p>
            <Link to="/login" className="block">
              <Button variant="outline" className="w-full gap-2 rounded-xl h-11 liquid-glass-input">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-xs font-medium">Email</Label>
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

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-pink font-semibold"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Email'}
            </Button>

            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o Login
              </Button>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
