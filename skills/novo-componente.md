Crie um novo componente React reutilizável para o projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia componentes similares em `src/components/` antes de criar para manter consistência visual.

2. **Localização do arquivo:**
   - Componente de UI genérico (botão, card, badge customizado): `src/components/ui/nome-componente.tsx`
   - Componente de negócio (KPICard, LimitAlert, KanbanBoard): `src/components/NomeComponente.tsx`
   - Nunca crie em `src/pages/` — páginas ficam lá, componentes não

3. **Estrutura obrigatória:**
   ```typescript
   import { cn } from "@/lib/utils";

   interface NomeComponenteProps {
     // Props tipadas explicitamente
     className?: string;
   }

   export function NomeComponente({ className, ...props }: NomeComponenteProps) {
     return (
       <div className={cn("classes-base", className)}>
         {/* conteúdo */}
       </div>
     );
   }
   ```

4. **Estilo:**
   - Tailwind CSS para tudo — nunca `style={{}}` inline
   - Use `cn()` de `@/lib/utils` para classes condicionais
   - Siga o design system: `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`
   - Dark mode já funciona via CSS variables — não hardcode cores

5. **Ícones:** Use exclusivamente `lucide-react`

6. **Componentes shadcn disponíveis em `src/components/ui/`:**
   Button, Card, Badge, Input, Label, Select, Switch, Tabs, Dialog, AlertDialog,
   Avatar, Tooltip, Dropdown, Separator, Skeleton, Table, Form, etc.

7. **Props opcionais úteis:**
   - `className?: string` — sempre incluir para flexibilidade
   - `isLoading?: boolean` — mostre `<Skeleton>` ou spinner
   - `onAction?: () => void` — callbacks com nome descritivo

8. **Se o componente exibir dados do servidor:**
   - Receba os dados como props (componente burro) — nunca faça queries dentro
   - Quem usa o componente passa os dados (hook → página → componente)

9. **Exportação:** Use named export (`export function`) — nunca `export default` em componentes de `src/components/`
