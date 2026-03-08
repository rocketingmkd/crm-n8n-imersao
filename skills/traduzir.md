Adicione traduções (pt-BR, en, es) para novas strings de interface no projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. **Localize os arquivos de tradução em `src/i18n/locales/`:**
   - `pt-BR.json` — Português (padrão)
   - `en.json` — Inglês
   - `es.json` — Espanhol

2. **Antes de adicionar**, pesquise se a string já existe:
   ```bash
   grep -r "texto_da_chave" src/i18n/locales/
   ```

3. **Estrutura de chaves — use namespace por área:**
   ```json
   {
     "common": { "salvar": "Salvar", "cancelar": "Cancelar", "excluir": "Excluir" },
     "auth": { "entrar": "Entrar", "sair": "Sair" },
     "crm": { "novo_contato": "Novo Contato", "buscar": "Buscar contatos..." },
     "agenda": { "novo_agendamento": "Novo Agendamento" },
     "configuracoes": { "agente_ia": "Agente de IA" },
     "super_admin": { "organizacoes": "Empresas", "planos": "Planos" }
   }
   ```

4. **Chaves:** snake_case em português, sem acentos (ex: `novo_agendamento`, `nao_encontrado`)

5. **Adicione a mesma chave nos 3 arquivos** com a tradução equivalente:
   - `pt-BR.json`: texto em português natural
   - `en.json`: tradução em inglês
   - `es.json`: tradução em espanhol

6. **No componente React**, use o hook `useTranslation`:
   ```typescript
   import { useTranslation } from "react-i18next";

   export function MeuComponente() {
     const { t } = useTranslation();
     return <Button>{t('common.salvar')}</Button>;
   }
   ```

7. **Para strings com variáveis:**
   ```json
   // locales/pt-BR.json
   { "bem_vindo": "Bem-vindo, {{nome}}!" }
   ```
   ```typescript
   t('bem_vindo', { nome: usuario.nome_completo })
   ```

8. **Para plurais:**
   ```json
   { "contato_count": "{{count}} contato", "contato_count_plural": "{{count}} contatos" }
   ```

9. Nunca deixe string hardcoded em português sem chave de tradução em componentes que já usam `useTranslation`.

10. Após adicionar as chaves, rode o app e verifique se os 3 idiomas exibem corretamente usando o seletor de idioma no header.
