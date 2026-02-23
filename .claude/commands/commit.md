Crie um commit git bem formatado para as alterações atuais do projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Execute `git status` e `git diff --staged` para entender o que está sendo commitado.

2. Se nada estiver em staging, execute `git diff` para ver as mudanças não staged — então pergunte ao usuário quais arquivos incluir.

3. **Prefixos de commit (Conventional Commits):**
   - `feat:` — nova funcionalidade
   - `fix:` — correção de bug
   - `chore:` — manutenção, configs, dependências
   - `refactor:` — refatoração sem mudança de comportamento
   - `style:` — alterações visuais/CSS
   - `docs:` — documentação
   - `migration:` — nova migration SQL
   - `test:` — testes

4. **Formato da mensagem:**
   ```
   tipo(escopo): resumo curto em português (max 72 chars)

   - Detalhe 1 do que foi alterado
   - Detalhe 2 se necessário
   ```

5. **Escopo** (opcional, entre parênteses): área afetada — ex: `auth`, `crm`, `agenda`, `super-admin`, `n8n`, `db`, `hooks`

6. **Nunca commitar:**
   - `.env` com credenciais reais
   - Arquivos de build (`dist/`)
   - `node_modules/`

7. Use `git add` nos arquivos relevantes antes de commitar — prefira adicionar arquivos específicos em vez de `git add .`

8. Após o commit, mostre o hash e o resumo para confirmação.
