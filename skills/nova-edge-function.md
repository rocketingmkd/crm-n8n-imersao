Crie e faça deploy de uma nova Supabase Edge Function para o projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia `supabase/functions/gerenciar-usuarios-organizacao/index.ts` para usar como template — é o padrão mais atual do projeto.

2. **Crie o arquivo:** `supabase/functions/nome-da-funcao/index.ts`

3. **Estrutura obrigatória da Edge Function:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok = (data: object) =>
  new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const fail = (msg: string) =>
  new Response(JSON.stringify({ success: false, error: msg }), {
    status: 200, // sempre 200 para evitar FunctionsHttpError no SDK
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // AUTENTICAÇÃO — obrigatório em todas as funções
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!token) return fail('Não autenticado.')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return fail('Token inválido. Faça login novamente.')

    // VERIFICAÇÃO DE PERMISSÃO (se necessário)
    const { data: perfil } = await supabaseAdmin
      .from('perfis')
      .select('super_admin, funcao, id_organizacao')
      .eq('id', user.id)
      .single()

    // Para funções de super admin:
    // if (!perfil?.super_admin) return fail('Apenas super admins podem executar esta ação')

    // LÓGICA DA FUNÇÃO
    const body = await req.json()
    // ...

    return ok({ resultado: 'ok' })

  } catch (error) {
    console.error('Erro:', error)
    return fail(error?.message || 'Erro interno')
  }
})
```

4. **Regras obrigatórias:**
   - Sempre retorne `status: 200` — nunca 400/401/500 (quebra o SDK do frontend)
   - Use `success: false + error: msg` para erros, `success: true` para sucesso
   - Sempre verifique autenticação com `supabaseAdmin.auth.getUser(token)`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` são injetados automaticamente

5. **No frontend**, chame a função assim:
   ```typescript
   const { data, error } = await supabase.functions.invoke('nome-da-funcao', {
     body: { chave: 'valor' },
   });
   if (error) throw new Error(error.message);
   if (data?.error) throw new Error(data.error);
   ```

6. **Deploy:**
   ```bash
   SUPABASE_ACCESS_TOKEN=seu_token /opt/homebrew/bin/supabase functions deploy nome-da-funcao \
     --project-ref detsacgocmirxkgjusdf \
     --no-verify-jwt
   ```
   O `--no-verify-jwt` é obrigatório neste projeto (gateway JWT incompatível com novo formato de chave).

7. Atualize `skills/deploy-functions.md` adicionando o nome da nova função na lista.
