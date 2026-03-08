Implemente uma funcionalidade controlada por plano de assinatura no projeto FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia `src/hooks/usePlanFeatures.ts` e `src/components/PlanGuard.tsx` para entender o sistema de planos.

2. **Entenda os 4 planos:** `plano_a`, `plano_b`, `plano_c`, `plano_d`
   - Definidos na tabela `planos_assinatura`
   - Cada plano tem features booleanas e limites numéricos (`null` = ilimitado)

3. **Tipos de controle disponíveis:**

   **a) Feature booleana** (habilitar/desabilitar módulo inteiro):
   ```typescript
   // Em usePlanFeatures.ts, verifique se já existe a feature ou adicione
   const temFeature = planFeatures?.atendimento_inteligente ?? false;
   ```

   **b) Limite numérico** (max de registros):
   ```typescript
   const { maxContatos, maxUsuarios } = usePlanFeatures();
   const atingiuLimite = contatos.length >= (maxContatos ?? Infinity);
   ```

4. **Para bloquear uma página/seção inteira**, use `PlanGuard`:
   ```tsx
   import { PlanGuard } from "@/components/PlanGuard";

   <PlanGuard feature="atendimento_inteligente">
     <MinhaPagina />
   </PlanGuard>
   ```

5. **Para bloquear um botão/ação**, use `usePlanFeatures` diretamente:
   ```tsx
   const { hasFeature, isAtLimit } = usePlanFeatures();

   <Button
     disabled={!hasFeature('integracao_whatsapp')}
     onClick={handleConectar}
   >
     Conectar WhatsApp
   </Button>
   ```

6. **Para mostrar alerta de limite**, use `LimitAlert`:
   ```tsx
   import { LimitAlert } from "@/components/LimitAlert";

   <LimitAlert
     atual={contatos.length}
     maximo={maxContatos}
     entidade="contatos"
   />
   ```

7. **Se precisar adicionar uma nova feature ao banco:**
   - Use o skill `/migration` para adicionar a coluna em `planos_assinatura`
   - Adicione a coluna como `BOOLEAN DEFAULT false` (planos básicos) ou `true` (planos superiores)
   - Atualize `usePlanFeatures.ts` para expor a nova feature
   - Exemplo: `integracao_calendario BOOLEAN DEFAULT false`

8. **Nunca** bloqueie funcionalidades só no frontend — garanta que a RLS do Supabase também proteja os dados (um usuário não deve conseguir inserir registros além do limite mesmo via API).

9. **Para super admin**: funcionalidades de super admin nunca são controladas por plano — ignore PlanGuard nessas áreas.
