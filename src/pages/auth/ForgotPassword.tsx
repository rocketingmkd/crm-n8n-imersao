import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sun, Moon, ArrowLeft, Mail } from 'lucide-react';
import { AppLogo } from "@/components/AppLogo";
import loginBg from "@/assets/login-bg.jpg";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className={isDark ? "absolute inset-0 bg-black/50" : "absolute inset-0 bg-white/60 backdrop-blur-sm"} />

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={`fixed top-4 right-4 z-50 h-9 w-9 rounded-full backdrop-blur-md border transition-colors ${
          isDark
            ? "bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20"
            : "bg-black/10 border-black/10 text-foreground/70 hover:text-foreground hover:bg-black/15"
        }`}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="relative z-10 w-full max-w-[440px] mx-4">
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

          <div className="relative space-y-3 text-center">
            <div className="flex justify-center">
              <AppLogo variant="platform" height={64} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-foreground"}`}>
                {sent ? 'Email Enviado!' : 'Recuperar Senha'}
              </h1>
              <p className={`text-sm mt-1 ${isDark ? "text-white/60" : "text-foreground/60"}`}>
                {sent ? 'Verifique sua caixa de entrada' : 'Digite seu email para receber instruções'}
              </p>
            </div>
          </div>

          {sent ? (
            <div className="relative space-y-4">
              <p className={`text-center text-sm ${isDark ? "text-white/60" : "text-foreground/60"}`}>
                Se o email <strong className={isDark ? "text-white" : "text-foreground"}>{email}</strong> estiver cadastrado, você receberá instruções para redefinir sua senha.
              </p>
              <Link to="/login" className="block">
                <Button variant="outline" className={`w-full gap-2 rounded-xl h-12 backdrop-blur-sm ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    : "bg-black/5 border-black/10 text-foreground hover:bg-black/10"
                }`}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={`text-xs font-medium ${isDark ? "text-white/70" : "text-foreground/70"}`}>Email</Label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-foreground/40"}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className={`h-12 pl-11 pr-4 rounded-xl backdrop-blur-sm focus-visible:ring-primary/50 focus-visible:border-primary/50 ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        : "bg-black/5 border-black/10 text-foreground placeholder:text-foreground/40"
                    }`}
                  />
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
                    Enviando...
                  </div>
                ) : (
                  'Enviar Email'
                )}
              </Button>

              <Link to="/login" className="block">
                <Button variant="ghost" className={`w-full gap-2 text-xs ${isDark ? "text-white/50 hover:text-white/70" : "text-foreground/50 hover:text-foreground/70"}`}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para o Login
                </Button>
              </Link>
            </form>
          )}
        </div>

        <p className={`text-center text-[10px] mt-6 ${isDark ? "text-white/30" : "text-foreground/30"}`}>
          © {new Date().getFullYear()} FlowAtend. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
