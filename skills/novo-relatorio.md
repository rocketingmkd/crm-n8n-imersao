Adicione um novo relatório ou gráfico ao painel super admin do FlowAtend.

## Tarefa
$ARGUMENTS

## Instruções

1. Leia `src/pages/super-admin/Relatorios.tsx` e `src/pages/super-admin/Dashboard.tsx` para entender os padrões de gráficos e tabelas existentes.

2. **Biblioteca de gráficos:** Recharts — já instalada. Componentes disponíveis:
   - `BarChart` + `Bar` — barras verticais/horizontais
   - `LineChart` + `Line` — linhas temporais
   - `AreaChart` + `Area` — área preenchida
   - `PieChart` + `Pie` — pizza/donut
   - `ResponsiveContainer` — sempre envolva gráficos com este

3. **Padrão de query para relatórios:**
   ```typescript
   const { data = [], isLoading } = useQuery({
     queryKey: ['relatorio-nome', filtros],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('tabela')
         .select('coluna, count(*)')
         .eq('id_organizacao', orgId)
         .gte('criado_em', dataInicio)
         .lte('criado_em', dataFim);
       if (error) throw error;
       return data;
     },
   });
   ```

4. **Para relatórios cross-organização** (super admin vê todas):
   - Não filtre por `id_organizacao` — a RLS do super admin permite ver tudo
   - Use `supabase` direto sem filtro de org

5. **Skeleton de loading:**
   ```tsx
   if (isLoading) return (
     <div className="space-y-2">
       <Skeleton className="h-[200px] w-full" />
     </div>
   );
   ```

6. **Estilo dos gráficos** — use as CSS variables do tema:
   ```tsx
   <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
   <XAxis stroke="hsl(var(--muted-foreground))" />
   ```

7. **Se for uma nova página** de relatório, use o skill `/nova-pagina`.
   **Se for uma nova aba** na página Relatorios.tsx existente, adicione em `<Tabs>`.

8. **Filtros de período** — use o padrão já existente em Relatorios.tsx:
   - Botões: "Hoje", "7 dias", "30 dias", "3 meses"
   - Estado: `const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d')`

9. **Exportar CSV** — se necessário:
   ```typescript
   const exportarCsv = () => {
     const bom = '\uFEFF'; // UTF-8 BOM para Excel
     const csv = [cabecalho, ...linhas].join('\n');
     const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `relatorio-${Date.now()}.csv`;
     a.click();
   };
   ```

10. Nunca hardcode cores — use `hsl(var(--primary))`, `hsl(var(--muted))`, etc.
