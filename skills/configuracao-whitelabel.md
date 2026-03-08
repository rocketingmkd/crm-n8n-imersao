Adicione uma nova opção de configuração whitelabel ao painel super admin do FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia `src/pages/super-admin/Settings.tsx` e `supabase/instalar_banco_de_dados.sql` (seção `configuracoes_globais`) para entender a estrutura atual.

2. **Campos já existentes em `configuracoes_globais`:**
   - `nome_plataforma` — nome exibido na plataforma
   - `cor_primaria` — cor hex da UI (`#RRGGBB`)
   - `url_logo_plataforma` — logo para fundo escuro
   - `url_logo_plataforma_escuro` — logo para fundo claro
   - `whatsapp_suporte` — número WhatsApp do suporte
   - `email_suporte` — e-mail de suporte
   - `chave_openai` — API Key OpenAI global
   - `chave_elevenlabs` — API Key ElevenLabs
   - `fonte_sistema` — fonte aplicada globalmente

3. **Para adicionar um novo campo:**

   **Passo 1 — Migration SQL** (use o skill `/migration`):
   ```sql
   ALTER TABLE configuracoes_globais
   ADD COLUMN IF NOT EXISTS novo_campo TEXT;
   ```

   **Passo 2 — Atualizar o tipo TypeScript** em `src/integrations/supabase/types.ts` e `src/types/database.ts`.

   **Passo 3 — Adicionar o campo no formulário** em `src/pages/super-admin/Settings.tsx`:
   ```tsx
   <div className="space-y-2">
     <Label htmlFor="novo_campo">Nome do Campo</Label>
     <Input
       id="novo_campo"
       value={config.novo_campo ?? ''}
       onChange={(e) => setConfig(prev => ({ ...prev, novo_campo: e.target.value }))}
       placeholder="valor padrão"
     />
     <p className="text-xs text-muted-foreground">Descrição do campo.</p>
   </div>
   ```

   **Passo 4 — Garantir que o `handleSave` salva o novo campo** (já deve funcionar se usar spread do objeto `config`).

4. **Se o campo afeta a UI em tempo real** (como cor ou logo), aplique via CSS variables ou hook:
   - Para cor: use `aplicarCorPrimaria()` de `src/hooks/useCoresPataforma.ts`
   - Para logo: atualize `AppLogo.tsx` se necessário
   - Para fonte: veja `src/hooks/useFonteSistema.ts`

5. **Para exibir o campo nas organizações** (se for config por org, não global):
   - O campo vai em `configuracoes`, não em `configuracoes_globais`
   - Use `src/pages/Configuracoes.tsx` para edição

6. **Organize em abas** — o Settings.tsx usa tabs:
   - `visual` — cores, logos, fonte, nome
   - `ia_voz` — chaves OpenAI, ElevenLabs
   - `suporte` — WhatsApp, email
   - Coloque o novo campo na aba mais adequada ou crie uma nova se necessário

7. Valide campos sensíveis (API Keys) apenas na presença — não mostre valores completos, use `type="password"` ou máscara.
