import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
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
      });
      
      // Redirecionar para login
      navigate('/login');
    } catch (error) {
      // Erro já tratado no AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md card-luxury border-border/50">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Criar Conta
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Crie sua conta e comece a gerenciar sua empresa
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                placeholder="Dr. João Silva"
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

