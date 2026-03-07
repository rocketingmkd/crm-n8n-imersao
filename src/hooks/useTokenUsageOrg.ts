import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface TokenUsageDaily {
  date: string;
  tokens: number;
  cost: number;
}

export interface TokenUsageOrgResult {
  daily: TokenUsageDaily[];
  totalTokens: number;
  totalCost: number;
}

export function useTokenUsageOrg(start: Date, end: Date) {
  const { profile } = useAuth();
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["token-usage-org", profile?.id_organizacao, startStr, endStr],
    queryFn: async (): Promise<TokenUsageOrgResult> => {
      if (!profile?.id_organizacao) return { daily: [], totalTokens: 0, totalCost: 0 };

      const { data, error } = await supabase
        .from("uso_tokens")
        .select("total_tokens, custo_reais, criado_em")
        .eq("id_organizacao", profile.id_organizacao)
        .gte("criado_em", start.toISOString())
        .lte("criado_em", new Date(end.getTime() + 86400000).toISOString())
        .order("criado_em", { ascending: true });

      if (error) throw error;

      const map: Record<string, { tokens: number; cost: number }> = {};
      let totalTokens = 0;
      let totalCost = 0;

      (data || []).forEach((r: { total_tokens?: number; custo_reais?: number | null; criado_em?: string }) => {
        const date = (r.criado_em || "").slice(0, 10);
        if (!date) return;
        if (!map[date]) map[date] = { tokens: 0, cost: 0 };
        map[date].tokens += r.total_tokens || 0;
        map[date].cost += r.custo_reais || 0;
        totalTokens += r.total_tokens || 0;
        totalCost += r.custo_reais || 0;
      });

      const daily: TokenUsageDaily[] = Object.entries(map)
        .map(([date, v]) => ({ date, tokens: v.tokens, cost: v.cost }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { daily, totalTokens, totalCost };
    },
    enabled: !!profile?.id_organizacao,
    staleTime: 60000,
  });
}
