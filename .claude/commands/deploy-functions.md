Faça o deploy de Edge Functions Supabase do projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Liste as Edge Functions disponíveis em `supabase/functions/`:
   - `criar-organizacao/`
   - `gerenciar-usuarios-organizacao/`
   - `atualizar-organizacao/`

2. Se o argumento especificar uma função, faça deploy apenas dela. Caso contrário, faça deploy de todas.

3. **Pré-requisito:** Certifique-se de que o Supabase CLI está instalado e autenticado:
   ```bash
   supabase --version
   supabase projects list
   ```

4. **Comando de deploy:**
   ```bash
   # Uma função específica
   supabase functions deploy nome-da-funcao --project-ref <PROJECT_REF>

   # Todas as funções
   supabase functions deploy --project-ref <PROJECT_REF>
   ```

   O `PROJECT_REF` está em `supabase/config.toml` (campo `project_id`) ou na variável `VITE_SUPABASE_PROJECT_ID` do `.env`.

5. **Após o deploy:**
   - Confirme que a função aparece no painel Supabase → Edge Functions
   - Teste com um curl ou pela interface se houver endpoint documentado

6. **Variáveis de ambiente das funções:**
   As funções usam `Deno.env.get('SUPABASE_URL')` e `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — estas são injetadas automaticamente pelo Supabase. Não é necessário configurar manualmente.

7. **Se o deploy falhar:**
   - Verifique se a versão do Supabase CLI está atualizada (`supabase update`)
   - Verifique erros de TypeScript na função antes de tentar novamente
   - Nunca use `--no-verify-jwt` em produção sem justificativa explícita
