import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Função para obter headers CORS baseado na origem
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  const originHeader = origin && allowedOrigins.includes(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': originHeader,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    console.log('🚀 Iniciando create-organization Edge Function...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization')
    const apikeyHeader = req.headers.get('apikey')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado: header Authorization ausente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const apikey = apikeyHeader || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!apikey) {
      return new Response(
        JSON.stringify({ error: 'Configuração inválida: anon key não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, apikey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado', details: userError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('✅ Usuário autenticado:', user.id);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verificar se é super admin (tabela: perfis, coluna: super_admin)
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfis')
      .select('super_admin')
      .eq('id', user.id)
      .single()

    console.log('👤 Perfil encontrado:', perfil);

    if (!perfil || !perfil.super_admin) {
      throw new Error('Apenas super admins podem criar organizações')
    }

    const {
      organizationName,
      adminEmail,
      adminPassword,
      adminFullName,
      isActive = true,
      subscriptionPlan = 'plano_a'
    } = await req.json()

    console.log('📋 Criando organização:', organizationName)

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    if (createUserError || !authData.user) {
      throw createUserError || new Error('Erro ao criar usuário')
    }

    console.log('✅ Usuário criado:', authData.user.id)

    // 2. Gerar identificador
    const identificador = organizationName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now()

    // 3. Criar organização (tabela: organizacoes, colunas: nome, ativo, plano_assinatura)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizacoes')
      .insert({
        nome: organizationName,
        identificador,
        ativo: isActive,
        plano_assinatura: subscriptionPlan,
      })
      .select()
      .single()

    if (orgError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw orgError
    }

    console.log('✅ Organização criada:', orgData.id)

    // 4. Criar perfil do admin (tabela: perfis, colunas: id_organizacao, nome_completo, funcao, super_admin, ativo)
    const { error: perfilInsertError } = await supabaseAdmin
      .from('perfis')
      .insert({
        id: authData.user.id,
        id_organizacao: orgData.id,
        nome_completo: adminFullName,
        funcao: 'admin',
        super_admin: false,
        ativo: true,
      })

    if (perfilInsertError) {
      await supabaseAdmin.from('organizacoes').delete().eq('id', orgData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw perfilInsertError
    }

    console.log('✅ Perfil criado')

    // 5. Criar configurações padrão (tabela: configuracoes, colunas: id_organizacao, nome_empresa, nome_responsavel)
    const { error: configError } = await supabaseAdmin
      .from('configuracoes')
      .insert({
        id_organizacao: orgData.id,
        nome_empresa: organizationName,
        nome_responsavel: adminFullName,
        plano_assinatura: subscriptionPlan,
      })

    if (configError) {
      await supabaseAdmin.from('perfis').delete().eq('id', authData.user.id)
      await supabaseAdmin.from('organizacoes').delete().eq('id', orgData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw configError
    }

    console.log('✅ Configurações criadas')
    console.log('🎉 Organização criada com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        organization: orgData,
        admin: { id: authData.user.id, email: adminEmail, nome_completo: adminFullName },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao criar organização' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
