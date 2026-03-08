Crie um formulário com React Hook Form + Zod no projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia um formulário existente similar antes de criar (ex: `src/pages/super-admin/OrganizationForm.tsx`, `src/pages/AgentIA.tsx`) para manter consistência.

2. **Stack de formulários do projeto:**
   - `react-hook-form` — gerenciamento de estado e validação
   - `zod` — schema de validação
   - `@hookform/resolvers/zod` — bridge entre os dois
   - Componentes: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` de `@/components/ui/form`

3. **Estrutura padrão completa:**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function MeuFormulario({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", email: "", telefone: "" },
  });

  const { mutate, isPending } = useMinhaAction(); // hook de mutation

  const onSubmit = (data: FormData) => {
    mutate(data, {
      onSuccess: () => {
        toast.success("Salvo com sucesso");
        form.reset();
        onSuccess?.();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </Form>
  );
}
```

4. **Para formulário de edição** (pré-popula com dados existentes):
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    nome: item?.nome ?? "",
    email: item?.email ?? "",
  },
});

// Repopula quando o item muda (ex: modal que reutiliza o form)
useEffect(() => {
  if (item) form.reset({ nome: item.nome, email: item.email ?? "" });
}, [item, form]);
```

5. **Para Select/Combobox:**
```typescript
<FormField
  control={form.control}
  name="situacao"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Situação</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="inativo">Inativo</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

6. **Para Textarea:**
```typescript
import { Textarea } from "@/components/ui/textarea";
// Substitua <Input> por <Textarea rows={4} {...field} />
```

7. **Validações Zod comuns do projeto:**
```typescript
z.string().min(1, "Campo obrigatório")
z.string().url("URL inválida").optional().or(z.literal(""))
z.string().regex(/^\d{10,15}$/, "Telefone inválido").optional()
z.enum(['ativo', 'inativo'])
z.number().min(0).max(100)
z.boolean().default(false)
```

8. **Formulários em modais (Dialog):**
   - Coloque o `<Form>` dentro do `<DialogContent>`
   - Use `DialogFooter` para os botões de ação
   - Resete o form no `onOpenChange` quando fechar: `form.reset()`

9. **Nunca** use `style={{}}` inline — apenas Tailwind. Nunca use `onChange` direto em inputs controlados pelo `react-hook-form` — use `{...field}` ou `field.onChange`.
