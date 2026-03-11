import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sun, Moon, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { AppLogo } from "@/components/AppLogo";
import LanguageSelector from "@/components/LanguageSelector";
import loginBg from "@/assets/login-bg.jpg";
import loginBgVideo from "@/assets/login-bg-video.mp4";
import { APP_VERSION } from "@/lib/version";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const { data: fraseLogin } = useQuery({
    queryKey: ['frase-login'],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes_globais')
        .select('frase_login')
        .single();
      return (data as any)?.frase_login || t('auth.defaultPhrase');
    },
    staleTime: 60_000,
  });

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

  const isDark = theme === 'dark';

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fullscreen background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={loginBg}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={loginBgVideo} type="video/mp4" />
      </video>
      {/* Overlay — adapts to theme */}
      <div className={isDark ? "absolute inset-0 bg-black/50" : "absolute inset-0 bg-white/60 backdrop-blur-sm"} />

      {/* Theme toggle + Language */}
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

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-[440px] mx-4">
        <div className={`relative rounded-3xl backdrop-blur-2xl shadow-2xl p-8 sm:p-10 space-y-6 ${
          isDark
            ? "border border-white/10 bg-white/5 shadow-black/40"
            : "border border-black/5 bg-white/70 shadow-black/10"
        }`}>
          {/* Inner glow */}
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
            <p className={`text-sm ${isDark ? "text-white/60" : "text-foreground/60"}`}>
              {fraseLogin || t('auth.defaultPhrase')}
            </p>
            <div className={`flex items-center justify-center gap-1.5 text-xs ${isDark ? "text-white/30" : "text-foreground/30"}`}>
              <Sparkles className="h-3 w-3" />
              <span>{t('auth.pressEnter')}</span>
              <Sparkles className="h-3 w-3" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-foreground/40"}`} />
              <Input
                type="email"
                placeholder={t('auth.email')}
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

            {/* Password */}
            <div className="relative">
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-foreground/40"}`} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className={`h-12 pl-11 pr-11 rounded-xl backdrop-blur-sm focus-visible:ring-primary/50 focus-visible:border-primary/50 ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    : "bg-black/5 border-black/10 text-foreground placeholder:text-foreground/40"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  isDark ? "text-white/40 hover:text-white/70" : "text-foreground/40 hover:text-foreground/70"
                }`}
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
                {t('auth.forgotPassword')}
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
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {t('auth.signingIn')}
                </div>
              ) : (
                <>{t('auth.signIn')}</>
              )}
            </Button>

            {/* Register link */}
            <p className={`text-xs text-center pt-2 ${isDark ? "text-white/50" : "text-foreground/50"}`}>
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:text-primary/80 hover:underline transition-colors">
                {t('auth.createAccount')}
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className={`text-center text-[10px] mt-6 ${isDark ? "text-white/30" : "text-foreground/30"}`}>
          © {new Date().getFullYear()} FlowAtend v{APP_VERSION}. {t('auth.copyright')}
        </p>
      </div>
    </div>
  );
}
