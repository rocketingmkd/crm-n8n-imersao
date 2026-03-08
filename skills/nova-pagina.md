Crie uma nova página para o projeto FlowAtend seguindo as convenções do projeto.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia o `CLAUDE.md` para entender a stack e convenções antes de criar qualquer arquivo.

2. **Arquivo da página:**
   - Crie em `src/pages/NomePagina.tsx` (PascalCase)
   - Use functional component com TypeScript
   - Importe componentes de `@/components/ui/` (shadcn)
   - Use Tailwind CSS — nunca `style={{}}` inline
   - Toasts via `import { toast } from "sonner"`

3. **Dados do servidor:**
   - Use React Query (`useQuery` / `useMutation`) — crie um hook em `src/hooks/` se necessário
   - Nunca faça fetch direto na página
   - Invalide queries após mutations

4. **Registre a rota em `src/App.tsx`:**
   - Determine se é rota de organização (`/app/`) ou super admin (`/super-admin/`)
   - Adicione dentro do guard correto (`OrgRoute` ou `SuperAdminRoute`)
   - Importe a página no topo do arquivo

5. **Se for item de navegação**, adicione em `src/components/Layout.tsx` (org) ou `src/components/SuperAdminLayout.tsx` (super admin):
   - Inclua ícone do Lucide React
   - Defina `requiredFeature` se a feature for controlada por plano

6. **Tipos:** Se precisar de novos tipos, adicione em `src/types/database.ts` (manual) e `src/integrations/supabase/types.ts`.

7. Siga o padrão visual das páginas existentes: header com título + subtítulo, cards com `border-border`, textos com `text-foreground`/`text-muted-foreground`.
