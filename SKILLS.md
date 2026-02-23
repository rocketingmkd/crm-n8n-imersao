# Skills — FlowAtend

Comandos disponíveis para o Claude Code neste projeto. Use `/nome-do-comando [argumentos]` no chat.

---

## `/migration` — Nova migration SQL

Cria uma migration SQL incremental seguindo as convenções do projeto (numeração sequencial, PT-BR snake_case) e atualiza o `instalar_banco_de_dados.sql`.

**Uso:**
```
/migration adicionar coluna foto_perfil à tabela perfis
/migration criar tabela campanhas com campos id_organizacao, nome, situacao
/migration adicionar índice em contatos(id_organizacao, criado_em)
```

**O que faz:**
- Descobre o próximo número sequencial (ex: `038`)
- Cria `supabase/migrations/038_descricao.sql` com o SQL incremental
- Aplica a mesma alteração em `supabase/instalar_banco_de_dados.sql`
- Documenta tabelas novas no `supabase/INSTALACAO.md`
- Fornece o SQL para rodar no Supabase SQL Editor

---

## `/nova-pagina` — Nova página React

Cria uma página completa com rota, hook de dados e item de navegação opcionais.

**Uso:**
```
/nova-pagina Relatórios financeiros em /app/relatorios para organizações
/nova-pagina Painel de audit log em /super-admin/audit-log para super admin
/nova-pagina Configurações de notificação em /app/notificacoes sem nav item
```

**O que faz:**
- Cria `src/pages/NomePagina.tsx` com shadcn/Tailwind
- Registra a rota em `src/App.tsx` no guard correto (`OrgRoute` ou `SuperAdminRoute`)
- Adiciona item de navegação em `Layout.tsx` ou `SuperAdminLayout.tsx` se solicitado
- Cria hook em `src/hooks/` se houver necessidade de dados

---

## `/novo-hook` — Novo hook React Query

Cria um hook de dados seguindo o padrão do projeto (useQuery/useMutation + Supabase + filtro por organização).

**Uso:**
```
/novo-hook CRUD de campanhas com campos nome, situacao, id_organizacao
/novo-hook buscar configurações de notificação por organização (somente leitura)
/novo-hook mutation para atualizar status de pagamento de contrato
```

**O que faz:**
- Cria `src/hooks/useNomeRecurso.ts`
- Exporta `useNomeRecurso()` (query), `useCriarNome()`, `useAtualizarNome()`, `useExcluirNome()` (mutations)
- Usa `useAuth()` para filtrar por `id_organizacao`
- Invalida queries após mutations

---

## `/commit` — Commit git formatado

Cria um commit com mensagem em Conventional Commits seguindo as convenções do projeto.

**Uso:**
```
/commit
/commit apenas os arquivos de migration e types
/commit feat para a feature de cores da plataforma
```

**O que faz:**
- Analisa `git status` e `git diff` para entender as mudanças
- Sugere prefixo correto (`feat`, `fix`, `migration`, `refactor`…)
- Formata mensagem com escopo e bullet points em PT
- Adiciona arquivos específicos (nunca `git add .` cego)

---

## `/deploy-functions` — Deploy de Edge Functions

Faz deploy das Supabase Edge Functions.

**Uso:**
```
/deploy-functions
/deploy-functions criar-organizacao
/deploy-functions todas
```

**O que faz:**
- Identifica o `project-ref` do `.env` ou `supabase/config.toml`
- Faz `supabase functions deploy` para a(s) função(ões) indicada(s)
- Confirma o sucesso e orienta sobre variáveis de ambiente

---

## Estrutura dos arquivos de skill

Cada skill fica em `.claude/commands/<nome>.md`. O placeholder `$ARGUMENTS` recebe o texto digitado após o nome do comando.

```
.claude/
└── commands/
    ├── migration.md
    ├── nova-pagina.md
    ├── novo-hook.md
    ├── commit.md
    └── deploy-functions.md
```

Para adicionar um novo skill, crie `.claude/commands/meu-skill.md` e documente-o aqui.
