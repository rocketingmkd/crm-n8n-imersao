Atualize os tipos TypeScript do projeto FlowAtend após mudanças no schema do banco de dados.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia `src/types/database.ts` e `src/integrations/supabase/types.ts` para entender a estrutura atual antes de qualquer alteração.

2. **O projeto tem dois arquivos de tipos — ambos devem ser atualizados:**
   - `src/types/database.ts` — tipos manuais simplificados usados pelos hooks
   - `src/integrations/supabase/types.ts` — tipos completos espelhando o schema Supabase

3. **Quando adicionar uma nova coluna a uma tabela existente:**

   Em `src/types/database.ts`, adicione o campo no tipo correspondente:
   ```typescript
   export interface Contato {
     id: string;
     id_organizacao: string;
     // ... campos existentes ...
     nova_coluna?: string | null; // use `?` se nullable no banco
   }
   ```

   Em `src/integrations/supabase/types.ts`, adicione nas três seções da tabela:
   ```typescript
   Tables: {
     contatos: {
       Row: {
         nova_coluna: string | null  // tipo exato do DB
       }
       Insert: {
         nova_coluna?: string | null  // opcional no insert
       }
       Update: {
         nova_coluna?: string | null  // opcional no update
       }
     }
   }
   ```

4. **Quando criar uma nova tabela:**

   Em `src/types/database.ts`:
   ```typescript
   export interface NomeSingular {
     id: string;
     id_organizacao: string;
     campo_texto: string;
     campo_opcional?: string | null;
     criado_em: string;
     atualizado_em: string;
   }

   export type CriarNomeSingular = Omit<NomeSingular, 'id' | 'criado_em' | 'atualizado_em'>;
   export type AtualizarNomeSingular = Partial<CriarNomeSingular>;
   ```

   Em `src/integrations/supabase/types.ts`, adicione na seção `Tables`:
   ```typescript
   nome_tabela: {
     Row: { /* todos os campos, nullable explícito */ }
     Insert: { /* campos opcionais com ? onde têm DEFAULT no banco */ }
     Update: { /* todos com ? */ }
     Relationships: []
   }
   ```

5. **Nomenclatura obrigatória:**
   - Interfaces TypeScript: PascalCase singular (`Contato`, `Agendamento`, `ConfigAgentIA`)
   - Campos: snake_case português igual ao banco (`id_organizacao`, `criado_em`)
   - Tipos nullable: `string | null` (nunca `string | undefined` para campos do banco)

6. **Novos enum values** — se adicionou um valor a um enum do banco, atualize o tipo union:
   ```typescript
   // Antes
   situacao: 'ativo' | 'inativo';
   // Depois (se adicionou 'arquivado')
   situacao: 'ativo' | 'inativo' | 'arquivado';
   ```

7. **Após atualizar os tipos**, verifique se algum hook ou componente precisa ser atualizado:
   ```bash
   # Procure usos do tipo antigo
   grep -r "NomeTipoAntigo" src/
   ```

8. **Rode o build para confirmar zero erros TypeScript:**
   ```bash
   npm run build
   ```
   Corrija todos os erros antes de continuar.

9. **Não gere tipos automaticamente via `supabase gen types`** durante o desenvolvimento — edite manualmente para manter consistência com a nomenclatura PT-BR do projeto.
