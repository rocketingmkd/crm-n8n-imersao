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
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verifica autenticação usando o token do header + service role (mais robusto)
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return fail('Não autenticado. Faça login novamente.')
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return fail('Token inválido. Faça login novamente.')
    }

    console.log('✅ Usuário autenticado:', user.id)

    // Verifica se é super admin
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfis')
      .select('super_admin')
      .eq('id', user.id)
      .single()

    if (perfilError) {
      console.error('Perfil error:', perfilError.message)
      return fail('Erro ao verificar permissões: ' + perfilError.message)
    }

    if (!perfil?.super_admin) {
      return fail('Apenas super admins podem gerenciar usuários')
    }

    const body = await req.json()
    const { action, organizationId, userId, userData } = body

    console.log('📋 Ação:', action)

    if (action === 'create') {
      const { fullName, email, password, role } = userData

      console.log('➕ Criando usuário:', email)

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError || !authData.user) {
        return fail(createError?.message || 'Erro ao criar usuário no Auth')
      }

      console.log('✅ Usuário criado no Auth:', authData.user.id)

      const { error: perfilInsertError } = await supabaseAdmin
        .from('perfis')
        .upsert(
          {
            id: authData.user.id,
            id_organizacao: organizationId,
            nome_completo: fullName,
            funcao: role,
            super_admin: false,
            ativo: true,
          },
          { onConflict: 'id' }
        )

      if (perfilInsertError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return fail('Erro ao criar perfil: ' + perfilInsertError.message)
      }

      console.log('✅ Perfil criado/atualizado')

      return ok({
        user: { id: authData.user.id, email: authData.user.email, nome_completo: fullName, funcao: role },
      })

    } else if (action === 'delete') {
      console.log('🗑️ Deletando usuário:', userId)

      const { error: perfilDeleteError } = await supabaseAdmin
        .from('perfis')
        .delete()
        .eq('id', userId)

      if (perfilDeleteError) {
        return fail('Erro ao deletar perfil: ' + perfilDeleteError.message)
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        return fail('Erro ao deletar usuário: ' + authDeleteError.message)
      }

      console.log('✅ Usuário deletado')

      return ok({ message: 'Usuário deletado com sucesso' })

    } else {
      return fail('Ação inválida: ' + action)
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return fail(error?.message || 'Erro interno ao gerenciar usuário')
  }
})
