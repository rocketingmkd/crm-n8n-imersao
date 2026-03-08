Adicione políticas de Row Level Security (RLS) para uma tabela do projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia o `supabase/instalar_banco_de_dados.sql` para ver como as políticas RLS existentes estão escritas — use como template.

2. **Padrão obrigatório de RLS multi-tenant no FlowAtend:**
   - Toda tabela ligada a uma org deve filtrar por `id_organizacao`
   - Use as funções auxiliares do banco: `obter_id_organizacao_usuario()` e `usuario_e_super_admin()`

3. **Template de políticas para tabela com `id_organizacao`:**
```sql
-- Habilitar RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê apenas registros da sua org (ou super admin vê tudo)
CREATE POLICY "nome_tabela_select" ON nome_tabela
  FOR SELECT USING (
    id_organizacao = obter_id_organizacao_usuario()
    OR usuario_e_super_admin()
  );

-- INSERT: usuário insere apenas na sua org
CREATE POLICY "nome_tabela_insert" ON nome_tabela
  FOR INSERT WITH CHECK (
    id_organizacao = obter_id_organizacao_usuario()
  );

-- UPDATE: usuário atualiza apenas na sua org
CREATE POLICY "nome_tabela_update" ON nome_tabela
  FOR UPDATE USING (
    id_organizacao = obter_id_organizacao_usuario()
  );

-- DELETE: usuário exclui apenas na sua org
CREATE POLICY "nome_tabela_delete" ON nome_tabela
  FOR DELETE USING (
    id_organizacao = obter_id_organizacao_usuario()
  );
```

4. **Para tabelas globais** (sem `id_organizacao`, ex: `configuracoes_globais`):
```sql
ALTER TABLE configuracoes_globais ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "configuracoes_globais_select" ON configuracoes_globais
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas super admin pode modificar
CREATE POLICY "configuracoes_globais_update" ON configuracoes_globais
  FOR UPDATE USING (usuario_e_super_admin());
```

5. **Para tabelas de super admin puro** (ex: `planos_assinatura`):
```sql
ALTER TABLE planos_assinatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planos_select" ON planos_assinatura
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "planos_insert_update_delete" ON planos_assinatura
  FOR ALL USING (usuario_e_super_admin());
```

6. **Limites de plano via RLS** — se uma tabela tem limite de registros por plano, adicione uma policy de INSERT que verifica o limite:
```sql
CREATE POLICY "contatos_insert_limite" ON contatos
  FOR INSERT WITH CHECK (
    id_organizacao = obter_id_organizacao_usuario()
    AND (
      -- Verifica se não atingiu o limite do plano (null = ilimitado)
      (SELECT max_contatos FROM planos_assinatura pa
       JOIN organizacoes o ON o.plano_assinatura = pa.id_plano
       WHERE o.id = obter_id_organizacao_usuario()) IS NULL
      OR
      (SELECT COUNT(*) FROM contatos WHERE id_organizacao = obter_id_organizacao_usuario())
      < (SELECT max_contatos FROM planos_assinatura pa
         JOIN organizacoes o ON o.plano_assinatura = pa.id_plano
         WHERE o.id = obter_id_organizacao_usuario())
    )
  );
```

7. **Após criar as policies:**
   - Adicione-as também no `supabase/instalar_banco_de_dados.sql` na seção correspondente à tabela
   - Use o skill `/migration` para gerar o arquivo de migration incremental

8. **Verificação:** Teste acessando os dados com um usuário normal (não super admin) e confirme que ele só vê dados da própria org.

9. **NUNCA** crie tabela sem RLS em produção — toda tabela com dados de tenant precisa ter `ENABLE ROW LEVEL SECURITY`.
