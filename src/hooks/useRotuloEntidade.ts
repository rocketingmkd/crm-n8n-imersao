import { useAuth } from "./useAuth";

export function useRotuloEntidade() {
  const { organization } = useAuth();
  const singular = organization?.rotulo_entidade ?? 'Cliente';
  const plural = organization?.rotulo_entidade_plural ?? 'Clientes';
  return {
    singular,
    plural,
    s: singular.toLowerCase(),
    p: plural.toLowerCase(),
  };
}

// Alias de compatibilidade
export const useEntityLabel = useRotuloEntidade;
