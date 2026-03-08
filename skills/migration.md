Crie uma nova migration SQL para o projeto FlowAtend seguindo rigorosamente as convenções do projeto.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia o arquivo `supabase/instalar_banco_de_dados.sql` para entender o schema atual e descobrir o número da próxima migration (procure por comentários `-- Migration` ou verifique a última alteração).

2. Crie o arquivo `supabase/migrations/{NNN}_{descricao_em_snake_case}.sql` onde `{NNN}` é o próximo número sequencial com 3 dígitos (ex: `038`, `039`).

3. O arquivo de migration deve conter APENAS o SQL incremental (ALTER TABLE, CREATE TABLE, etc.) — não o schema completo.

4. **Obrigatório:** Aplique também a mesma alteração no `supabase/instalar_banco_de_dados.sql` na seção correspondente, mantendo-o como o estado final e definitivo do banco.

5. **Convenções de nomenclatura obrigatórias:**
   - snake_case em Português Brasileiro para tudo
   - Tabelas: plural (`organizacoes`, `contatos`)
   - Colunas: `id_organizacao`, `criado_em`, `atualizado_em`
   - Enum values: português (`ativo/inativo`, `confirmado/pendente`)
   - Adicione trigger `trigger_atualizado_em` se a tabela tiver `atualizado_em`

6. Se a migration adicionar uma tabela nova, documente-a na seção "Tabelas criadas" do `supabase/INSTALACAO.md`.

7. Informe o SQL exato que o usuário deve rodar no Supabase SQL Editor para aplicar a migration em bancos já existentes.
