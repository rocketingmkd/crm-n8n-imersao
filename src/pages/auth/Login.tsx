import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import flowgrammersLogo from "@/assets/logo-flowgrammers.png";

function FlowgrammersLogo({ size = 48 }: { size?: number }) {
  return (
    <img
      src={flowgrammersLogo}
      alt="Flowgrammers"
      style={{ height: size, width: 'auto' }}
      className="object-contain"
    />
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile && !authLoading) {
      if (profile.is_super_admin) {
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      
      <Card className="relative w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <FlowgrammersLogo size={56} />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Flow<span className="text-gradient-pink">Clinic</span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Informe seu email e senha para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground text-sm">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30"
              />
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Esqueceu a sua senha?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full gradient-pink text-primary-foreground shadow-pink hover:opacity-90 transition-all font-semibold"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
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
