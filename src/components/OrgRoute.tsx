import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface OrgRouteProps {
  children: React.ReactNode;
}

/**
 * Componente para proteger rotas de organizações (não super admin)
 */
export default function OrgRoute({ children }: OrgRouteProps) {
  const { user, profile, loading, isSuperAdmin } = useAuth();

  // Aguardar carregamento completo
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Não autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Aguardar profile ser carregado após login
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Super admin vai para seu painel
  if (isSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  // Org admin sem organização - erro
  if (!profile.id_organizacao) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

