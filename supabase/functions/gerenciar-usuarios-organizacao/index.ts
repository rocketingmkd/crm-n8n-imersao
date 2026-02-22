import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)

    if (!user) {
      throw new Error('Não autenticado')
    }

    // Verificar se é super admin (tabela: perfis, coluna: super_admin)
    const { data: perfil } = await supabaseAdmin
      .from('perfis')
      .select('super_admin')
      .eq('id', user.id)
      .single()

    if (!perfil || !perfil.super_admin) {
      throw new Error('Apenas super admins podem gerenciar usuários')
    }

    const body = await req.json()
    const { action, organizationId, userId, userData } = body

    console.log('📋 Ação:', action)

    if (action === 'create') {
      const { fullName, email, password, role } = userData

      console.log('➕ Criando usuário:', email)

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        throw authError || new Error('Erro ao criar usuário')
      }

      console.log('✅ Usuário criado no Auth:', authData.user.id)

      // Criar perfil (tabela: perfis, colunas: id_organizacao, nome_completo, funcao, super_admin, ativo)
      const { error: perfilError } = await supabaseAdmin
        .from('perfis')
        .insert({
          id: authData.user.id,
          id_organizacao: organizationId,
          nome_completo: fullName,
          funcao: role,
          super_admin: false,
          ativo: true,
        })

      if (perfilError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw perfilError
      }

      console.log('✅ Perfil criado')

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: authData.user.id, email: authData.user.email, nome_completo: fullName, funcao: role },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (action === 'delete') {
      console.log('🗑️ Deletando usuário:', userId)

      const { error: perfilError } = await supabaseAdmin
        .from('perfis')
        .delete()
        .eq('id', userId)

      if (perfilError) throw perfilError

      console.log('✅ Perfil deletado')

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authError) throw authError

      console.log('✅ Usuário deletado do Auth')

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else {
      throw new Error('Ação inválida')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerenciar usuário' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
