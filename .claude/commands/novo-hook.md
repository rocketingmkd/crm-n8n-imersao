Crie um novo hook React Query para o projeto FlowAtend seguindo as convenções do projeto.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia um hook existente similar em `src/hooks/` antes de criar (ex: `useContatos.ts`, `useAgendamentos.ts`) para manter consistência.

2. **Arquivo:** `src/hooks/useNomeHook.ts` (camelCase com prefixo `use`)

3. **Estrutura padrão:**
   - `useNomeRecurso()` → `useQuery` para leitura (lista ou item)
   - `useCriarNome()` → `useMutation` para criação
   - `useAtualizarNome()` → `useMutation` para atualização
   - `useExcluirNome()` → `useMutation` para exclusão

4. **Query keys:** Use array descritivo, ex: `['contatos', id_organizacao]`

5. **Supabase:** Use `import { supabase } from "@/lib/supabase"` — nunca instancie o cliente diretamente.

6. **Organização:** Sempre filtre por `id_organizacao` usando `useAuth()`:
   ```typescript
   const { organization } = useAuth();
   // enabled: !!organization?.id
   // filter: .eq('id_organizacao', organization.id)
   ```

7. **Invalidação:** Após mutations, invalide as queries relacionadas com `queryClient.invalidateQueries`.

8. **Tipos:** Use os tipos de `src/types/database.ts` ou `src/integrations/supabase/types.ts`.

9. **Nomenclatura PT-BR:** Campos do banco em snake_case português (`id_organizacao`, `criado_em`).

10. Se o hook substitui ou estende outro existente, verifique se precisa atualizar os re-exports de compatibilidade em `src/hooks/useContacts.ts`, `useAppointments.ts`, etc.
