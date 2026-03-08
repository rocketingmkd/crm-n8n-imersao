Diagnostique e corrija erros no projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. **Antes de qualquer correção**, leia os arquivos relevantes para entender o contexto — nunca sugira fix sem ter lido o código.

2. **Erros TypeScript (build/lint):**
   - Rode `npm run build` para ver todos os erros de uma vez
   - Erros comuns: tipo `null` não tratado, propriedade inexistente, import errado
   - Verifique se o tipo está em `src/types/database.ts` ou `src/integrations/supabase/types.ts`
   - Use o skill `/atualizar-tipos` se o erro for de schema desatualizado

3. **Erros de runtime no browser (console):**
   - `Cannot read properties of undefined` → provavelmente dado ainda carregando; adicione optional chaining `?.`
   - `useAuth must be used within AuthProvider` → componente fora do contexto — veja `src/App.tsx` se está dentro do `<AuthContext>`
   - `supabase: relation does not exist` → tabela não existe no banco — execute a migration pendente

4. **Dados não aparecem (query retorna vazio):**
   - Verifique se o usuário tem `id_organizacao` preenchido no perfil
   - Verifique se a RLS está bloqueando — teste no Supabase SQL Editor com `SET role authenticated;`
   - Confirme que `enabled: !!organization?.id` está presente no `useQuery`
   - Verifique o filtro: `.eq('id_organizacao', organization.id)` usa o campo correto

5. **Mutation não salva / erro silencioso:**
   - Adicione `console.error` no `onError` temporariamente para ver o erro
   - Verifique se o campo `id_organizacao` está sendo passado no payload do insert
   - Verifique violações de constraint no Supabase → Dashboard → Logs → Postgres

6. **Problema de RLS (Row Level Security):**
   - Sintoma: query retorna array vazio mesmo com dados no banco
   - Diagnóstico no SQL Editor:
     ```sql
     -- Simular acesso do usuário
     SET request.jwt.claims = '{"sub": "uuid-do-usuario"}';
     SELECT * FROM nome_tabela;
     ```
   - Use o skill `/rls-policy` para revisar/criar policies

7. **Erros de autenticação (401/403):**
   - Token expirado: o Supabase renova automaticamente — se persistir, o usuário deve fazer login novamente
   - `JWT expired` em edge functions: verifique se o cliente está passando o token correto
   - Verifique `src/lib/supabase.ts` — o cliente deve usar `persistSession: true`

8. **Webhook n8n não funciona:**
   - Verifique se a URL em `src/lib/config.ts` está correta
   - Teste diretamente com curl: `curl -X POST URL -H "Content-Type: application/json" -d '{}'`
   - Qualquer resposta HTTP = n8n online (mesmo erro 4xx)
   - Sem resposta (ECONNREFUSED) = n8n offline ou URL errada

9. **Componente não re-renderiza após mutation:**
   - Verifique se `queryClient.invalidateQueries` está sendo chamado no `onSuccess`
   - A query key no `invalidateQueries` deve ser idêntica à do `useQuery`
   - Confirme que o hook está no mesmo escopo do provider do React Query

10. **Performance — query lenta:**
    - Verifique se há índice na coluna `id_organizacao` (deve existir em toda tabela com RLS)
    - Evite `select('*')` em tabelas grandes — especifique as colunas necessárias
    - Use `staleTime` no `useQuery` para evitar refetch desnecessário

11. **Erro de import circular:**
    - Sintoma: módulo aparece como `undefined` no runtime
    - Diagnóstico: `grep -r "from.*NomeArquivo"` e verifique se A importa B que importa A
    - Solução: mova o tipo/função compartilhado para um arquivo terceiro

12. **Após identificar e corrigir**, rode `npm run build` para confirmar zero erros TypeScript antes de considerar resolvido.
