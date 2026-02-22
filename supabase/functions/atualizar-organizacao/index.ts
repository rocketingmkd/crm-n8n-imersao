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
      throw new Error('Apenas super admins podem atualizar organizações')
    }

    const { organizationId, name, isActive } = await req.json()

    console.log('📋 Atualizando organização:', organizationId)

    // Atualizar organização (tabela: organizacoes, colunas: nome, ativo)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizacoes')
      .update({
        nome: name,
        ativo: isActive,
      })
      .eq('id', organizationId)
      .select()
      .single()

    if (orgError) {
      throw orgError
    }

    console.log('✅ Organização atualizada')

    return new Response(
      JSON.stringify({ success: true, organization: orgData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao atualizar organização' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
